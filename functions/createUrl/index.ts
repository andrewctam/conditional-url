import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';

import type { Conditional } from "../types";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const short = req.body.short;
    const conditionals = req.body.conditionals;

    if (short === "" || !/^[a-zA-Z0-9]*$/.test(short) || short.startsWith("http")) {
        context.res = {
            status: 400,
            body: JSON.stringify("Short URL contains invalid characters")
        };    
        return;
    } 

    const parsedConditionals: Conditional[] = JSON.parse(conditionals);
    console.log(parsedConditionals)
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
    const container = client.database("conditionalurl").container("urls");

    try {
        await container.items.create({
            id: short,
            short,
            conditionals
        });

        context.res = {
            status: 200, 
            body: JSON.stringify(short)
        }
    } catch (error) {
        context.res = {
            status: 409,
            body: JSON.stringify("Short URL already exists")
        }
    }




};

export default httpTrigger;