import { useEffect, useState } from 'react';
import { APP_ROLE } from 'api';

// A single runtime toggle (persisted per-browser in localStorage, NOT an env/build flag), used
// on both deployment roles for different things:
//
// - Admin/cloud instance (VITE_ROLE=admin): a centralized, read-mostly reporting deployment
//   with no real printer/VFD/helper-app hardware attached and no per-terminal PTU accreditation.
//   POS routes are hidden and print actions are disabled by default there for real
//   data-integrity reasons (invoice numbering, sync assumptions) — this toggle re-opens both,
//   for this browser only, replacing the old build-time VITE_ALLOW_POS_ON_ADMIN escape hatch.
//   See PosRoutes.jsx and PrinterProvider.jsx.
// - Branch deployment: replaces the old build-time VITE_APP_SKIP_TERMINAL_CHECK env flag for
//   mocking terminal info (MIN/SN/PTU_NO) instead of querying the real helper app over
//   WebSocket, so checkout works without hardware attached. See getTerminalInfo() in
//   PrinterProvider.jsx.
//
// Deliberately NOT restricted by APP_ENV — it works the same on a live branch/production
// server as it does locally. Turning it on there means completed sales use a mocked PTU
// instead of a real accredited terminal's, so treat it as a real, consequential switch, not
// just a local dev convenience.
const STORAGE_KEY = 'devTestMode';
const CHANGE_EVENT = 'devtestmode-change';

export function isDevTestModeEnabled() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) return stored === 'true';
    } catch {
        return false;
    }
    // No explicit choice made yet in this browser — fall back to the build-time default, so
    // the branch/LAN dev compose stack (which sets VITE_APP_SKIP_TERMINAL_CHECK=true) keeps
    // working out of the box until someone opens Settings and picks explicitly.
    return import.meta.env.VITE_APP_SKIP_TERMINAL_CHECK === 'true';
}

export function setDevTestMode(enabled) {
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        // localStorage unavailable (private browsing, etc.) — nothing to persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Reactive read for components: re-renders when the toggle changes, either from this tab
// (CHANGE_EVENT, since the native `storage` event never fires in the tab that made the write)
// or from another tab/window on the same browser (`storage`).
export function useDevTestMode() {
    const [enabled, setEnabled] = useState(isDevTestModeEnabled());

    useEffect(() => {
        const handler = () => setEnabled(isDevTestModeEnabled());
        window.addEventListener(CHANGE_EVENT, handler);
        window.addEventListener('storage', handler);
        return () => {
            window.removeEventListener(CHANGE_EVENT, handler);
            window.removeEventListener('storage', handler);
        };
    }, []);

    return enabled;
}

// Printing is real hardware/BIR-journaled activity — allowed on a branch deployment always,
// and on the admin instance only while Dev Test Mode is on.
export function canPrint() {
    return APP_ROLE !== 'admin' || isDevTestModeEnabled();
}
