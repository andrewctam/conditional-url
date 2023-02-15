import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username.toLowerCase();
    const password = req.body.password;

    if (username === "" || !/^[a-zA-Z0-9]*$/.test(username) || password.length < 8) {
        context.res = {
            status: 401,
            body: JSON.stringify("Failed to sign in")
        };
    }

    dotenv.config();
    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    const client = new CosmosClient({ endpoint, key });
    const container = client.database("conditionalurl").container("users");

    try {
        const { resource } = await container.item(username, username).read();
        if (await bcrypt.compare(password, resource.hashedPassword)) {
            const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '15m' });
            const refreshToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '7d' });

            resource.hashedRefresh = await bcrypt.hash(refreshToken, 10);
            await container.item(username, username).replace(resource);

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
            body: JSON.stringify("Failed to sign in")
        }
        return;
    }



};

export default httpTrigger;