import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { connectDB } from "../database";
import { User } from "../signUp";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const username = req.body.username.toLowerCase();
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;

    if (!username || !oldPassword || !newPassword || oldPassword.length < 8 || newPassword.length < 8) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Incorrect password"})
        };    
        return;
    }

    dotenv.config();
    const client = await connectDB();
    const db = client.db("conditionalurl");

    const usersCollection = db.collection<User>("users")

    const user = await usersCollection.findOne({ _id: username })

    if (user === null) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        }
        return;
    }

    if (await bcrypt.compare(oldPassword, user.hashedPassword)) {
        const updatePassword = {
            $set: {
                hashedPassword: await bcrypt.hash(newPassword, 10)
            }
        }
        
        await usersCollection.updateOne({_id: username}, updatePassword)

        context.res = {
            status: 200,
            body: JSON.stringify("Password successfully changed")
        }
        return;
    } else {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Incorrect password"})
        }
        return;
    }
};


export default httpTrigger;