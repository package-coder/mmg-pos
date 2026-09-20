import { server } from 'api';
import { isDevTestModeEnabled } from 'utils/devTestMode';

export const BRANCH_REPORTS_ENDPOINTS = '/v2/branch-reports';

async function CreateBranchReport(model) {
    const {
        data: { data }
    } = await server.post(BRANCH_REPORTS_ENDPOINTS + '/create', model);
    return data;
}

async function GenerateBranchReport(model) {
    const {
        data: { data }
    } = await server.post(BRANCH_REPORTS_ENDPOINTS + '/generate', model);
    return data;
}

async function GetAllBranchReport(model) {
    const {
        data: { data }
    } = await server.get(BRANCH_REPORTS_ENDPOINTS, {
        // Dev Test Mode on for this browser -> dev-test sales count toward this Z-report too
        // (see app/blueprints/branch_report.py).
        params: { ...model, includeDevTest: isDevTestModeEnabled() }
    });
    return data;
}

async function GetBranchSales(model) {
    const {
        data: { data }
    } = await server.get('/v2/sales', {
        params: model
    });
    return data;
}

async function GetGeneratedBranchReport(model) {
    const {
        data: { data }
    } = await server.get(BRANCH_REPORTS_ENDPOINTS + '/generated', model);
    return data;
}

export default {
    GetAllBranchReport,
    GetBranchSales,
    CreateBranchReport,
    GenerateBranchReport,
    GetGeneratedBranchReport
};
