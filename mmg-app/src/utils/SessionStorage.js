export default class SessionStorage {
    constructor(key) {
        this.key = key;
    }

    save(value) {
        value = JSON.stringify(value);
        localStorage.setItem(this.key, value);
    }

    get() {
        value = localStorage.getItem(this.key);
        return JSON.parse(value);
    }

    reset() {
        localStorage.removeItem(this.key);
    }
}
