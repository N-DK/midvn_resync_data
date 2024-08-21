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

// const fetch = async () => {
//     const database = new DatabaseModel();
//     const { conn: con } = await getConnection();

//     const getDevices = async (data: any) => {
//         return await database.select(
//             con,
//             'tbl_device',
//             'id, imei',
//             'dev_id IS NOT NULL',
//             [],
//             'id',
//             'ASC',
//             data !== null ? Number(data) : 0,
//             5,
//         );
//     };

//     try {
//         let { data } = await redisModel.get('number_of_devices_resync', '', 1);

//         console.log('data redis in app.ts: ', data);

//         let res: any = await getDevices(data);

//         while (res.length > 0) {
//             const imeis = res.map((item: any) => item.imei);

//             await resyncService.resyncMultipleDevices(imeis);

//             const redisResult = await redisModel.get(
//                 'number_of_devices_resync',
//                 '',
//                 1,
//             );

//             data = redisResult?.data;

//             res = await getDevices(data);
//         }
//     } catch (error) {
//         console.error('Error during fetch operation:', error);
//     }
// };

// fetch();

// const imeis = ['08F4A2930T', '08F2BA19ET', '089AFD416T'];

// async function resyncImeisSequentially() {
//     for (const imei of imeis) {
//         console.time(`Time resync for IMEI: ${imei}`);
//         await resyncService.resyncData(imei);
//         console.timeEnd(`Time resync for IMEI: ${imei}`);
//     }
//     console.log('All IMEIs have been processed.');
// }

// resyncImeisSequentially();

// resyncService.resyncMultipleDevices(imeis);

// import axios from 'axios';

// const vehicleData = [
//     {
//         plateNumber: '29H95269',
//         imei: '2E346C352A',
//         trackingCode: '08F3AE5BET',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe khách 16 chỗ',
//     },
//     {
//         plateNumber: '30H49244',
//         imei: null,
//         trackingCode: '08F3AE4EFT',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe khách 7 chỗ',
//     },
//     {
//         plateNumber: '30K05041',
//         imei: null,
//         trackingCode: '08F3AE658T',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe khách 7 chỗ',
//     },
//     {
//         plateNumber: '30H36938',
//         imei: null,
//         trackingCode: '08F3AE5A5T',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: '4 chỗ - 7 chỗ',
//     },
//     {
//         plateNumber: '30L20529',
//         imei: null,
//         trackingCode: '08F3AE4A1T',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe khách 7 chỗ',
//     },
//     {
//         plateNumber: '30G05659',
//         imei: null,
//         trackingCode: '08F3AE4A0T',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: '4 chỗ - 7 chỗ',
//     },
//     {
//         plateNumber: '30K99219',
//         imei: null,
//         trackingCode: '08F3AE638T',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe hơi 4 chỗ',
//     },
//     {
//         plateNumber: '30G33626',
//         imei: null,
//         trackingCode: '08F3AE66BT',
//         company: 'CT TNHH DL TM VÀ VẬN TẢI THĂNG LONG (thanglongcar)',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe khách 7 chỗ',
//     },
//     {
//         plateNumber: '30L37701',
//         imei: null,
//         trackingCode: '08F4A2AC0T',
//         company: 'Cty tnhh thương mại dịch vụ vận tải du lịch NDT',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe khách 7 chỗ',
//     },
//     {
//         plateNumber: '29H99969',
//         imei: '2E383CDADA',
//         trackingCode: '08F4A2900T',
//         company: 'Cty tnhh thương mại dịch vụ vận tải du lịch NDT',
//         location: 'ĐL THẢO NGUYÊN',
//         vehicleType: 'Xe khách 16 chỗ',
//     },
// ];

// const fetch = async () => {
//     for (const vehicle of vehicleData) {
//         console.time(`Time ${vehicle.plateNumber}`);
//         await new Promise(async (resolve, reject) => {
//             try {
//                 const payload = {
//                     vehicle: [vehicle.plateNumber],
//                     devid: [vehicle.trackingCode],
//                     st: 1721433600,
//                     et: 1721519999,
//                     company: vehicle.company,
//                     number: 5,
//                 };

//                 const response = await axios.post(
//                     'http://svbcrp.daily.midvietnam.com/resyncReportV',
//                     payload,
//                 );

//                 console.log(`${vehicle.plateNumber} >> ${response?.data}`);

//                 resolve(true);
//             } catch (error: any) {
//                 console.error('Error resync data: ', error.message);
//                 reject(error);
//             }
//         });

//         console.timeEnd(`Time ${vehicle.plateNumber}`);
//     }

//     console.log('>> ALL FINISHED');
// };

// fetch();

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
