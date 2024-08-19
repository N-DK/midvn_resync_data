import { getConnection } from '../dbs/init.mysql';
import resyncModel from '../models/resync.model';

class ResyncService {
    async resyncData(imei: string) {
        const { conn: con } = await getConnection();
        resyncModel.resyncData(con, imei);
    }
}

export default new ResyncService();
