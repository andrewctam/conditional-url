import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { createHmac, timingSafeEqual } from "crypto";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const refreshToken = req.body.refreshToken;

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
            body: JSON.stringify({"msg": "Invalid token"})
        };
        return;
    }



    if (payload === undefined || payload.username === undefined || payload.username !== payload.username) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Invalid token"})
        };
        return;
    }

    const { resource } = await container.item(payload.username, payload.username).read();

    if (resource === undefined) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        };
        return;
    }

    const providedRefresh = createHmac("sha256", process.env.JWT_SECRET)
                        .update(refreshToken)
                        .digest("hex");

    if (!timingSafeEqual(Buffer.from(resource.hashedRefresh), Buffer.from(providedRefresh))) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Invalid token"})
        };
        return;
    }

    let returnedRefreshToken = refreshToken;
    //if the token will expire in less than a day, refresh it
    const ONE_DAY = 60 * 60 * 24;
    if (payload.exp - Date.now() / 1000 < ONE_DAY) { 
        returnedRefreshToken = jwt.sign({ username: payload.username }, process.env.JWT_SECRET, { expiresIn: "1d" });
        resource.hashedRefresh = createHmac("sha256", process.env.JWT_SECRET)
                                    .update(returnedRefreshToken)
                                    .digest("hex");

        await container.item(payload.username, payload.username).replace(resource);
    }

    context.res = {
        status: 200,
        body: JSON.stringify({
            accessToken: jwt.sign({ username: payload.username }, process.env.JWT_SECRET, { expiresIn: "15m" }),
            refreshToken: returnedRefreshToken
        })
    };
    

}



export default httpTrigger;