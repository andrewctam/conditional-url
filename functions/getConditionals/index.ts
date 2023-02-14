import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    if (req.headers.authorization === "") {
        context.res = {
            status: 401,
            body: JSON.stringify("No token provided")
        };
        return;
    }
    
    const accessToken = req.headers.authorization.split(" ")[1];
    
    dotenv.config();
    let payload;
    try {
        payload = jwt.verify(accessToken, process.env.JWT_SECRET);
    } catch (e) {
        context.res = {
            status: 401,
            body: JSON.stringify("Invalid token")
        };
        return;
    }

    if (payload === undefined || payload.username === undefined) {
        context.res = {
            status: 401,
            body: JSON.stringify("Invalid token")
        };
        return;
    }

    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const container = client.database("conditionalurl").container("urls");
    const short = req.query.short;
    
    if (short === undefined || short === "") {
        context.res = {
            status: 400,
            body: JSON.stringify("No short URL provided")
        };
        return;
    }


    const { resource } = await container.item(short, short).read();

    if (resource === undefined) {
        context.res = {
            status: 400,
            body: JSON.stringify("Short URL not found")
        };
        return;
    }

    if (resource.owner !== payload.username) {
        context.res = {
            status: 400,
            body: JSON.stringify("You do not own this URL")
        };
        return;
    }

    context.res = {
        status: 200,
        body: JSON.stringify({
            conditionals: resource.conditionals,
            redirects: resource.redirects
        })
    }
};



export default httpTrigger;