import { server } from 'api';

export const BRANCH_ENDPOINTS = '';

async function CreateCorporate(model) {
    const {
        data: { data }
    } = await server.post('/corporate/create', model);
    return data;
}

async function GetAllCorporate() {
    const {
        data: { data }
    } = await server.get(BRANCH_ENDPOINTS + '/corporates');
    return data;
}

async function UpdateCorporate(model) {
    const {
        data: { data }
    } = await server.post('/corporate/edit', model);

    return data;
}

export default {
    GetAllCorporate,
    UpdateCorporate,
    CreateCorporate
};
