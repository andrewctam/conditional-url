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


    if (userResource.urlCount === 0) {
        context.res = {
            status: 404,
            body: JSON.stringify("No URLs to delete")
        };
        return;
    }
    const urlsContainer = client.database("conditionalurl").container("urls");
    const { resources: urlResources } = await urlsContainer.items
        .query(`SELECT * FROM c WHERE c.owner = "${payload.username}"`).fetchAll();

    const deleteUrls: OperationInput[] = urlResources.map((r: any) => {
        r.deleted = true;
        r.redirects = [];
        r.conditionals = "";
        r.urlCount = 0;

        return {
            id: r.id,
            operationType: "Replace",
            resourceBody: r
        }
    });


    await urlsContainer.items.bulk(deleteUrls);


    const dataPointsContainer = client.database("conditionalurl").container("dataPoints");
    const shorts = urlResources.map((r: any) => r.short);
    const { resources: dataPoints } = await dataPointsContainer.items
        .query(`SELECT * FROM c WHERE c.short IN ("${shorts.join('", "')}")`).fetchAll();

    const deleteDataPoints: OperationInput[] = dataPoints.map((r: any) => {
        return {
            operationType: "Delete",
            partitionKey: r.id,
            id: r.id
        }
    });

    await dataPointsContainer.items.bulk(deleteDataPoints);


    userResource.urls = [];
    userResource.urlCount = 0;

    await userContainer.item(payload.username, payload.username).replace(userResource);

    context.res = {
        status: 200,
        body: JSON.stringify("All URLs deleted")
    }

};

export default httpTrigger;