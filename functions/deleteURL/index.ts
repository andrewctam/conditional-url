import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { connectDB } from "../database";
import { User } from "../signUp";
import { URL } from "../createUrl";
import { DataPoint } from "../getDataPoints";
import { ObjectId } from "mongodb";


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

    const short = req.body.short.toLowerCase();

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

    if (!user.urls.includes(short)) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Unauthorized"})
        };
        return;
    }

    const urlsCollection = db.collection<URL>("urls")

    const url = await urlsCollection.findOne({_id: short})

    if (url === undefined || url.owner !== payload.username) {
        //already checked to see if on user's list above, but not found in DB
        throw Error("URL from user list not found");
    }

    const deleteUrl = {
        $set: {
            deleted: true,
            redirects: [],
            uid: new ObjectId(), //disassociate the data with this url
            conditionals: "",
            urlCount: 0
        }
    }
        
    await urlsCollection.updateOne({_id: short}, deleteUrl);
    
    const removeFromList = {
        $pull: {
            urls: short
        },
        $inc: {
            urlCount: -1
        }
    }
   
    await userCollection.updateOne({_id: payload.username}, removeFromList);
       
    context.res = {
        status: 200,
        body: JSON.stringify("URL deleted")
    }

};

export default httpTrigger;