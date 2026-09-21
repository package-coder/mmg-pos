import { server } from 'api';

const PAYMENT_METHOD_ENDPOINT = '/v2/payment-methods';

// Shown while the list loads, and used if it can't be fetched, so checkout keeps working offline.
// Mirrors the built-in methods in pos-api app/features/payment_method/models.py.
export const DEFAULT_PAYMENT_METHODS = [
    { code: 'cash', name: 'Cash', kind: 'cash', system: true, active: true },
    { code: 'on-account', name: 'On Account', kind: 'on-account', system: true, active: true }
];

// Active methods only (what Checkout offers).
async function GetPaymentMethods() {
    const {
        data: { data }
    } = await server.get(PAYMENT_METHOD_ENDPOINT);
    return data;
}

// Every method including switched-off ones (what the admin settings page manages).
async function GetAllPaymentMethods() {
    const {
        data: { data }
    } = await server.get(PAYMENT_METHOD_ENDPOINT, { params: { includeInactive: true } });
    return data;
}

async function CreatePaymentMethod(model) {
    const {
        data: { data }
    } = await server.post(PAYMENT_METHOD_ENDPOINT, model);
    return data;
}

async function UpdatePaymentMethod({ code, ...model }) {
    const {
        data: { data }
    } = await server.post(`${PAYMENT_METHOD_ENDPOINT}/${code}`, model);
    return data;
}

export default { GetPaymentMethods, GetAllPaymentMethods, CreatePaymentMethod, UpdatePaymentMethod };
