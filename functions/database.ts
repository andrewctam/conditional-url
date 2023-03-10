import { MongoClient } from "mongodb";
import * as dotenv from 'dotenv';

let dbInstance: MongoClient;

export const connectDB = async () => {
    if (!dbInstance) {
        dotenv.config();
        const url = process.env["MONGO_CONNECTION_STRING"]
        const client = new MongoClient(url);
        dbInstance = await client.connect();
        console.log("Connected to MongoDB!")
    }
    return dbInstance;
};

export const disconnectDB = async () => {
    if (dbInstance) {
        await dbInstance.close();
        dbInstance = null;
    }
}

connectDB();
