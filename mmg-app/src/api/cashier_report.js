import { server } from 'api';
import { isDevTestModeEnabled } from 'utils/devTestMode';

export const BRANCH_ENDPOINTS = '/v2/cashier-reports';

async function TimeInCashierReport(model) {
    const {
        data: { data }
    } = await server.post(BRANCH_ENDPOINTS + '/time-in', model);
    return data;
}

async function GetCashierReportLatest() {
    const { data } = await server.get(BRANCH_ENDPOINTS + '/today');
    return data;
}

async function GetAllCashierReport(model) {
    const {
        data: { data }
    } = await server.get(BRANCH_ENDPOINTS, {
        // Dev Test Mode on for this browser -> a tester's own dev-test sales count toward
        // their drawer balance/X-report for this shift, instead of being invisibly excluded
        // like on every other report (see app/blueprints/cashier_report.py).
        params: { ...model, includeDevTest: isDevTestModeEnabled() }
    });
    return data;
}

async function TimeOutCashierReport(model) {
    const {
        data: { data }
    } = await server.post(BRANCH_ENDPOINTS + '/time-out', model);
    return data;
}

export default {
    GetAllCashierReport,
    GetCashierReportLatest,
    TimeInCashierReport,
    TimeOutCashierReport
};
