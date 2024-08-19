import DatabaseModel from './database.model';
import { PoolConnection } from 'mysql2';
import { syncBatch } from '../utils/syncBatch';
import { getData } from '../utils/getData';
import getTableName from '../utils/table/getTableName';
import { setting } from '../constants/setting.constant';

class ResyncModel extends DatabaseModel {
    constructor() {
        super();
    }

    async resyncData(con: PoolConnection, imei: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                const { data, device } = await getData(con, imei, this);

                const interval = setInterval(async () => {
                    console.time(`Time resync data ${imei}`);
                    const batch = data.splice(0, 200);
                    if (batch.length === 0) {
                        clearInterval(interval);
                        console.timeEnd(`Time resync data ${imei}`);
                        resolve(true); // Đánh dấu hoàn thành quá trình resync
                        return;
                    }
                    await syncBatch(con, batch, device, this);
                    console.timeEnd(`Time resync data ${imei}`);
                }, 1200);
            } catch (error: any) {
                console.error('Error resync data: ', error.message);
                reject(error); // Bắt lỗi và từ chối Promise
            }
        });
    }

    async getData(con: PoolConnection, params: any, query: any) {
        try {
            const { imei } = params;
            const { start_date, end_date } = query;

            const { device } = await getData(con, imei, this);

            const tableName = getTableName(
                setting.initialNameOfTableGPS,
                device[0].id,
                start_date * 1000,
            );

            const data = await this.select(
                con,
                tableName,
                '*',
                'latitude IS NOT NULL AND longitude IS NOT NULL AND time >= ? AND time <= ?',
                [start_date, end_date],
                'id',
                'DESC',
                0,
                9999999,
            );

            return data;
        } catch (error: any) {
            console.error('Error get data: ', error.message);
        }
    }
}

export default new ResyncModel();
