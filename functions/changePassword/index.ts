import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

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
    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    const client = new CosmosClient({ endpoint, key });

    const container = client.database("conditionalurl").container("users");

    const { resource } = await container.item(username, username).read();

    if (resource === undefined) {
        context.res = {
            status: 404,
            body: JSON.stringify({"msg": "User not found"})
        }
        return;
    }

    if (await bcrypt.compare(oldPassword, resource.hashedPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        resource.hashedPassword = hashedPassword;
        await container.item(username, username).replace(resource);

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