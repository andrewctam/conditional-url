import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { connectDB } from "../database";
import { User } from "../types";

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


    const client = await connectDB();
    const db = client.db("conditionalurl");

    const userCollection = db.collection<User>("users");

    const user = await userCollection.findOne({ _id: payload.username });

    if (user === null) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "User not found"})
        };
        return;
    }

    if (user.urlCount === 0) {
        context.res = {
            status: 200,
            body: JSON.stringify({
                noURLs: true
            })
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
    let urls = user.urls;

    if (sort === "Newest") {
        urls = urls.reverse();
    }

    const search = req.query.search;
    if (search && search.length > 0) {
        urls = urls.filter(url => url.includes(search));
    }

    context.res = {
        status: 200,
        body: JSON.stringify({
            page: page,
            pageCount: Math.ceil(user.urls.length / 10),
            searchedPageCount: Math.ceil(urls.length / 10),
            paginatedURLs: urls.slice(page * 10, (page + 1) * 10),
            noURLs: false
        })
    };

};

export default httpTrigger;