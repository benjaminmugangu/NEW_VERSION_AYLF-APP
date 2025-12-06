import Dexie, { Table } from 'dexie'

export interface SyncOperation {
    id?: number
    operation: string
    endpoint: string
    method: string
    data: any
    timestamp: Date
    synced: number
}

export class OfflineDatabase extends Dexie {
    syncQueue!: Table<SyncOperation>

    constructor() {
        super('AYLF_Offline')

        this.version(1).stores({
            syncQueue: '++id, synced, timestamp'
        })
    }
}

export const db = new OfflineDatabase()
