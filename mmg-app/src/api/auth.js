import { server } from 'api';
import SessionStorage from 'utils/SessionStorage';
import TokenStorage from 'utils/TokenStorage';

export const AUTH_ENDPOINTS = '';

const key = 'authorization';
const tokenStorage = new TokenStorage(key);
const sessionStorage = new SessionStorage('session');

async function LoginUser({ username, password }) {
    const { data } = await server.postForm(`${AUTH_ENDPOINTS}/login`, {
        username,
        password
    });

    const token = data?.token;
    tokenStorage.save(token);
    return data;
}

async function LogoutUser() {
    tokenStorage.reset();
    sessionStorage.reset();
}

async function GetAuthUser() {
    const {
        data: { data }
    } = await server.get('/user');
    if (data?.code == 9) return null;

    sessionStorage.save(data);
    return data;
}

export default {
    LoginUser,
    LogoutUser,
    GetAuthUser
};
