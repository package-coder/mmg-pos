import { server } from 'api';

export const SALES_DEPOSITS_ENDPOINTS = '/sales-deposits';

async function CreateSalesDeposit(model) {
    const {
        data: { data }
    } = await server.post(SALES_DEPOSITS_ENDPOINTS + '/create', model);
    return data;
}

async function GetAllSalesDeposit(model) {
    const {
        data: { data }
    } = await server.get(SALES_DEPOSITS_ENDPOINTS, {
        params: model
    });
    return data;
}

async function UpdateSalesDeposit(model) {
    const {
        data: { data }
    } = await server.post(SALES_DEPOSITS_ENDPOINTS + '/edit', model);

    return data;
}

export default {
    GetAllSalesDeposit,
    UpdateSalesDeposit,
    CreateSalesDeposit
};
