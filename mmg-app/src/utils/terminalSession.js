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
