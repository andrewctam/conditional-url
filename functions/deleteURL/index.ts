import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient, OperationInput } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    if (req.headers.authorization === "") {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "No token provided"})
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
            body: JSON.stringify({"msg": "Invalid token"})
        };
        return;
    }


    if (payload === undefined || payload.username === undefined) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Invalid token"})
        };
        return;
    }

    const short = req.body.short.toLowerCase();

    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const userContainer = client.database("conditionalurl").container("users");
    const { resource: userResource } = await userContainer.item(payload.username, payload.username).read();
    
    if (userResource === undefined) {   
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        };
        return;
    }

    if (!userResource.urls.includes(short)) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Unauthorized"})
        };
        return;
    }

    const urlsContainer = client.database("conditionalurl").container("urls");
    const dataPointsContainer = client.database("conditionalurl").container("dataPoints");

    const { resource: urlResource } = await urlsContainer.item(short, short).read();

    if (urlResource === undefined || urlResource.owner !== payload.username) {
        //already checked to see if on user's list above, but not found in DB
        throw Error("URL from user list not found");
    }

    urlResource.deleted = true;
    urlResource.redirects = [];
    urlResource.conditionals = "";
        
    await urlsContainer.item(short, short).replace(urlResource);
    
    
    const { resources } = await dataPointsContainer.items
    .query(`SELECT * FROM c WHERE c.short = "${short}"`).fetchAll();

    const operations: OperationInput[] = resources.map((r: any) => {
        return {
            operationType: "Delete",
            partitionKey: r.short,
            id: r.id
        }
    });

    await dataPointsContainer.items.bulk(operations);


    const index = userResource.urls.indexOf(short);
    userResource.urls.splice(index, 1);
    userResource.urlCount--;

    await userContainer.item(payload.username, payload.username).replace(userResource);

    context.res = {
        status: 200,
        body: JSON.stringify("URL deleted")
    }

};

export default httpTrigger;