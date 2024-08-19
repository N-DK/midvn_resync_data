import DatabaseModel from './database.model';
import { PoolConnection } from 'mysql2';
import { syncBatch } from '../utils/syncBatch';
import { getData } from '../utils/getData';

class ResyncModel extends DatabaseModel {
    constructor() {
        super();
    }

    async resyncData(con: PoolConnection, imei: string) {
        try {
            const { data, device } = await getData(con, imei, this);

            const interval = setInterval(async () => {
                console.time('Time resync data');
                const batch = data.splice(0, 200);
                if (batch.length === 0) {
                    clearInterval(interval);
                    return;
                }
                await syncBatch(con, batch, device, this);
                console.timeEnd('Time resync data');
            }, 1200);
        } catch (error: any) {
            console.error('Error resync data: ', error.message);
        }
    }
}

export default new ResyncModel();
