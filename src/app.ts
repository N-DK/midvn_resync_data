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
import { initDB } from './dbs/init.mysql';
initDB();

// resync data
import resyncService from './services/resync.service';
resyncService.resyncData('08944FE55T');

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
