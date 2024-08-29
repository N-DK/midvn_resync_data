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
import axios from 'axios';
import fs from 'fs';

const { PROCESS_BATCH_SIZE } = configureEnvironment();

const resync = async () => {
    const database = new DatabaseModel();
    const { conn: con } = await getConnection();

    const { data } = await redisModel.hGet(
        'number_of_devices_resynced',
        `number_of_devices_resynced_${PROCESS_BATCH_SIZE}`,
        'app.ts',
        Date.now(),
    );

    console.log('data redis in app.ts: ', data);

    let res: any = await database.select(
        con,
        tables.tableDevice,
        'id, imei',
        'dev_id IS NOT NULL AND device_status_id = ?',
        [3],
        'id',
        'ASC',
        0, // data !== null ? Number(data) : Number(PROCESS_BATCH_SIZE)
        999999, // 1000
    );

    const imeis = res.map((item: any) => item.imei);

    resyncService.saveToTxt(imeis);

    // resyncService.resyncMultipleDevices(imeis);
};

resync();

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
import { tables } from './constants/tableName.constant';
IssueTask.checkOverload().start();

export default app;
