import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import type { Conditional } from "../types";
import axios from "axios";

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

    if (req.headers.authorization === "") {
        context.res = {
            status: 401,
            body: JSON.stringify("No token provided")
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
            body: JSON.stringify("Invalid token")
        };
        return;
    }


    if (payload === undefined || payload.username === undefined) {
        context.res = {
            status: 401,
            body: JSON.stringify("Invalid token")
        };
        return;
    }

    
    const parsedConditionals: Conditional[] = JSON.parse(conditionals);

    if (parsedConditionals.length > 100) {
        context.res = {
            status: 400,
            body: JSON.stringify("Too many URLs")
        };    
        return;
    }
    
    const urls: {url: string}[] = [];


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

        urls.push({"url": c.url});

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

    const GOOGLE_API_KEY = process.env["GOOGLE_API_KEY"];
    if (GOOGLE_API_KEY) { //if no key provided in .env, skip
        const apiUrl = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + GOOGLE_API_KEY;

        const body = {
            client: {
                clientId: "conditionalurl",
                clientVersion: "1.0.0"
            },
            threatInfo: {
                threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                platformTypes: ["ANY_PLATFORM"],
                threatEntryTypes: ["URL"],
                threatEntries: urls
            }
        }

        try {
            const response = await axios.post(apiUrl, body);
            if (response.data.matches) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"error": "Unsafe URL detected"})
                };
                return;
            }

        } catch (error) {
            console.log(error)
        }
    }
         


    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const container = client.database("conditionalurl").container("urls");

    const { resource } = await container.item(short, short).read();

    if (resource === undefined) {
        context.res = {
            status: 404,
            body: JSON.stringify("Short URL not found")
        };
        return;
    }

    if (resource.owner !== payload.username) {
        context.res = {
            status: 401,
            body: JSON.stringify("You do not own this URL")
        };
        return;
    }

    resource.conditionals = conditionals;
    resource.redirects = new Array(parsedConditionals.length).fill([]);
    resource.dataPoints = []

    await container.item(short, short).replace(resource);

    context.res = {
        status: 200,
        body: JSON.stringify(short)
    }

};

export default httpTrigger;