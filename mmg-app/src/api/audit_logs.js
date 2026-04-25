import { server } from 'api';

export const AUDIT_LOGS_ENDPOINTS = '/v2/audit-logs';


async function GetAllLogs(params) {
    const { data: { data } } = await server.get(AUDIT_LOGS_ENDPOINTS, {
        params
    })
    return data;
}

export default {
    GetAllLogs,
};
