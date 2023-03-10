import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { URL } from "../createUrl";
import { connectDB } from "../database";
import { DataPoint } from "../getDataPoints";
import { User } from "../signUp";

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

    const user = await userCollection.findOne({_id: payload.username});

    if (user === null) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        };
        return;
    }

    if (user.urlCount === 0) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "No URLs to delete"})
        };
        return;
    }

    const urlsCollection = db.collection<URL>("urls");
    const deleteUrl = {
        $set: {
            deleted: true,
            redirects: [],
            conditionals: "",
            urlCount: 0,
        }
    }

    await urlsCollection.updateMany({_id: {$in: user.urls}}, deleteUrl);


    const dpCollection = db.collection<DataPoint>("datapoints");
    await dpCollection.deleteMany({owner: payload.username});



    const removeFromList = {
        $set: {
            urls: [],
            urlCount: 0,
        }
    }
 
    await userCollection.updateOne({_id: payload.username}, removeFromList);


    context.res = {
        status: 200,
        body: JSON.stringify("All URLs deleted")
    }

};

export default httpTrigger;