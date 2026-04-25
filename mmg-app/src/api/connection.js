import { server } from 'api';

export const CONNECTION_ENDPOINTS = '/check-connection';


async function CheckConnection() {
    const { data } = await server.get(CONNECTION_ENDPOINTS)
    return data;
}

export default {
    CheckConnection,
};
