import { server } from 'api';

export const BOOKINGS_ENDPOINTS = '';

async function GetAllBookings() {
    const {
        data: { data }
    } = await server.get(`${BOOKINGS_ENDPOINTS}/bookings`);
    return data;
}

export default {
    GetAllBookings
};
