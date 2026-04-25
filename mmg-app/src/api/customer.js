import { server } from 'api';

export const CUSTOMER_ENDPOINTS = '';

async function CreateCustomer(customerData) {
    const {
        data: { data }
    } = await server.post('/customer/create', customerData);
    return data;
}

async function EditCustomer(customerData) {
    const {
        data: { data }
    } = await server.post('/customer/edit', customerData);
    return data;
}

async function GetAllCustomers() {
    const {
        data: { data }
    } = await server.get(`${CUSTOMER_ENDPOINTS}/customers`);
    return data;
}

export default {
    CreateCustomer,
    EditCustomer,
    GetAllCustomers
};
