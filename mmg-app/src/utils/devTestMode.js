import { useEffect, useState } from 'react';
import { APP_ROLE } from 'api';

// The admin/UAT instance (VITE_ROLE=admin) is a centralized, read-mostly reporting deployment:
// no real printer/VFD/helper-app hardware attached, no per-terminal PTU accreditation. POS
// routes are hidden there and print actions are disabled by default for real data-integrity
// reasons (invoice numbering, sync assumptions) — see PosRoutes.jsx and PrinterProvider.jsx.
//
// Dev Test Mode is a single runtime toggle (persisted per-browser in localStorage, NOT an env/
// build flag — it replaced the old build-time VITE_ALLOW_POS_ON_ADMIN escape hatch) that
// re-opens both of those on this instance, for this browser only, so a tester can exercise POS
// flows without redeploying. It has no effect at all on a branch deployment, where POS and
// printing are already fully available.
const STORAGE_KEY = 'devTestMode';
const CHANGE_EVENT = 'devtestmode-change';

export function isDevTestModeEnabled() {
    if (APP_ROLE !== 'admin') return false;
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
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
