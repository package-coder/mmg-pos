import { server } from 'api';

export const DOCTOR_ENDPOINTS = '';

async function CreateDoctor(model) {
    const {
        data: { data }
    } = await server.post('/doctor/create', model);
    return data;
}

async function GetAllDoctor() {
    const {
        data: { data }
    } = await server.get(DOCTOR_ENDPOINTS + '/doctors');
    return data;
}

async function UpdateDoctor(model) {
    const {
        data: { data }
    } = await server.post('/doctor/edit', model);

    return data;
}

export default {
    GetAllDoctor,
    UpdateDoctor,
    CreateDoctor
};
