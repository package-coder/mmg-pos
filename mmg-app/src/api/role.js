import { server } from 'api';

export const ROLE_ENDPOINTS = '';

async function GetAllRoles() {
    const {
        data: { data }
    } = await server.get(ROLE_ENDPOINTS + '/roles');
    return data;
}

async function CreateRole(model) {
    const {
        data: { data }
    } = await server.post('/role/create', model);
    return data;
}

async function UpdateRole(model) {
    const {
        data: { data }
    } = await server.post('/role/edit', model);

    return data;
}

export default {
    GetAllRoles,
    CreateRole,
    UpdateRole
};
