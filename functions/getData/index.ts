import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { Variables } from "../types";
import { createClient } from "redis";

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

    
    const variable = req.query.variable;
    
    if (variable === undefined || variable === "" || !Variables.includes(variable)) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Invalid variable provided"})
        };
        return;
    }
    
    let selectedUrl = parseInt(req.query.selectedUrl)
    if (selectedUrl === undefined || isNaN(selectedUrl)) {
        selectedUrl = -1;
    }

    if (payload === undefined || payload.username === undefined) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Invalid token"})
        };
        return;
    }
    const short = req.query.short.toLowerCase();
    
    if (short === undefined || short === "") {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "No short URL provided"})
        };
        return;
    }

    
    let page = 0;
    if (req.query.page !== undefined) {
        page = parseInt(req.query.page);

        if (isNaN(page) || page < 0) {
            page = 0;
        }
    }

    let pageSize = 10;
    if (req.query.pageSize !== undefined) {
        pageSize = parseInt(req.query.pageSize);

        if (isNaN(pageSize) || pageSize < 1) {
            pageSize = 10;
        }

        pageSize = Math.min(pageSize, 100)
    }
    

    let counts: {
        [key: string]: number
    } = {};

    let usingRedis = process.env["REDIS_HOST"] !== undefined && process.env["REDIS_PORT"] !== undefined && process.env["REDIS_PASSWORD"] !== undefined
    let redisClient;
    if (usingRedis) {
        try {
            redisClient = createClient({
                password: process.env["REDIS_PASSWORD"],
                socket: {
                    host: process.env["REDIS_HOST"],
                    port: parseInt(process.env["REDIS_PORT"])
                }
            });
            await redisClient.connect();
        } catch (error) {
            console.log(error)
            usingRedis = false;
        }
    }

    try {
        if (req.query.refresh === "true" || !usingRedis) {
            throw new Error("Force Refresh!")
        } else {
            redisClient.on('error', err => {throw new Error(err + " Fetch from DB")});

            const info = await redisClient.lRange(short + "_table", 0, 2)
            const redisVariable = info[0];
            const redisSelectedUrl = info[1];
            const owner = info[2];

            if (owner === undefined) {
                throw new Error("No data found. Fetch from DB");
            } else if (owner !== payload.username) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "You do not own this URL"})
                };
                return;
            }

            if (redisVariable !== variable || redisSelectedUrl === selectedUrl) {
                throw new Error("Different Data. Fetch fron DB");
            }
            
            const cachedData = await redisClient.lRange(short + "_table", 3, -1);
            counts = JSON.parse(cachedData);
        }

    } catch (error) {
        console.log("Fetching from DB")
        const key = process.env["COSMOS_KEY"];
        const endpoint = process.env["COSMOS_ENDPOINT"];
        
        const client = new CosmosClient({ endpoint, key });
        const container = client.database("conditionalurl").container("urls");

        
        const { resource } = await container.item(short, short).read();

        if (resource === undefined) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "Short URL not found"})
            };
            return;
        }

        if (resource.owner !== payload.username) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "You do not own this URL"})
            };
            return;
        }

        let i = 0;
        let lim = resource.redirects.length;

        if (selectedUrl > resource.redirects.length)
            selectedUrl = -1;

        if (selectedUrl >= 0)  { //if user just wants to see data for one url
            i = selectedUrl;
            lim = selectedUrl + 1;
        } 

        for (; i < lim; i++) {
            let data = resource.redirects[i][variable]
            /*
                "redirects": [
                    {
                        "count": 5,
                        "Language": {
                            "English": 5
                        }, ...
                    },
                    {
                        "count": 7,
                        "Language": {
                            "English": 3,
                            "Spanish": 4
                        }, ...
                    }
                ]
            */

            for (const key in data) {
                /* 
                    "Language": {
                        "English": 3,
                        "Spanish": 4
                    }, ...
                */
                if (counts[key] === undefined) {
                    counts[key] = data[key];
                } else {
                    counts[key] += data[key];
                }
            }
        }
        
        if (usingRedis) { //cache data for faster access
            try {
                await redisClient.del(short + "_table");
                await redisClient.rPush(short + "_table", [
                    variable, 
                    selectedUrl.toString(), 
                    resource.owner, 
                    JSON.stringify(counts)]
                );
            } catch (error) {
                console.log(error)
            }
        }
    }

    if (usingRedis)
        await redisClient.disconnect();

        
    let compare: (a: string, b: string) => number;
    switch (req.query.sort) {
        case "Increasing":
            compare = (a, b) => {
                if (counts[a] < counts[b])
                    return -1;
                else if (counts[a] > counts[b])
                    return 1;
                else 
                    return a.localeCompare(b);
            }
            break;

        case "Decreasing":
        default:
            compare = (a, b) => {
                if (counts[a] > counts[b])
                    return -1;
                else if (counts[a] < counts[b])
                    return 1;
                else
                    return a.localeCompare(b);
                    
            }
            break;
    }
    
    const sortedPaginatedData = Object.keys(counts)
                                .sort(compare)
                                .slice(page * pageSize, (page + 1) * pageSize)
                                .map((key) => {
                                    return {
                                        key: key,
                                        count: counts[key].toString()
                                    }
                                });


    for (let i = sortedPaginatedData.length; i < pageSize; i++) {
        sortedPaginatedData.push({
            key: "-",
            count: "-"
        });
        //pad with empty data to make sure the table is the same size
    }

    context.res = {
        status: 200,
        body: JSON.stringify({
            counts: sortedPaginatedData,
            pageCount: Math.ceil(Object.keys(counts).length / pageSize)
        })
    }
};


export default httpTrigger;
