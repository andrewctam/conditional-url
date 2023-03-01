import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const oldShort = req.body.oldShort.toLowerCase();
    const newShort = req.body.newShort.toLowerCase();

    if (newShort === "" || !/^[a-zA-Z0-9]*$/.test(newShort)) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Short URL contains invalid characters"})
        };    
        return;
    } 


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

    if (!userResource.urls.includes(oldShort)) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Unauthorized"})
        };
        return;
    }
    

    const urlsContainer = client.database("conditionalurl").container("urls");
    const { resource: urlResource } = await urlsContainer.item(oldShort, oldShort).read();

    if (urlResource === undefined || urlResource.owner !== payload.username) {
        //already checked to see if on user's list above, but not found in DB
        throw Error("URL from user list not found");
    }

    const index = userResource.urls.indexOf(oldShort);
    userResource.urls[index] = newShort;

    try {
        urlResource.id = newShort;
        urlResource.short = newShort;
        
        //create new one
        await urlsContainer.items.create(urlResource);
    } catch (e) {
        console.log(e)
        context.res = {
            status: 409,
            body: JSON.stringify({"msg": "New URL already exists"})
        };
        return;
    }

    //delete old one
    urlResource.id = oldShort;
    urlResource.short = oldShort;

    urlResource.deleted = true;
    urlResource.redirects = [];
    urlResource.dataPoints = [];
    urlResource.conditionals = "";

    await urlsContainer.item(oldShort, oldShort).replace(urlResource);

    await userContainer.item(payload.username, payload.username).replace(userResource);

    context.res = {
        status: 200,
        body: JSON.stringify("URL renamed")
    }

};

export default httpTrigger;