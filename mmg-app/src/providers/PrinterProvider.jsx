import { createContext, useContext, useEffect, useRef, useState } from "react";
import { canPrint, isDevTestModeEnabled } from 'utils/devTestMode'
import { useAuth } from 'providers/AuthProvider'

export const PrinterContext = createContext()

const statuses = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']
const HELPER_URL = 'ws://localhost:9999'
const CONNECT_TIMEOUT_MS = 5000
// The helper retries the printer connection (~5 s) before it prints, so leave generous room.
const REPLY_TIMEOUT_MS = 30000

// The PTU must be unique per branch+user in this browser, not a single shared constant.
// Invoice numbers are counted per ptuNumber alone (BIR rule — a real PTU belongs to one
// physical terminal, so this is exactly right for real terminals). But one browser testing
// several branches/users in Dev Test Mode would otherwise have them all mint invoice numbers
// off the same fake PTU's sequence, mixing series that a real deployment would never mix — so
// each (branchId, userId) combination this browser has logged in as gets its own persisted PTU.
function devPtuNo(branchId, userId) {
    const key = `devPtuNo:${branchId || 'no-branch'}:${userId || 'no-user'}`
    const fresh = () => `DEV-PTU-${Math.random().toString(16).slice(2, 10).toUpperCase()}`
    try {
        let id = localStorage.getItem(key)
        if (!id) {
            id = fresh()
            localStorage.setItem(key, id)
        }
        return id
    } catch {
        return fresh()
    }
}
function devMockTerminalInfo(branchId, userId) {
    return { MIN: 'DEV-MIN', SN: 'DEV-SN', PTU_NO: devPtuNo(branchId, userId) }
}

const PrinterProvider = ({ children }) => {
    const { branch, user } = useAuth()
    const [socket, setSocket] = useState(null);
    const [printing, setPrinting] = useState(false)
    const [status, setStatus] = useState(statuses[3])

    const socketRef = useRef(null)
    const connectingRef = useRef(null)   // in-flight connection, shared by concurrent print() calls
    const pendingRef = useRef(new Map()) // request_id -> { resolve, timer, blocking }
    const nextIdRef = useRef(1)

    useEffect(() => {
        getSocket().catch(() => { })

        return () => {
            const ws = socketRef.current
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [])

    // Resolve one pending request (or all of them, when the connection drops).
    function settle(id, response) {
        const entry = pendingRef.current.get(id)
        if (!entry) return
        clearTimeout(entry.timer)
        pendingRef.current.delete(id)
        entry.resolve(response)
        setPrinting([...pendingRef.current.values()].some(p => p.blocking))
    }

    function settleAll(response) {
        [...pendingRef.current.keys()].forEach(id => settle(id, response))
    }

    function handleMessage(event) {
        let response
        try {
            response = JSON.parse(event.data)
        } catch {
            return
        }
        // The helper echoes request_id. An older helper does not: replies arrive in order, so
        // the oldest pending request is the one being answered.
        const id = response.request_id ?? pendingRef.current.keys().next().value
        settle(id, response)
    }

    function getSocket() {
        const current = socketRef.current
        if (current && current.readyState === WebSocket.OPEN) return Promise.resolve(current)
        if (connectingRef.current) return connectingRef.current

        setStatus(statuses[0])
        connectingRef.current = new Promise((resolve, reject) => {
            const ws = new WebSocket(HELPER_URL)
            const timer = setTimeout(() => {
                reject(new Error('The printer helper did not answer. Is it running?'))
                ws.close()
            }, CONNECT_TIMEOUT_MS)

            ws.onopen = () => {
                clearTimeout(timer)
                socketRef.current = ws
                setSocket(ws)
                setStatus(statuses[ws.readyState])
                resolve(ws)
            }
            ws.onerror = () => {
                clearTimeout(timer)
                reject(new Error('Cannot reach the printer helper. Is it running?'))
            }
            ws.onclose = () => {
                clearTimeout(timer)
                if (socketRef.current === ws) socketRef.current = null
                setSocket(null)
                setStatus(statuses[3])
                settleAll({ error: 'Lost connection to the printer helper' })
            }
            ws.onmessage = handleMessage
        }).finally(() => {
            connectingRef.current = null
        })
        return connectingRef.current
    }

    // Sends a request and resolves with the helper's reply. It never rejects: failures come back
    // as { error }, so `await print(...)` really waits for the job and callers can inspect it.
    //
    // Printer jobs are blocking: while one is in flight, further printer jobs are refused
    // ({ busy: true }) so a cashier clicking repeatedly cannot print the same receipt many times.
    async function print(device, type, data) {
        // Real printing (ESC/POS receipts/reports/ejournal) is disabled on the admin/cloud
        // instance unless Dev Test Mode is on — no real printer is ever attached there, and
        // anything printed from it would not be a real BIR-journaled transaction.
        if (device === 'printer' && !canPrint()) {
            return { error: 'Printing is disabled on this admin/cloud instance. Turn on Dev Test Mode in Settings to enable it.' }
        }

        const blocking = device === 'printer'
        if (blocking && [...pendingRef.current.values()].some(p => p.blocking)) {
            console.warn('Print ignored: another print is still in progress')
            return { busy: true, error: 'A print is already in progress' }
        }

        const id = nextIdRef.current++
        const reply = new Promise((resolve) => {
            const timer = setTimeout(
                () => settle(id, { error: 'The printer helper did not respond' }),
                REPLY_TIMEOUT_MS
            )
            pendingRef.current.set(id, { resolve, timer, blocking })
        })
        // Registered before the (async) connect, so the block applies from the very first click.
        if (blocking) setPrinting(true)

        try {
            const ws = await getSocket()
            ws.send(JSON.stringify({ device, device_type: type, request_id: id, ...data }))
        } catch (e) {
            settle(id, { error: e.message })
        }
        return reply
    }

    function display(type, data) {
        return print("display", type, data)
    }

    // Resolves with { MIN, SN, PTU_NO } read from this workstation's terminal.json via the
    // helper app, or { error } if the helper app can't be reached. Used at checkout time to
    // scope invoice numbers per accredited terminal (BIR compliance) — see Checkout.jsx.
    function getTerminalInfo() {
        if (isDevTestModeEnabled()) {
            console.warn('[DEV TEST MODE] Using mock terminal info instead of querying the helper app.')
            return Promise.resolve(devMockTerminalInfo(branch?.id, user?._id))
        }
        return print("terminal", "info", {})
    }

    return (
        <PrinterContext.Provider value={{ socket, printing, print, status, display, getTerminalInfo }}>
            {children}
        </PrinterContext.Provider>
    )
}

export default PrinterProvider

export const usePrinter = () => {
    return useContext(PrinterContext)
}

export const PrinterWrapper = (Element, props) => () =>
    <PrinterProvider value={props}>
        <Element />
    </PrinterProvider>
