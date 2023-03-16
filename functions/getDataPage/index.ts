import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { connectDB } from "../database"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { DataValue, Variables } from "../types";
import { createClient } from "redis";
import { ShortURL } from "../types";
import { ObjectId } from "mongodb";


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
    
    let selectedURL = parseInt(req.query.selectedURL)
    if (selectedURL === undefined || isNaN(selectedURL)) {
        selectedURL = -1;
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
    const extraPages = 8;
    const extendedPageStart = Math.max(0, page - extraPages / 2);
    const extendedPageSize = pageSize + extraPages * pageSize; 
    // cache adjacent pages in redis for faster access
    //
    //                     4___
    // 0___ 1___ 2___ 3___ 4___ 5___ 6___ 7___ 8___
    //
    //
    // If the start/end is reached, then the extra pages are added to the other direction
    //
    // 0___
    // 0___ 1___ 2___ 3___ 4___ 5___ 6___ 7___ 8___
                          
    
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

            const meta = await redisClient.lRange(short + "_table", 0, 1)
            
            if (meta.length === 0) {
                throw new Error("No cached data. Fetch from DB");   
            }

            const metadata = JSON.parse(meta[0]);

            const cachedVariable =  metadata["cacheVariable"];
            const cachedselectedURL =  metadata["cacheSelectedURL"];
            const cachedFirstPage =  metadata["cacheFirstPage"];
            const cachedLastPage =  metadata["cacheLastPage"];
            const cachedSortDirection =  metadata["cacheSortDirection"];
            const cacheOwner = metadata["cacheOwner"];
            pageCount =  metadata["cachePageCount"];

            if (cacheOwner === undefined ||
                variable !== cachedVariable ||
                selectedURL !== cachedselectedURL || 
                sortDirection !== cachedSortDirection ||
                page < cachedFirstPage ||
                page > cachedLastPage) {
                throw new Error("No data found. Fetch from DB");
            } else if (cacheOwner !== payload.username) {
                context.res = {
                    status: 401,
                    body: JSON.stringify({"msg": "You do not own this URL"})
                };

                await redisClient.disconnect();
                return;
            }
            
            const firstPage = Math.max(0, page - cachedFirstPage);
            const cachedData = await redisClient.lRange(short + "_table", firstPage * pageSize + 1, (firstPage + 1) * pageSize);

            counts = cachedData.map((d) => JSON.parse(d));
        }

    } catch (error) {
        fromCache = false;
        const client = await connectDB();
        const db = client.db("conditionalurl");
        const urlsCollection = db.collection<ShortURL>("urls");

        const url = await urlsCollection.findOne({_id: short});

        if (url === null) {
            context.res = {
                status: 404,
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

        if (url.firstPoint === -1) {
            context.res = {
                status: 200,
                body: JSON.stringify({
                    counts: new Array(pageSize).fill({key: "-", count: "-"}),
                    pageCount: 1,
                    fromCache: false,
                })
            };
            return;
        }

        const dpCollection = db.collection<DataValue>("values");
        let pipeline;
        
        if (usingRedis)
            pipeline = constructAggregate(variable, sortDirection, url.uid, selectedURL, url.urlCount,
                                            extendedPageStart * pageSize, extendedPageSize);
        else
            pipeline = constructAggregate(variable, sortDirection, url.uid, selectedURL, url.urlCount,
                                            page * pageSize, pageSize);

        const doc = await dpCollection.aggregate(pipeline).toArray();

        const data = doc[0].data;
        
        if (doc[0].metadata[0])
            pageCount = Math.ceil(doc[0].metadata[0].total / pageSize);
        else
            pageCount = 1;

        if (data.length === 0) {
            context.res = {
                status: 200,
                body: JSON.stringify({
                    counts: new Array(pageSize).fill({key: "-", count: "-"}),
                    pageCount: pageCount,
                    fromCache: fromCache
                })
            };
            return;
        }

        counts = data.map((v) => {
            return {
                key: v._id,
                count: v.count.toString()
            }
        })

        if (usingRedis) { //cache extra pages for faster access
            try {
                const lastCachedPage = Math.min(extendedPageStart + extraPages, pageCount);
                await redisClient.del(short + "_table");
                await redisClient.rPush(short + "_table", [
                    JSON.stringify({
                        cacheVariable: variable,
                        cacheSelectedURL: selectedURL,
                        cacheFirstPage: extendedPageStart,
                        cacheLastPage: lastCachedPage,
                        cacheSortDirection: sortDirection,
                        cacheOwner: url.owner,
                        cachePageCount: pageCount, 
                    }),
                    ...counts.map((d) =>  JSON.stringify(d))
                ]);

                const firstPage = Math.max(0, page - extendedPageStart);
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


function constructAggregate(variable: string, sortDirection: 1 | -1, urlUID: ObjectId, selectedURL: number, numConditions: number,
                            skip: number, limit: number) {

    if (selectedURL === -1) {
        return [
            {
                $match: {
                    urlUID: urlUID,
                    var: variable,
                }
            },
            {
                $project: {
                    val: 1,
                    total: { $add: 
                        new Array(numConditions).fill("").
                        map((_, i) => {
                            return {
                                $cond: [
                                    { $ifNull: [ "$" + i, false ], },
                                    "$" + i,
                                    0
                                ]
                            }
                        }) 
                    }
                }
            },
            {
                $group: {
                    _id: "$val",
                    count: { $sum: "$total" }
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
                    data: [ { $skip: skip }, { $limit: limit } ]
                }
            }
        ]
    } else {
        return [
            {
                $match: {
                    urlUID: urlUID,
                    [selectedURL]: { $exists: true },
                    var: variable,
                }
            },
            {
                $group: {
                    _id: "$val",
                    count: { $sum: "$" + selectedURL }
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
                    data: [ { $skip: skip }, { $limit: limit } ]
                }
            }
        ]
    }
    
}


export default httpTrigger;

