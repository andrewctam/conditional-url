import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username;
    const password = req.body.password;
    let alsoDeleteURLs = req.body.alsoDeleteURLs;
    
    if (alsoDeleteURLs === undefined)
        alsoDeleteURLs = true;

    if (username === undefined || username === "" || password === undefined || password === "") {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg:": "No username or password provided"})
        }
    }


    dotenv.config();
    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const userContainer = client.database("conditionalurl").container("users");
    
    const { resource } = await userContainer.item(username, username).read();

    if (resource === undefined) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg:": "User not found"})
        }
        return;
    }

    if (await bcrypt.compare(password, resource.hashedPassword)) {
        await userContainer.item(username, username).delete();
    } else {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg:": "Incorrect password"})
        }
        return;
    }

    const urlsContainer = client.database("conditionalurl").container("urls");
    const { resources } = await urlsContainer.items.query({
        query: "SELECT * FROM c WHERE c.owner = @username",
        parameters: [
            {
                name: "@username",
                value: username
            }
        ]
    }).fetchAll();

    if (alsoDeleteURLs) {
        for (const resource of resources) {
            resource.deleted = true;
            resource.redirects = [];
            resource.dataPoints = [];
            resource.conditionals = "";
            resource.owner = ""; //disassociate the url from the user
    
            await urlsContainer.item(resource.short, resource.short).replace(resource);
        }
    } else {
        for (const resource of resources) {
            resource.owner = ""; //disassociate the url from the user
            await urlsContainer.item(resource.short, resource.short).replace(resource);
        }
    }

    context.res = {
        status: 200,
        body: JSON.stringify("Deleted Account")
    }

};

export default httpTrigger;