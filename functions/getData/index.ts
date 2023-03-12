import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { connectDB } from "../database"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { Variables } from "../types";
import { createClient } from "redis";
import { URL } from "../createUrl";
import { DataPoint } from "../getDataPoints";


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

    let sortDirection: 1 | -1 = 1;
    if (req.query.sort === "Decreasing")
        sortDirection = -1;

    
    const pageSize = 10;
    // cache some adjacent pages in redis for faster access
    //                          5___
    // 0___ 1___ 2___ 3___ 4___ 5___ 6___ 7___ 8___ 9___ 10___
    const extraPages = 5; //in one direction
    const extendedPage = Math.max(0, page - extraPages);
    const extendedPageSize = pageSize + 2 * extraPages; 
    
    let pageCount = 0;
    let counts: { key: string, count: string }[];

    let usingRedis = process.env["REDIS_HOST"] !== undefined && process.env["REDIS_PORT"] !== undefined && process.env["REDIS_PASSWORD"] !== undefined
    let redisClient;
    let fromCache = true;
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

            const info = await redisClient.lRange(short + "_table", 0, 5)
            const owner = info[0];
            const cachedSortDirection = parseInt(info[1]);
            const cachedVariable = info[2];
            const cachedFirstPage = parseInt(info[3]);
            const cachedLastPage = parseInt(info[4]);
            pageCount = parseInt(info[5]);

            if (owner === undefined ||
                variable !== cachedVariable ||
                sortDirection !== cachedSortDirection ||
                page < cachedFirstPage ||
                page > cachedLastPage) {
                throw new Error("No data found. Fetch from DB");
            } else if (owner !== payload.username) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "You do not own this URL"})
                };

                await redisClient.disconnect();
                return;
            }
            
            const cachedData = await redisClient.lRange(short + "_table", 6, -1);

            const firstPage = Math.max(0, page - cachedFirstPage);
            counts = cachedData.slice(firstPage * pageSize, (firstPage + 1) * pageSize)
                               .map((d) => JSON.parse(d));
        }

    } catch (error) {
        fromCache = false;
        const client = await connectDB();
        const db = client.db("conditionalurl");
        const urlsCollection = db.collection<URL>("urls");

        const url = await urlsCollection.findOne({_id: short});

        if (url === undefined) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "Short URL not found"})
            };
            return;
        }

        if (url.owner !== payload.username) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "You do not own this URL"})
            };
            return;
        }

        const dpCollection = db.collection<DataPoint>("datapoints");
        const pipeline = [
            {
                $match: {
                    urlUID: url.uid,
                    i: selectedUrl === -1 ? {$exists: true} : selectedUrl
                }
            },
            {
                $project: {
                    value: { $arrayElemAt: ["$values", Variables.indexOf(variable)] }
                }
            },
            {
                $group: {
                    _id: "$value",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    count: sortDirection,
                    _id: 1
                }
            },
            {
                $facet: {
                    metadata: [ { $count: "total" } ],
                    data: usingRedis ?
                        [ { $skip: extendedPage * extendedPageSize }, { $limit: extendedPageSize } ] : 
                        [ { $skip: page * pageSize }, { $limit: pageSize } ]
                }
            }
        ]

        const doc = await dpCollection.aggregate(pipeline).toArray();
        const data = doc[0].data;
        pageCount = Math.ceil(doc[0].metadata[0].total / pageSize);

        counts = data.map((v) => {
            return {
                key: v._id,
                count: v.count.toString()
            }
        })

        if (usingRedis) { //cache extra pages for faster access
            try {
                const lastCachedPage = Math.max(page + extraPages, pageCount);
                await redisClient.del(short + "_table");
                await redisClient.rPush(short + "_table", [
                    url.owner,
                    sortDirection.toString(),
                    variable, //variable cached
                    extendedPage.toString(), //first page cached
                    lastCachedPage.toString(), //last page cached
                    pageCount.toString(), 
                    ...counts.map((d) =>  JSON.stringify(d))
                ]);

                const firstPage = Math.max(0, page - extendedPage);
                counts = counts.slice(firstPage * pageSize, (firstPage + 1) * pageSize);
            } catch (error) {
                console.log(error)
            }
        }
    }

    if (usingRedis)
        await redisClient.disconnect();
    

    for (let i = counts.length; i < pageSize; i++) {
        //pad with empty data to make sure the table is the same size
        counts.push({ key: "-", count: "-" });
    }

    context.res = {
        status: 200,
        body: JSON.stringify({
            counts: counts,
            pageCount: pageCount,
            fromCache: fromCache
        })
    }
};


export default httpTrigger;
