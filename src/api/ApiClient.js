import httpClient from './httpClient'

export default class ApiClient {
    constructor(client = httpClient) {
        this.client = client
    }

    async request(method, url, data = undefined, config = {}) {
        const response = await this.client.request({
            method,
            url,
            data,
            ...config,
        })
        return response.data
    }

    get(url, config = {}) {
        return this.request('get', url, undefined, config)
    }

    post(url, data, config = {}) {
        return this.request('post', url, data, config)
    }

    put(url, data, config = {}) {
        return this.request('put', url, data, config)
    }

    delete(url, config = {}) {
        return this.request('delete', url, undefined, config)
    }
}
