import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const refreshToken = req.body.refreshToken;
    const username  = req.body.username;

    dotenv.config();
    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];

    const client = new CosmosClient({ endpoint, key });
    const container = client.database("conditionalurl").container("users");

    let payload;
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (error) {
        context.res = {
            status: 401,
            body: JSON.stringify("Invalid token")
        };
        return;
    }



    if (payload === undefined || payload.username === undefined || payload.username !== username) {
        context.res = {
            status: 401,
            body: JSON.stringify("Invalid token")
        };
        return;
    }

    const { resource } = await container.item(username, username).read();

    if (resource === undefined) {
        context.res = {
            status: 400,
            body: JSON.stringify("User not found")
        };
        return;
    }

    if (!(await bcrypt.compare(refreshToken, resource.hashedRefresh))) {
        context.res = {
            status: 401,
            body: JSON.stringify("Invalid refresh token")
        };
        return;
    }

    const accessToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "15m" });
    let returnedRefreshToken = refreshToken;

    //if the token will expire in less than a day, refresh it
    const ONE_DAY = 60 * 60 * 24;
    if (payload.exp - Date.now() / 1000 < ONE_DAY) { 
        returnedRefreshToken = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1d" });
        resource.hashedRefresh = await bcrypt.hash(returnedRefreshToken, 10);

        await container.item(username, username).replace(resource);
    }

    context.res = {
        status: 200,
        body: JSON.stringify({
            accessToken,
            refreshToken: returnedRefreshToken
        })
    };
    

}



export default httpTrigger;