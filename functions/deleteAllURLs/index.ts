import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { ObjectId } from "mongodb";
import { ShortURL } from "../types";
import { connectDB } from "../database";
import { DataPoint } from "../types";
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

    const urlsCollection = db.collection<ShortURL>("urls");
    const deleteURL = {
        $set: {
            deleted: true,
            uid: new ObjectId(), //disassociate the data with this url
            redirects: [],
            conditionals: "",
            firstPoint: -1,
            urlCount: 0,
        }
    }

    await urlsCollection.updateMany({_id: {$in: user.urls}}, deleteURL);

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