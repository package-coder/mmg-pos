import { server } from 'api';

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
        params: model
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
