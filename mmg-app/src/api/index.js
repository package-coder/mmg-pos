import axios from 'axios';
import TokenStorage from 'utils/TokenStorage';

let baseURL = ''
export const APP_ENV = import.meta.env.VITE_APP_ENV
export const SERVER_URL = import.meta.env.VITE_APP_SERVER_URL
export const SERVER_PORT = import.meta.env.VITE_APP_SERVER_PORT

if(APP_ENV == 'production') {
    baseURL = SERVER_URL
} else {
    const url = new URL(document.location.origin)
    baseURL = `${url.protocol}//${url.hostname}:${SERVER_PORT}`
}

console.warn('BASE URL', baseURL)

const key = 'authorization'
const tokenStorage = new TokenStorage(key)

if(!baseURL) {
    throw "Configuration: Server URL or PORT is undefined."
}

export const server = axios.create({
    baseURL: baseURL,
});

server.interceptors.request.use((config) => {
    const token = tokenStorage.get();
    if (!token) return config;

    config.headers.Authorization = `Bearer ${token}`;
    return config;
});
