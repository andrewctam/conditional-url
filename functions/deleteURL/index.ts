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

    const short = req.body.short.toLowerCase();

    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const userContainer = client.database("conditionalurl").container("users");
    const { resource } = await userContainer.item(payload.username, payload.username).read();
    
    if (resource === undefined || !resource.urls.includes(short)) {   
        context.res = {
            status: 404,
            body: JSON.stringify("User or URL not found")
        };
        return;
    }

    const urlsContainer = client.database("conditionalurl").container("urls");
    const { resource: urlResource } = await urlsContainer.item(short, short).read();

    if (urlResource === undefined) {
        context.res = {
            status: 404,
            body: JSON.stringify("User or URL not found")
        };
        return;
    }

    if (urlResource.owner !== payload.username) {
        context.res = {
            status: 400,
            body: JSON.stringify("Unauthorized")
        };
        return;
    }

    urlResource.deleted = true;
    urlResource.redirects = [];
    urlResource.dataPoints = [];
    urlResource.conditionals = "";
    
    await urlsContainer.item(short, short).replace(urlResource);

    const index = resource.urls.indexOf(short);
    resource.urls.splice(index, 1);
    resource.urlCount--;

    await userContainer.item(payload.username, payload.username).replace(resource);

    context.res = {
        status: 200,
        body: JSON.stringify("URL deleted")
    }

};

export default httpTrigger;