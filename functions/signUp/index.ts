import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { createHmac } from "crypto";
import { connectDB } from "../database";
import { ObjectId } from "mongodb";
import { User } from "../types";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username.toLowerCase();
    const password = req.body.password;

    if (username === "" || !/^[a-zA-Z0-9]*$/.test(username) || password.length < 8) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Invalid username or password"})
        };    
        return;
    }

    dotenv.config();

    const client = await connectDB();
    const db = client.db("conditionalurl");

    const usersCollection = db.collection<User>("users");

    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
        const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });

        const hashedRefresh = createHmac("sha256", process.env.JWT_SECRET)
                                    .update(refreshToken)
                                    .digest("hex");


        const createUser: User = {
            _id: username,
            uid: new ObjectId(),
            hashedPassword: hashedPassword,
            urls: [],
            urlCount: 0,
            hashedRefresh: hashedRefresh
        }
        

        await usersCollection.insertOne(createUser)


        context.res = {
            status: 200,
            body: JSON.stringify({
                username: username,
                accessToken: accessToken,
                refreshToken: refreshToken
            })
        }

    } catch (e) {
        console.log(e)
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Username already exists"})
        }
    }
    
    
};

export default httpTrigger;