import axios from 'axios';
import { PoolConnection } from 'mysql2';
import DatabaseModel from '../models/database.model';
import { tables } from '../constants/tableName.constant';
import { formatData } from './formatData';
import fs from 'fs';
export const getData = async (
    con: PoolConnection,
    imei: string,
    databaseModel: DatabaseModel,
) => {
    // const response: string = await axios.get(
    //     `http://njnjcnxc.taixecongnghe.com:9989/download?file=${imei}`,
    // );

    const response: string = fs.readFileSync(
        `./src/common/${imei}.txt`,
        'utf8',
    ); // Mock data

    let data = response
        .split('\n')
        .filter((line) => line.trim() !== '')
        .map((jsonString) => JSON.parse(jsonString));

    const device: any = await databaseModel.select(
        con,
        tables.tableDevice,
        'id',
        'imei = ?',
        [imei],
    );
    if (!device.length) throw new Error('Device not found.');

    data = await formatData(data);

    return { data, device };
};
