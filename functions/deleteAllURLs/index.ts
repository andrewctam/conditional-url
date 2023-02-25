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
    const userContainer = client.database("conditionalurl").container("users");
    
    const { resource } = await userContainer.item(payload.username, payload.username).read();
    resource.urls = [];
    resource.urlCount = 0;

    const urlsContainer = client.database("conditionalurl").container("urls");

    const { resources } = await urlsContainer.items.query({
        query: "SELECT * FROM c WHERE c.owner = @username",
        parameters: [
            {
                name: "@username",
                value: payload.username
            }
        ]
    }).fetchAll();
    for (const resource of resources) {
        await urlsContainer.item(resource.short, resource.short).delete();
    }

    await userContainer.item(payload.username, payload.username).replace(resource);

    context.res = {
        status: 200,
        body: JSON.stringify("All URLs deleted")
    }

};

export default httpTrigger;