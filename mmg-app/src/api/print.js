import { server } from 'api';
import axios from 'axios';
import { canPrint } from 'utils/devTestMode';

// Legacy HTTP print path (see CLAUDE.md — kept for compatibility alongside usePrinter()).
// Same admin/cloud restriction as the WebSocket path in PrinterProvider.jsx: no real printer
// is ever attached to that instance, so this must never fire from it unless Dev Test Mode is on.
function blockedPrint() {
    return Promise.reject(new Error('Printing is disabled on this admin/cloud instance. Turn on Dev Test Mode in Settings to enable it.'));
}

async function Print(model) {
    if (!canPrint()) return blockedPrint();
    const result = await server.post('/print', model);
    return result.data.data;
}

async function PrintReport(model) {
    if (!canPrint()) return blockedPrint();
    const result = await server.post('/print-report', model);
    return result.data.data;
}

async function Display(params) {
    const type = !params.type ? '' : `/${params.type}`
    await server.post('/display' + type, params);
}

export default {
    Print,
    PrintReport,
    Display
};
