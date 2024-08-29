import DatabaseModel from './database.model';
import { PoolConnection } from 'mysql2';
import { syncBatch } from '../utils/syncBatch';
import { getData } from '../utils/getData';
import getTableName from '../utils/table/getTableName';
import { setting } from '../constants/setting.constant';
import configureEnvironment from '../config/dotenv.config';
import { fork } from 'child_process';
import redisModel from './redis.model';
import axios from 'axios';
import https from 'https';
import fs from 'fs';

const {
    BATCH_SIZE,
    TIME_SEND,
    PROCESS_BATCH_SIZE,
    BATCH_SIZE_TXT,
    TIME_SEND_TXT,
} = configureEnvironment();
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({ keepAlive: true }),
    timeout: 60000,
});
class ResyncModel extends DatabaseModel {
    private number_of_devices_resync: number = 0;

    constructor() {
        super();
    }

    async resyncData(con: PoolConnection, imei: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                const { data, device } = await getData(con, imei, this);

                const interval = setInterval(async () => {
                    console.time(`Time resync data ${imei}`);
                    const batch = data.splice(0, Number(BATCH_SIZE));
                    if (batch.length === 0) {
                        clearInterval(interval);
                        console.timeEnd(`Time resync data ${imei}`);
                        resolve(true);
                        return;
                    }
                    await syncBatch(con, batch, device, this);
                    console.timeEnd(`Time resync data ${imei}`);
                }, Number(TIME_SEND));
            } catch (error: any) {
                console.error('Error resync data: ', error.message);
                reject(error);
            }
        });
    }

    // async resyncMultipleDevices(con: PoolConnection, imeis: string[]) {
    //     console.time(`Time resync multiple devices ${imeis}`);

    //     await Promise.all(imeis.map((imei) => this.runChildProcess(imei)));

    //     try {
    //         const { data } = await redisModel?.get(
    //             'number_of_devices_resync',
    //             './src/model/resync.model.ts',
    //             1,
    //         );

    //         this.number_of_devices_resync = Number(data) || 0;

    //         const updatedCount = this.number_of_devices_resync + imeis.length;

    //         const res = await redisModel.setWithExpired(
    //             'number_of_devices_resync',
    //             `${updatedCount}`,
    //             60 * 60 * 24,
    //             './src/model/resync.model.ts',
    //             Date.now(),
    //         );

    //         this.number_of_devices_resync = updatedCount;

    //         console.timeEnd(`Time resync multiple devices ${imeis}`);
    //     } catch (error) {
    //         console.error('Error handling Redis operations:', error);
    //     }
    // }

    async resyncMultipleDevices(con: PoolConnection, imeis: string[]) {
        const BATCH_SIZE = 8;
        const imeiGroups = [];

        for (let i = 0; i < imeis.length; i += BATCH_SIZE) {
            imeiGroups.push(imeis.slice(i, i + BATCH_SIZE));
        }

        for (const group of imeiGroups) {
            console.time(`Time resync multiple devices ${group}`);
            await Promise.all(group.map((imei) => this.runChildProcess(imei)));
            try {
                const { data } = await redisModel.hGet(
                    'number_of_devices_resynced',
                    `number_of_devices_resynced_${PROCESS_BATCH_SIZE}`,
                    'app.ts',
                    Date.now(),
                );

                this.number_of_devices_resync =
                    Number(data) || Number(PROCESS_BATCH_SIZE);

                const updatedCount =
                    this.number_of_devices_resync + group.length;

                await redisModel.hSet(
                    'number_of_devices_resynced',
                    `number_of_devices_resynced_${PROCESS_BATCH_SIZE}`,
                    `${updatedCount}`,
                    './src/model/resync.model.ts',
                    Date.now(),
                );

                this.number_of_devices_resync = updatedCount;

                console.timeEnd(`Time resync multiple devices ${group}`);
            } catch (error) {
                console.error('Error handling Redis operations:', error);
            }
        }
    }

    async runChildProcess(imei: string) {
        return new Promise(async (resolve, reject) => {
            const child = fork('./src/utils/resyncWorker.ts', [imei]);

            child.on('exit', (code) => {
                if (code === 0) {
                    resolve(true);
                } else {
                    reject(
                        new Error(
                            `Process exited with code ${code} for IMEI: ${imei}`,
                        ),
                    );
                }
            });

            child.on('error', (error) => {
                console.error(
                    `Lỗi trong child process cho IMEI: ${imei}`,
                    error,
                );
                reject(error);
            });
        });
    }

    async saveDataToTxt(imeis: string[]) {
        const BATCH_SIZE = Number(BATCH_SIZE_TXT);

        console.log(imeis.length);

        const imeiGroups = [];
        let count = 1;

        // try {
        //     let count = 1;

        //     const interval = setInterval(async () => {
        //         if (imeis.length === 0) {
        //             clearInterval(interval);
        //             return;
        //         }

        //         console.time(`Download ${BATCH_SIZE} files ${count} times`);

        //         const group = imeis.splice(0, BATCH_SIZE);

        //         await new Promise(async (resolve, reject) => {
        //             for (const imei of group) {
        //                 try {
        //                     const response = await this.fetchDataWithRetry(
        //                         imei,
        //                     );

        //                     if (!response) {
        //                         continue;
        //                     }

        //                     let rawData: string = response.data;
        //                     const fileSizeInBytes = Buffer.byteLength(
        //                         rawData,
        //                         'utf8',
        //                     );
        //                     const fileSizeInMegabytes =
        //                         fileSizeInBytes / 1000000.0;
        //                     console.log(
        //                         `fileSizeInMegabytes of ${imei}: ${fileSizeInMegabytes} MB`,
        //                     );

        //                     fs.writeFileSync(
        //                         `./src/common/${imei}.txt`,
        //                         rawData,
        //                         'utf8',
        //                     );

        //                     const result = fs.readFileSync(
        //                         `./src/common/${imei}.txt`,
        //                         'utf8',
        //                     );
        //                     let data = result
        //                         .split('\n')
        //                         .filter((line) => line.trim() !== '')
        //                         .map((jsonString) => {
        //                             try {
        //                                 return JSON.parse(jsonString);
        //                             } catch (error) {
        //                                 console.error(
        //                                     'Failed to parse JSON:',
        //                                     error,
        //                                 );
        //                                 return null;
        //                             }
        //                         })
        //                         .filter((item) => item !== null);

        //                     const maxTime = Math.max(
        //                         ...data.map((item) => item.tm),
        //                     );
        //                     console.log(
        //                         'TIME: ',
        //                         new Date(data[0].tm * 1000),
        //                         new Date(maxTime * 1000),
        //                     );
        //                 } catch (error: any) {
        //                     console.log(
        //                         'Error save data to txt: ',
        //                         error.message,
        //                     );
        //                 }
        //             }
        //             resolve(true);
        //         });

        //         console.timeEnd(`Download ${BATCH_SIZE} files ${count} times`);
        //         count++;

        //         console.log(imeis.length);

        //         if (imeis.length === 0) {
        //             clearInterval(interval);
        //         } else {
        //             console.log('Cho nghỉ 300s nha');
        //         }
        //     }, 10 * 1000); // 30 giây nghỉ giữa các lần tải
        // } catch (error: any) {
        //     console.error('Error in resyncFiles: ', error.message);
        // }

        for (let i = 0; i < imeis.length; i += BATCH_SIZE) {
            imeiGroups.push(imeis.slice(i, i + BATCH_SIZE));
        }

        for (const group of imeiGroups) {
            console.time(`Download ${BATCH_SIZE} files ${count} times`);
            for (const imei of group) {
                try {
                    const response: any = await this.fetchDataWithRetry(imei);

                    if (!response) {
                        continue;
                    }

                    let rawData: string = response?.data;

                    const fileSizeInBytes = Buffer.byteLength(rawData, 'utf8');
                    const fileSizeInMegabytes = fileSizeInBytes / 1000000.0;
                    console.log(
                        `fileSizeInMegabytes of ${imei}: ${fileSizeInMegabytes} MB`,
                    );

                    fs.writeFileSync(
                        `./src/common/${imei}.txt`,
                        response.data,
                        'utf8',
                    );

                    const result: string = fs.readFileSync(
                        `./src/common/${imei}.txt`,
                        'utf8',
                    );

                    let data = result
                        .split('\n')
                        .filter((line) => line.trim() !== '')
                        .map((jsonString) => {
                            try {
                                return JSON.parse(jsonString);
                            } catch (error) {
                                console.error('Failed to parse JSON:', error);
                                return null;
                            }
                        })
                        .filter((item) => item !== null)
                        .sort((a, b) => a.tm - b.tm);
                    console.log(
                        'TIME: ',
                        new Date(data[0].tm * 1000),
                        new Date(data[data.length - 1].tm * 1000),
                    );
                } catch (error: any) {
                    console.log('Error save data to txt: ', error.message);
                }
            }
            console.timeEnd(`Download ${BATCH_SIZE} files ${count} times`);
            count++;
            console.log(`Nghỉ ${TIME_SEND_TXT}s nha`);
            await this.sleep(Number(TIME_SEND_TXT) * 1000);
            console.log(`Đã nghỉ ${TIME_SEND_TXT}s rồi nè`);
        }
    }

    async fetchDataWithRetry(imei: string, retries: number = 3): Promise<any> {
        try {
            return await axiosInstance.get(
                `http://njnjcnxc.taixecongnghe.com:9989/download?file=${imei}`,
            );
        } catch (error: any) {
            if (retries > 0 && error.code === 'ECONNRESET') {
                console.log(`Retrying download for ${imei}...`);
                await this.sleep(5 * 1000);
                return this.fetchDataWithRetry(imei, retries - 1);
            }
            throw error;
        }
    }

    async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // async saveDataToTxt(imeis: string[]) {
    //     const BATCH_SIZE = 15;
    //     const imeiGroups = [];
    //     let count = 1;

    //     for (let i = 0; i < imeis.length; i += BATCH_SIZE) {
    //         imeiGroups.push(imeis.slice(i, i + BATCH_SIZE));
    //     }

    //     for (const group of imeiGroups) {
    //         console.time(`Download ${BATCH_SIZE} files ${count} times`);
    //         for (const imei of group) {
    //             try {
    //                 const response: any = await axios
    //                     .create({
    //                         httpsAgent: new https.Agent({ keepAlive: true }),
    //                     })
    //                     .get(
    //                         `http://njnjcnxc.taixecongnghe.com:9989/download?file=${imei}`,
    //                     );

    //                 let rawData: string = response?.data;

    //                 const fileSizeInBytes = Buffer.byteLength(rawData, 'utf8');
    //                 const fileSizeInMegabytes = fileSizeInBytes / 1000000.0;
    //                 console.log(
    //                     `fileSizeInMegabytes of ${imei}: ${fileSizeInMegabytes} MB`,
    //                 );
    //                 // lưu file .txt vào thư mục src/common
    //                 fs.writeFileSync(
    //                     `./src/common/${imei}.txt`,
    //                     response.data,
    //                     'utf8',
    //                 );

    //                 const result: string = fs.readFileSync(
    //                     `./src/common/${imei}.txt`,
    //                     'utf8',
    //                 ); // Mock data

    //                 let data = result
    //                     .split('\n')
    //                     .filter((line) => line.trim() !== '')
    //                     .map((jsonString) => {
    //                         try {
    //                             return JSON.parse(jsonString);
    //                         } catch (error) {
    //                             console.error('Failed to parse JSON:', error);
    //                             return null; // or handle this error as needed
    //                         }
    //                     })
    //                     .filter((item) => item !== null); // Filter out null values from failed parsing

    //                 // Lấy thời gian lơn nhất
    //                 const maxTime = Math.max(...data.map((item) => item.tm));
    //                 console.log(
    //                     'TIME: ',
    //                     new Date(data[0].tm * 1000),
    //                     new Date(maxTime * 1000),
    //                 );
    //             } catch (error: any) {
    //                 console.log('Error save data to txt: ', error.message);
    //             }
    //         }
    //         console.timeEnd(`Download ${BATCH_SIZE} files ${count} times`);
    //         count++;
    //         console.log('Cho ta nghỉ 30s nha');
    //         await this.sleep(30 * 1000);
    //         console.log('Đã nghỉ 30s rồi nè');
    //     }
    // }

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
