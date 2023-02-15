import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as bcrypt from 'bcryptjs';
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username.toLowerCase();
    const password = req.body.password;

    if (username === "" || !/^[a-zA-Z0-9]*$/.test(username) || password.length < 8) {
        context.res = {
            status: 400,
            body: JSON.stringify("Invalid username or password")
        };    
        return;
    }

    dotenv.config();
    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    const client = new CosmosClient({ endpoint, key });
    const container = client.database("conditionalurl").container("users");

    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
        const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const hashedRefresh = await bcrypt.hash(refreshToken, 10);

        await container.items.create({
            id: username,
            username,
            hashedPassword: hashedPassword,
            urls: [],
            urlCount: 0,
            hashedRefresh: hashedRefresh
        });


        context.res = {
            status: 200,
            body: JSON.stringify({
                username: username,
                accessToken: accessToken,
                refreshToken: refreshToken
            })
        }

    } catch (e) {
        context.res = {
            status: 400,
            body: JSON.stringify("Username already exists")
        }
    }
    
    
};

export default httpTrigger;