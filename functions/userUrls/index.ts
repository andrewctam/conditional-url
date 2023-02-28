import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
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
    
    const { resource } = await userContainer.item(payload.username, payload.username).read();
    if (resource === undefined) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "User not found"})
        };
        return;
    }

    const pageParam = req.query.page;
    let page = 0;
    if (pageParam !== undefined) {
        page = parseInt(pageParam);
        if (isNaN(page))
            page = 0;
    }

    const sort = req.query.sort;
    let urls = resource.urls;

    if (sort === "Newest") {
        urls = urls.reverse();
    }    

    
    context.res = {
        status: 200,
        body: JSON.stringify({
            page: page,
            pageCount: Math.ceil(resource.urls.length / 10),
            paginatedUrls: urls.slice(page * 10, (page + 1) * 10)
        })
    };

      



};

export default httpTrigger;