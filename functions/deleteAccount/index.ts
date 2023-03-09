import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient, OperationInput } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username;
    const password = req.body.password;
    const alsoDeleteURLs = req.body.alsoDeleteURLs ?? true;

    if (username === undefined || username === "" || password === undefined || password === "") {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Incorrect password"})
        }
        return;
    }


    dotenv.config();
    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const userContainer = client.database("conditionalurl").container("users");
    
    const { resource: userResource } = await userContainer.item(username, username).read();

    if (userResource === undefined) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        }
        return;
    }

    if (await bcrypt.compare(password, userResource.hashedPassword)) {
        await userContainer.item(username, username).delete();
    } else {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Incorrect password"})
        }
        return;
    }

    const urlsContainer = client.database("conditionalurl").container("urls");
    const { resources: urlResources } = await urlsContainer.items
        .query(`SELECT * FROM c WHERE c.owner = "${username}"`).fetchAll();
        

    if (alsoDeleteURLs) {
        const deleteUrls: OperationInput[] = urlResources.map((r: any) => {
            r.deleted = true;
            r.redirects = [];
            r.conditionals = "";
            r.urlCount = 0;
            r.owner = ""; //disassociate the url from the user

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


    } else {
        const removeOwner: OperationInput[] = urlResources.map((r: any) => {
            r.owner = ""; //disassociate the url from the user
            return {
                id: r.id,
                operationType: "Replace",
                resourceBody: r
            }
        });

        await urlsContainer.items.bulk(removeOwner);
    }

    context.res = {
        status: 200,
        body: JSON.stringify("Deleted Account")
    }

};

export default httpTrigger;