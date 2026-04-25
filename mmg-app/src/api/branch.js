import { server } from 'api';

export const BRANCH_ENDPOINTS = '';

async function CreateBranch(model) {
    const {
        data: { data }
    } = await server.post('/branch/create', model);
    return data;
}

async function GetAllBranch() {
    const {
        data: { data }
    } = await server.get(BRANCH_ENDPOINTS + '/branches');
    return data;
}

async function GetAllBranchReports(params) {
    const {
        data: { data }
    } = await server.get(BRANCH_ENDPOINTS + '/v2/branches/reports', {
        params
    });
    return data;
}

async function UpdateBranch(model) {
    const {
        data: { data }
    } = await server.post('/branch/edit', model);

    return data;
}

export default {
    GetAllBranch,
    UpdateBranch,
    GetAllBranchReports,
    CreateBranch
};
