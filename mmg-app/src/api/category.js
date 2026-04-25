import { server } from 'api';

export const CATEGORY_ENDPOINTS = '';

async function CreateCategory(categoryData) {
    const {
        data: { data }
    } = await server.post('/product/category/create', categoryData);
    return data;
}

async function EditCategory(categoryData) {
    const {
        data: { data }
    } = await server.post('/product/category/edit', categoryData);
    return data;
}

async function GetAllCategories() {
    const {
        data: { data }
    } = await server.get(`${CATEGORY_ENDPOINTS}/product/categories`);
    return data;
}

async function GetAllCategoryReports(params) {
    const {
        data: { data }
    } = await server.get(`${CATEGORY_ENDPOINTS}/v2/categories/reports`, {
        params
    });
    return data;
}

export default {
    CreateCategory,
    EditCategory,
    GetAllCategories,
    GetAllCategoryReports
};
