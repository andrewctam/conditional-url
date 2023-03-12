import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { connectDB } from "../database"
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { User } from "../signUp";
import { DataPoint } from "../getDataPoints";
import { ObjectId } from "mongodb";
import { URL } from "../createUrl";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username;
    const password = req.body.password;
    const alsoDeleteURLs = req.body.alsoDeleteURLs ?? true;

    if (username === undefined || username === "" || password === undefined || password === "") {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Incorrect password"})
        }
        return;
    }


    dotenv.config();

    const client = await connectDB();
    const db = client.db("conditionalurl");

    const usersCollection = db.collection<User>("users")
    
    const user = await usersCollection.findOne({ _id: username });

    if (user === null) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        }
        return;
    }

    if (await bcrypt.compare(password, user.hashedPassword)) {
        await usersCollection.deleteOne({ _id: username })
    } else {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Incorrect password"})
        }
        return;
    }

    const urlsCollection = db.collection<URL>("urls");
    if (alsoDeleteURLs) {
        const deleteUrl = {
            $set: {
                deleted: true,
                uid: new ObjectId(), //disassociate the data with this url
                redirects: [],
                conditionals: "",
                urlCount: 0,
                owner: "" //disassociate the url from the user
            }
        }

        await urlsCollection.updateMany({owner: username}, deleteUrl);
        
    } else {
        const removeOwner = {
            $set: {
                owner: "" //disassociate the url from the user
            }
        }

        await urlsCollection.updateMany({owner: username}, removeOwner);
    }

    context.res = {
        status: 200,
        body: JSON.stringify("Deleted Account")
    }

};

export default httpTrigger;