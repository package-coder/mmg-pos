import { server } from 'api';
import TokenStorage from 'utils/TokenStorage';

export const SERVICE_ENDPOINTS = '';

async function CreateService(serviceData) {
    const {
        data: { data }
    } = await server.post('/product/create', serviceData);
    return data;
}

async function EditService(serviceData) {
    const {
        data: { data }
    } = await server.post('/product/edit', serviceData);
    return data;
}

async function GetAllServices() {
    const {
        data: { data }
    } = await server.get(`${SERVICE_ENDPOINTS}/products`);
    return data;
}

export default {
    CreateService,
    EditService,
    GetAllServices
};
