import { useEffect, useState } from 'react';
import { APP_ROLE } from 'api';
import appSettings from 'api/app_settings';

// A single runtime toggle, persisted in the database (GET/POST /v2/app-settings/dev-test-mode)
// rather than per-browser localStorage — one flag for this whole deployment (this branch's own
// server, or the admin/cloud portal), shared by everyone who opens it, not just the browser
// that flipped it. Used on both deployment roles for different things:
//
// - Admin/cloud instance (VITE_ROLE=admin): a centralized, read-mostly reporting deployment
//   with no real printer/VFD/helper-app hardware attached and no per-terminal PTU accreditation.
//   POS routes are hidden and print actions are disabled by default there for real
//   data-integrity reasons (invoice numbering, sync assumptions) — this toggle re-opens both.
//   See PosRoutes.jsx and PrinterProvider.jsx.
// - Branch deployment: mocks terminal info (MIN/SN/PTU_NO) instead of querying the real helper
//   app, so checkout works without hardware attached. See getTerminalInfo() in
//   PrinterProvider.jsx.
//
// Deliberately NOT restricted by APP_ENV — it works the same on a live branch/production
// server as it does locally. Turning it on there means completed sales use a mocked PTU
// instead of a real accredited terminal's, so treat it as a real, consequential switch, not
// just a local dev convenience.
const CHANGE_EVENT = 'devtestmode-change';

let cachedEnabled = false;
let loaded = false;   // a successful fetch has populated cachedEnabled at least once
let inFlight = null;  // the in-progress GET, shared by concurrent callers

// Fetches the current value from the server once, then keeps `cachedEnabled` as the answer for
// every synchronous read (isDevTestModeEnabled/canPrint) until the next successful fetch. Not
// marking `loaded` on failure (e.g. a 401 before login) means the next caller retries instead
// of getting stuck on a stale/default value forever.
function ensureLoaded() {
    if (loaded) return Promise.resolve(cachedEnabled);
    if (!inFlight) {
        inFlight = appSettings
            .GetDevTestMode()
            .then((data) => {
                cachedEnabled = !!data?.enabled;
                loaded = true;
                window.dispatchEvent(new Event(CHANGE_EVENT));
                return cachedEnabled;
            })
            .catch(() => cachedEnabled)
            .finally(() => {
                inFlight = null;
            });
    }
    return inFlight;
}

// Forces a fresh read of the server value and waits for it. Needed at login: the read at app
// start is unauthenticated (401), so the cached default (false) would otherwise be used.
export function refreshDevTestMode() {
    loaded = false;
    return ensureLoaded();
}

export function isDevTestModeEnabled() {
    ensureLoaded(); // fire-and-forget refresh if this browser hasn't loaded the real value yet
    return cachedEnabled;
}

export async function setDevTestMode(enabled) {
    // Optimistic: the UI (banner, gated routes, print buttons) reacts immediately, the network
    // round-trip happens after. A failure leaves the toggle showing the attempted value until
    // the next fetch corrects it — acceptable for a manual settings toggle, not worth a revert
    // dance for.
    cachedEnabled = enabled;
    loaded = true;
    window.dispatchEvent(new Event(CHANGE_EVENT));
    await appSettings.SetDevTestMode(enabled);
}

// Reactive read for components: re-renders when the toggle changes, either from this tab
// (CHANGE_EVENT) or from the initial server fetch resolving after mount.
export function useDevTestMode() {
    const [enabled, setEnabled] = useState(cachedEnabled);

    useEffect(() => {
        ensureLoaded().then(setEnabled);
        const handler = () => setEnabled(cachedEnabled);
        window.addEventListener(CHANGE_EVENT, handler);
        return () => window.removeEventListener(CHANGE_EVENT, handler);
    }, []);

    return enabled;
}

// Like useDevTestMode, but also reports whether the server value has been fetched yet, so a
// route guard can wait instead of acting on the not-yet-loaded default (false).
export function useDevTestModeState() {
    const [state, setState] = useState({ enabled: cachedEnabled, loaded });

    useEffect(() => {
        ensureLoaded().then(() => setState({ enabled: cachedEnabled, loaded: true }));
        const handler = () => setState({ enabled: cachedEnabled, loaded });
        window.addEventListener(CHANGE_EVENT, handler);
        return () => window.removeEventListener(CHANGE_EVENT, handler);
    }, []);

    return state;
}

// Printing is real hardware/BIR-journaled activity — allowed on a branch deployment always,
// and on the admin instance only while Dev Test Mode is on.
export function canPrint() {
    return APP_ROLE !== 'admin' || isDevTestModeEnabled();
}
