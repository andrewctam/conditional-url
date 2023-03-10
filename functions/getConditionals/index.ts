import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { URL } from "../createUrl";
import { connectDB } from "../database"

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

    const short = req.query.short.toLowerCase();
    if (short === undefined || short === "") {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "No short URL provided"})
        };
        return;
    }

    const client = await connectDB();
    const db = client.db("conditionalurl");

    const urlsCollection = db.collection<URL>("urls");

    const url = await urlsCollection.findOne({ _id: short });

    if (url === null) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "Short URL not found"})
        };
        return;
    }

    if (url.owner !== payload.username) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "You do not own this URL"})
        };
        return;
    }

    context.res = {
        status: 200,
        body: JSON.stringify({
            conditionals: url.conditionals,
            redirects: url.redirects
        })
    }
};



export default httpTrigger;