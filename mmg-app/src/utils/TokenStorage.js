export default class TokenStorage {
    constructor(key) {
        this.key = key;
    }

    save(token) {
        localStorage.setItem(this.key, token);
    }

    get() {
        return localStorage.getItem(this.key);
    }

    reset() {
        localStorage.removeItem(this.key);
    }
}
