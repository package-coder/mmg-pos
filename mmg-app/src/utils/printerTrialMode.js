import { useEffect, useState } from 'react';

// "Paper Saver Mode" in Settings > Printer Settings. Independent of Dev Test Mode (a real
// branch cashier can want this on every day to save paper) but has the same practical effect on
// print count — ReceiptModal.jsx checks both this and Dev Test Mode before printing a second
// (company's) copy.
const STORAGE_KEY = 'printerTrialMode';
const CHANGE_EVENT = 'printertrialmode-change';

export function isPrinterTrialModeEnabled() {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function setPrinterTrialMode(enabled) {
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        // localStorage unavailable (private browsing, etc.) — nothing to persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function usePrinterTrialMode() {
    const [enabled, setEnabled] = useState(isPrinterTrialModeEnabled());

    useEffect(() => {
        const handler = () => setEnabled(isPrinterTrialModeEnabled());
        window.addEventListener(CHANGE_EVENT, handler);
        window.addEventListener('storage', handler);
        return () => {
            window.removeEventListener(CHANGE_EVENT, handler);
            window.removeEventListener('storage', handler);
        };
    }, []);

    return enabled;
}
