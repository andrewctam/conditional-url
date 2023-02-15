import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const oldShort = req.body.oldShort;
    const newShort = req.body.newShort;

    if (newShort === "" || !/^[a-zA-Z0-9]*$/.test(newShort) || newShort.startsWith("http")) {
        context.res = {
            status: 400,
            body: JSON.stringify("Short URL contains invalid characters")
        };    
        return;
    } 


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

    const username = payload.username;
    

    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const urlsContainer = client.database("conditionalurl").container("urls");


    const { resource: urlResource } = await urlsContainer.item(oldShort, oldShort).read();

    if (urlResource === undefined || urlResource.owner !== username) {
        context.res = {
            status: 404,
            body: JSON.stringify("User or URL not found")
        };
        return;
    }

    const userContainer = client.database("conditionalurl").container("users");
    const { resource: userResource } = await userContainer.item(payload.username, payload.username).read();
    
    if (userResource === undefined || !userResource.urls.includes(oldShort)) {   
        context.res = {
            status: 404,
            body: JSON.stringify("User or URL not found")
        };
        return;
    }
    const index = userResource.urls.indexOf(oldShort);
    userResource.urls[index] = newShort;


    try {
        urlResource.id = newShort;
        urlResource.short = newShort;
        
        //create new one
        await urlsContainer.items.create(urlResource);
        
        //delete old one
        await urlsContainer.item(oldShort, oldShort).delete();

        
    } catch (e) {
        console.log(e)
        context.res = {
            status: 409,
            body: JSON.stringify("New URL already exists")
        };
        return;
    }


    await userContainer.item(payload.username, payload.username).replace(userResource);

    context.res = {
        status: 200,
        body: JSON.stringify("URL renamed")
    }

};

export default httpTrigger;