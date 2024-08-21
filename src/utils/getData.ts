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
    try {
        // Fetch data from API
        const response: any = await axios.get(
            `http://njnjcnxc.taixecongnghe.com:9989/download?file=${imei}`,
        );

        // Alternatively, read mock data from file
        // const response: string = fs.readFileSync(
        //     `./src/common/${imei}.txt`,
        //     'utf8',
        // ); // Mock data

        const rawData: string = response?.data;

        if (!rawData) throw new Error('No data received from API.');

        // Process and parse the data
        let data = rawData
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((jsonString) => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    console.error('Failed to parse JSON:', error);
                    return null; // or handle this error as needed
                }
            })
            .filter((item) => item !== null); // Filter out null values from failed parsing

        // Check if the device exists in the database
        const device: any = await databaseModel.select(
            con,
            tables.tableDevice,
            'id',
            'imei = ?',
            [imei],
        );
        if (!device.length) throw new Error('Device not found.');

        // Format the data
        data = await formatData(data);

        return { data, device };
    } catch (error) {
        console.error('Error in getData function:', error);
        throw error; // Rethrow the error to be handled by the caller
    }
};
