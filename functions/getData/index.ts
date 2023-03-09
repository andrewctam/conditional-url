import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { Data, Variables } from "../types";
import { createClient } from "redis";


type VarValueCounts = { [key: string]: number }

type DataTables = {
    [key in typeof Variables[number]]: VarValueCounts
}[]

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

    
    const variable = req.query.variable as typeof Variables[number];
    
    if (variable === undefined || !Variables.includes(variable)) {
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
    

    let dataTable: DataTables;

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

            const info = await redisClient.lRange(short + "_table", 0, 0)
            const owner = info[0];

            if (owner === undefined) {
                throw new Error("No data found. Fetch from DB");
            } else if (owner !== payload.username) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "You do not own this URL"})
                };

                await redisClient.disconnect();
                return;
            }
            
            const cachedData = await redisClient.lRange(short + "_table", 1, -1);
            dataTable = JSON.parse(cachedData);
        }

    } catch (error) {
        console.log("Fetching from DB")
        const key = process.env["COSMOS_KEY"];
        const endpoint = process.env["COSMOS_ENDPOINT"];
        
        const client = new CosmosClient({ endpoint, key });
        const urlsContainer = client.database("conditionalurl").container("urls");
        const { resource: urlResource } = await urlsContainer.item(short, short).read();

        if (urlResource === undefined) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "Short URL not found"})
            };
            return;
        }

        if (urlResource.owner !== payload.username) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "You do not own this URL"})
            };
            return;
        }


        const dataPointsContainer = client.database("conditionalurl").container("dataPoints");
        const { resources: dataPoints } = await dataPointsContainer.items
                .query(`SELECT * FROM c WHERE c.short = "${short}"`).fetchAll();


        dataTable = new Array(urlResource.urlCount).fill(null).map(_ => { 
            return Object.fromEntries(Variables.map(v => [v, {}])) as DataTables[number]
        });


        for (const datum of dataPoints) {
            const dataForUrl = dataTable[datum.info.url as number];

            Variables.forEach((variable, i) => {
                const observedVal = datum.values[i];

                if (dataForUrl[variable][observedVal] === undefined)
                    dataForUrl[variable][observedVal] = 1;
                else
                    dataForUrl[variable][observedVal] += 1;     
            })
        }
        

        if (usingRedis) { //cache data for faster access
            try {
                await redisClient.del(short + "_table");
                await redisClient.rPush(short + "_table", [
                    urlResource.owner, 
                    JSON.stringify(dataTable)
                ]);
            } catch (error) {
                console.log(error)
            }
        }
    }

    if (usingRedis)
        await redisClient.disconnect();

    let counts: VarValueCounts = {};

    if (selectedUrl === -1) {
        for (const urlData of dataTable) {
            for (const [key, value] of Object.entries(urlData[variable])) {
                if (counts[key] === undefined)
                    counts[key] = value;
                else
                    counts[key] += value;
            }
        }
    } else
        counts = dataTable[selectedUrl][variable];

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
