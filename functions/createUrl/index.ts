import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import type { Conditional } from "../types";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const short = req.body.short.toLowerCase();
    const conditionals = req.body.conditionals;

    if (short === "" || !/^[a-zA-Z0-9]*$/.test(short) || short.startsWith("http")) {
        context.res = {
            status: 400,
            body: JSON.stringify("Short URL contains invalid characters")
        };    
        return;
    } 

    const parsedConditionals: Conditional[] = JSON.parse(conditionals);
    for (let i = 0; i < parsedConditionals.length; i++) {
        const c = parsedConditionals[i];
        if (c.url == "" ||
            !c.url.startsWith("http://") && !c.url.startsWith("https://") ||
            c.conditions.length == 0 && i != parsedConditionals.length - 1 ||
            c.url.startsWith(`https://conditionalurl.web.app`)
        ) {
            context.res = {
                status: 400,
                body: JSON.stringify("Error with a conditional url")
            };    
            return;
        } 

        for (let j = 0; j < c.conditions.length; j++) {
            const condition = c.conditions[j];
            if (condition.value === "" && condition.variable !== "URL Parameter") { //url param value can be empty
                context.res = {
                    status: 400,
                    body: JSON.stringify("Error with a conditional url")
                };    
                return;
            } else if (condition.variable === "URL Parameter") {
                if (!condition.param || !/^[a-zA-Z0-9]*$/.test(condition.param)) {
                    context.res = {
                        status: 400,
                        body: JSON.stringify("Error with a conditional url")
                    };    
                    return;
                }
            }
        }
    }

    dotenv.config();
    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });

    let owner: string | null = null;
    if (req.headers.authorization && req.headers.authorization !== "NONE") {
        const accessToken = req.headers.authorization.split(" ")[1];

        let payload;
        try {
            payload = jwt.verify(accessToken, process.env.JWT_SECRET);
            if (payload === undefined || payload.username === undefined) {
                throw new Error("Invalid token");
            }
        } catch (error) {
            context.res = {
                status: 401,
                body: JSON.stringify("Invalid token")
            };
            return;
        }

        owner = payload.username;
    }



    const userContainer = client.database("conditionalurl").container("users");
    let userResource = undefined;
    if (owner) {
        const { resource: user } = await userContainer.item(owner, owner).read();
        userResource = user;

        if (userResource === undefined) {
            context.res = {
                status: 400,
                body: JSON.stringify("User not found")
            };
            return;
        }

        userResource.urls.push(short);
        userResource.urlCount++;
    } 

    const urlsContainer = client.database("conditionalurl").container("urls");
    const { resource: existing } = await urlsContainer.item(short, short).read();

    if (existing !== undefined) {
        //owner deleted an old url and is now trying to recreate it
        if (existing.deleted && existing.owner !== "" && existing.owner === owner) {
            existing.conditionals = conditionals;
            existing.redirects = new Array(parsedConditionals.length).fill([]);
            existing.dataPoints = [];
            existing.deleted = false;

            await client.database("conditionalurl").container("urls").item(short, short).replace(existing);

            context.res = {
                status: 200,
                body: JSON.stringify(short)
            }

            await userContainer.item(owner, owner).replace(userResource);
            return;

        } else { 
            //url already exists, or deleted url and not the owner
            context.res = {
                status: 409,
                body: JSON.stringify("Short URL already exists")
            }

            return;
        }
    } else {
        //url doesn't exist, create it
        await urlsContainer.items.create({
            id: short,
            short,
            conditionals,
            owner: owner ?? "",
            redirects: new Array(parsedConditionals.length).fill([]),
            dataPoints: [],
            deleted: false

        });    

        context.res = {
            status: 200, 
            body: JSON.stringify(short)
        }
        //if logged in, update the user's list
        if (userResource) {
            await userContainer.item(owner, owner).replace(userResource);
        }
        return;
    }


};

export default httpTrigger;