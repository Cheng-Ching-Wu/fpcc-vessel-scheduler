import ApiClient from './ApiClient'

class BerthApiService extends ApiClient {
    getBerthActivities() {
        return this.get('/berth-activities')
    }

    getBlockedRanges() {
        return this.get('/blocked-ranges')
    }
}

export const berthApiService = new BerthApiService()
export default BerthApiService
