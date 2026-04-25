import { server } from 'api';

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
        params: model
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
