import { server } from 'api';

export const APP_SETTINGS_ENDPOINTS = '/v2/app-settings';

async function GetDevTestMode() {
    const {
        data: { data }
    } = await server.get(APP_SETTINGS_ENDPOINTS + '/dev-test-mode');
    return data;
}

async function SetDevTestMode(enabled) {
    const {
        data: { data }
    } = await server.post(APP_SETTINGS_ENDPOINTS + '/dev-test-mode', { enabled });
    return data;
}

export default {
    GetDevTestMode,
    SetDevTestMode
};
