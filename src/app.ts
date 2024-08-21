import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(
    helmet.frameguard({
        action: 'deny',
    }),
); //not a browser should be allowed to render a page in the <frame>, <iframe>, <embed> and <object> HTML elements.
app.use(
    compression({
        level: 6, // level compress
        threshold: 100 * 1024, // > 100kb threshold to compress
        filter: (req) => {
            return !req.headers['x-no-compress'];
        },
    }),
);
app.use(cors({ origin: true, credentials: true })); // origin: true cho phép client truy cập.
// config uploads folder
app.use(express.static(path.join(__dirname, 'uploads')));

// body-parser config
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ limit: '10kb', extended: true }));

//init db
import { getConnection, initDB } from './dbs/init.mysql';
initDB();

// init redis
import { initRedis } from './dbs/init.redis';
initRedis();

// resync data
import DatabaseModel from './models/database.model';
import resyncService from './services/resync.service';
import redisModel from './models/redis.model';
import configureEnvironment from './config/dotenv.config';

const { PROCESS_BATCH_SIZE } = configureEnvironment();

const fetch = async () => {
    const database = new DatabaseModel();
    const { conn: con } = await getConnection();

    const getDevices = async (data: any) => {
        return await database.select(
            con,
            'tbl_device',
            'id, imei',
            'dev_id IS NOT NULL',
            [],
            'id',
            'ASC',
            data !== null ? Number(data) : 0,
            Number(PROCESS_BATCH_SIZE),
        );
    };

    try {
        let { data } = await redisModel.get('number_of_devices_resync', '', 1);

        console.log('data redis in app.ts: ', data);

        let res: any = await getDevices(data);

        while (res.length > 0) {
            const imeis = res.map((item: any) => item.imei);

            await resyncService.resyncMultipleDevices(imeis);

            const redisResult = await redisModel.get(
                'number_of_devices_resync',
                'app.ts',
                1,
            );

            data = redisResult?.data;

            res = await getDevices(data);
        }
    } catch (error) {
        console.error('Error during fetch operation:', error);
    }
};

fetch();

// import routes
import route from './routes';
route(app);

//middlewares handle error
import {
    is404Handler,
    logErrorMiddleware,
    returnError,
} from './middlewares/handleErrors.middleware';

app.use(is404Handler);
app.use(logErrorMiddleware);
app.use(returnError);

//init cron job
import IssueTask from './tasks/issue.task';
IssueTask.checkOverload().start();

export default app;
