import { server } from 'api';

export const DISCOUNT_ENDPOINTS = '';

async function CreateDiscount(discountData) {
    const {
        data: { data }
    } = await server.post('/discount/create', discountData);
    return data;
}

async function EditDiscount(discountData) {
    const {
        data: { data }
    } = await server.post('/discount/edit', discountData);
    return data;
}

async function GetAllDiscounts() {
    const {
        data: { data }
    } = await server.get(`${DISCOUNT_ENDPOINTS}/discounts`);
    return data;
}

export default {
    CreateDiscount,
    EditDiscount,
    GetAllDiscounts
};
