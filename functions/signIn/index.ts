import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { connectDB } from '../database';
import * as dotenv from 'dotenv';
import { createHmac } from "crypto";
import { ObjectId } from "mongodb";
import { User } from "../types";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username.toLowerCase();
    const password = req.body.password;

    if (username === "" || !/^[a-zA-Z0-9]*$/.test(username) || password.length < 8) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Failed to sign in"})
        };
    }

    dotenv.config();
    const client = await connectDB();
    const db = client.db("conditionalurl");

    const userCollection = db.collection<User>("users");

    try {
        const user = await userCollection.findOne({ _id: username });

        if (await bcrypt.compare(password, user.hashedPassword)) {
            const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });

            const updateRefresh = {
                $set: {
                    hashedRefresh: createHmac("sha256", process.env.JWT_SECRET)
                                    .update(refreshToken)
                                    .digest("hex")
                }
            };
            

            await userCollection.updateOne({ _id: username }, updateRefresh);
        
            context.res = {
                status: 200,
                body: JSON.stringify({
                    username: username,
                    accessToken: accessToken,
                    refreshToken: refreshToken
                })
            }

            return;
        } else {
            throw new Error("Failed to sign in");
        }
    } catch (e) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Failed to sign in"})
        }
        return;
    }



};

export default httpTrigger;