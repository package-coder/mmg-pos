import { server } from 'api';

export const DISCOUNT_ENDPOINTS = '/v2/reports';

async function GetAllDiscountReport(model) {
    const {
        data: { data }
    } = await server.get(DISCOUNT_ENDPOINTS + '/discounts', {
        params: model
    });
    return data;
}

async function GetAllSalesReport(model) {
    const {
        data: { data }
    } = await server.get(DISCOUNT_ENDPOINTS + '/sales', {
        params: model
    });
    return data;
}

async function DownloadReport(model) {
    const { data } = await server.get(DISCOUNT_ENDPOINTS + `/${model.type}/download`, {
        params: model,
        responseType: 'blob'
    });
    return data;
}


export default {
    GetAllDiscountReport,
    DownloadReport,
    GetAllSalesReport
};
