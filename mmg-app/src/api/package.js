import { server } from 'api';

export const PACKAGE_ENDPOINTS = '';

async function CreatePackage(packageData) {
    const {
        data: { data }
    } = await server.post('/package/create', packageData);
    return data;
}

async function EditPackage(packageData) {
    const {
        data: { data }
    } = await server.post('/package/edit', packageData);
    return data;
}

async function GetAllPackages() {
    const {
        data: { data }
    } = await server.get(`${PACKAGE_ENDPOINTS}/packages`);
    return data;
}

export default {
    CreatePackage,
    EditPackage,
    GetAllPackages
};
