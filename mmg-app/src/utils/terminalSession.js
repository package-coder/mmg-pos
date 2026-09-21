import SessionStorage from 'utils/SessionStorage';

// The accredited terminal (MIN/SN/PTU) this cashier logged in on, read from the helper app's
// config.json at login and removed at logout. Kept outside React so api/* modules can scope
// requests (X-report, transaction list, time-in) to the current terminal's PTU.
const storage = new SessionStorage('terminal');

// Same placeholders the helper treats as "not configured" (helper/config.py).
const PLACEHOLDERS = ['', '---', '000-000000-0', 'S/N0000000000', 'PTU-000000000000'];
const isConfigured = (v) => !!v && !PLACEHOLDERS.includes(String(v).trim());

export const missingTerminalFields = (info) =>
    [['MIN', 'MIN'], ['SN', 'SN'], ['PTU_NO', 'PTU No']].filter(([k]) => !isConfigured(info?.[k])).map(([, label]) => label);

export const saveTerminal = (info) => storage.save({ MIN: info.MIN, SN: info.SN, PTU_NO: info.PTU_NO });
export const clearTerminal = () => storage.reset();
export const getTerminal = () => {
    try {
        return storage.get();
    } catch {
        return null;
    }
};
export const getPtuNumber = () => getTerminal()?.PTU_NO || undefined;

// Dev Test Mode: no helper/config.json, so each browser gets one generated terminal, created on
// first use and kept in localStorage. Treated as a single machine — every user logging in from
// this browser shares it. The DEV-PTU- prefix is what the backend uses to tag sales as dev-test.
const DEV_KEY = 'devTerminal';
export const DEV_PTU_PREFIX = 'DEV-PTU-';

export function getDevTerminal() {
    try {
        const saved = JSON.parse(localStorage.getItem(DEV_KEY));
        if (saved?.MIN && saved?.SN && saved?.PTU_NO?.startsWith(DEV_PTU_PREFIX)) return saved;
    } catch {
        // fall through and generate
    }
    const id = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    const terminal = { MIN: `DEV-MIN-${id}`, SN: `DEV-SN-${id}`, PTU_NO: `${DEV_PTU_PREFIX}${id}` };
    try {
        localStorage.setItem(DEV_KEY, JSON.stringify(terminal));
    } catch {
        // storage blocked: still usable for this page load
    }
    return terminal;
}
