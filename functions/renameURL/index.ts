import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { ObjectId } from "mongodb";
import { ShortURL } from "../types";
import { connectDB } from "../database";
import { User } from "../types";

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


    const client = await connectDB();
    const db = client.db("conditionalurl");
    
    const userCollection = db.collection<User>("users")

    const user = await userCollection.findOne({ _id: payload.username })
    
    if (user === null) {   
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        };
        return;
    }

    if (!user.urls.includes(oldShort)) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Unauthorized"})
        };
        return;
    }
    

    const urlsCollection = db.collection<ShortURL>("urls")

    const urls = await urlsCollection.find({ _id: { $in: [oldShort, newShort] } }).toArray();
    
    const oldURL = urls.find(url => url._id === oldShort);
    const newURL = urls.find(url => url._id === newShort);

    if (oldURL === undefined || oldURL.owner !== payload.username) {
        //already checked to see if on user's list above, but not found in DB
        throw Error("URL from user list not found");
    }

    oldURL._id = newShort;
    if (newURL === undefined) {
        await urlsCollection.insertOne(oldURL);
    } else {
        if (newURL.owner !== payload.username || !newURL.deleted) {
            context.res = {
                status: 409,
                body: JSON.stringify({"msg": "New URL already exists"})
            };
            return;
        } else {
            await urlsCollection.updateOne({ _id: newShort }, { $set: oldURL })
        }
    }
    
    const deleteOld = {
        $set: {
            deleted: true,
            urlUID: new ObjectId(), //disassociate from old URL
            conditionals: "",
            urlCount: 0,
            firstPoint: -1,
            redirects: [] as number[],
        }
    }
    
    await urlsCollection.updateOne({ _id: oldShort }, deleteOld)
    
    const index = user.urls.indexOf(oldShort);
    user.urls[index] = newShort;

    const updateInList = {
        $set: {
            "urls.$": newShort
        },
    }
    
    await userCollection.updateOne({ _id: payload.username, "urls": oldShort }, updateInList)


    context.res = {
        status: 200,
        body: JSON.stringify("URL renamed")
    }

};

export default httpTrigger;