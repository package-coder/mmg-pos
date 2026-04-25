import { server } from 'api';

export const USER_ENDPOINTS = '/users';

async function CreateUser(model) {
    const {
        data: { data }
    } = await server.post('/user/register', model);
    return data;
}

async function GetAllUser() {
    const {
        data: { data }
    } = await server.get(USER_ENDPOINTS);
    return data;
}

async function UpdateUser(model) {
    const {
        data: { data }
    } = await server.post('/user/edit', model);

    return data;
}

export default {
    GetAllUser,
    CreateUser,
    UpdateUser
};
