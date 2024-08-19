import { getConnection } from '../dbs/init.mysql';
import resyncModel from '../models/resync.model';

class ResyncService {
    async resyncData(imei: string) {
        const { conn: con } = await getConnection();
        return resyncModel.resyncData(con, imei);
    }

    async getData(params: any, query: any) {
        const { conn: con } = await getConnection();
        return await resyncModel.getData(con, params, query);
    }
}

export default new ResyncService();
