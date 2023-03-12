import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { connectDB } from "../database"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { createClient, RedisClientType } from 'redis';
import { URL } from "../createUrl";
import { Collection, ObjectId } from "mongodb";

export type DataPoint = {
    _id: ObjectId,
    urlUID: ObjectId,
    i: number, // index of redirected
    owner: string
    values: string[]
};


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
    
    let span: number;
    switch (req.query.span) {
        case "hour":
            span = 60;
            break;
        case "day":
            span = 1440;
            break;
        case "min":
        default:
            span = 1;
            break;
    }
    
    let limit: number;
    if (req.query.limit === undefined || req.query.limit === "undefined") {
        limit = 30;
    } else {
        limit = Math.min(100, parseInt(req.query.limit));
    }

    let start: number;
    if (req.query.start === undefined || req.query.start === "undefined") {
        start = Math.floor(Date.now() / 60000) - span * limit; //make now the rightmost point
    } else {
        start = Math.max(parseInt(req.query.start), new Date("2020-01-01").getTime() / 60000);
    }

    //round down to nearest span
    start = start - start % span; 
    const end = start + span * limit;


    //cache an extended range in redis
    //           ____
    // ____ ____ ____ ____ ____
    const extendedLimit = limit * 5;
    const extendedStart = start - 2 * limit * span;
    const extendedEnd = extendedStart + extendedLimit * span

    
    let points: string[];
    let earliestPoint = "";

    //redis caching if env vars are set (and span > 1 since its unnecessary to cache by the minute)
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
            //if user requested a refresh, or no creds provided
            throw new Error("Force Refresh!")
        } else {
            redisClient.on('error', err => {throw new Error(err + " Fetch from DB")});

            const info = await redisClient.lRange(short + "_graph", 0, 4)

            
            if (info.length === 0) {
                throw new Error("No cached data. Fetch from DB");   
            }

            const cacheSpan = parseInt(info[0]);
            const cacheStart = parseInt(info[1]);
            const cacheEnd = parseInt(info[2]);
            const cacheFirstPoint = parseInt(info[3])
            const username = info[4];

            if (username !== payload.username) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "You do not own this URL"})
                };

                await redisClient.disconnect();
                return;
            }

            if (cacheSpan !== span || start < cacheStart || end > cacheEnd) {
                throw new Error("Data outside cache requested. Fetch from DB");
            }

            earliestPoint = new Date(cacheFirstPoint * 60000).toISOString()

            const cachedPoints = await redisClient.lRange(short + "_graph", 5, -1);

            const i = (start - cacheStart) / span
            points = cachedPoints.slice(i, i + limit);
        }
        
    } catch (error) { //error while fetching from redis, or force refresh, or redis not used
        fromCache = false;
        const client = await connectDB();
        const db = client.db("conditionalurl");

        const urlsCollection = db.collection<URL>("urls");
        const url = await urlsCollection.findOne({_id: short})

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

        earliestPoint = new Date(url.firstPoint * 60000).toISOString();

        //data is split into 3 collections to increase aggregate speed
        let collection: Collection;
        if (span === 1440) {
            collection = db.collection("datadays");
        } else if (span === 60) {
            collection = db.collection("datahours");
        } else
            collection = db.collection("datamins");

        //construct an aggregate query to count points in DB.
        //if usingRedis, then extend the range to cache more points
        let pipeline;

        if (usingRedis) {
            pipeline = constructAggregate(extendedStart, extendedLimit, span, url.uid);
            points = new Array(extendedLimit).fill("0")
        } else {
            pipeline = constructAggregate(start, limit, span, url.uid);
            points = new Array(limit).fill("0")
        }
        
        const docs = await collection.aggregate(pipeline).toArray();

        Object.keys(docs).forEach((key) => {
            const info = docs[parseInt(key)]

            //index of the point where points[0] = start, points[1] = start + span...
            let i: number;
            if (span === 1440) {
                i = Math.floor(parseInt(info._id) - (usingRedis ? extendedStart : start) / 1440);
            } else if (span === 60) {
                i = Math.floor(parseInt(info._id) - (usingRedis ? extendedStart : start) / 60);
            } else
                i = Math.floor(parseInt(info._id) - (usingRedis ? extendedStart : start));
    

            points[i] = info.count.toString()
        })
    

        if (usingRedis) { //cache extended range for faster access of nearby data
            try {
                const cachedData: string[] = [
                    span.toString(), //some meta data to verify cache should be used and user is correct
                    extendedStart.toString(),
                    extendedEnd.toString(),
                    url.firstPoint.toString(),
                    url.owner,
                    ...points
                ]

                await redisClient.del(short + "_graph"); //delete old cache
                await redisClient.rPush(short + "_graph", cachedData);
            } catch (error) {
                console.log(error)
            }

            //only return the points in the range requested
            points = points.slice(2 * limit, 3 * limit)
        }
    }



    if (usingRedis)
        await redisClient.disconnect();
        
    context.res = {
        status: 200,
        body: JSON.stringify({
            dataPoints: points,
            earliestPoint,
            fromCache
        })
    }

};


function constructAggregate(start: number, limit: number, span: number, urlUID: ObjectId) {
    let field;
    if (span === 1440) {
        field = "unixDay";
        start = Math.floor(start / 1440);
        span = Math.floor(span / 1440);
    } else if (span === 60) {
        field = "unixHour";
        start = Math.floor(start / 60);
        span = Math.floor(span / 60);
    } else {
        field = "unixMin";
    }

    return [
        { 
            $match: {
                [field]: { "$gte": start, "$lt": start + limit * span },
                urlUID: urlUID
            }
        },
        {
            $bucket: { 
                groupBy: "$" + field,
                boundaries: new Array(limit + 1).fill(0).map((_, i) => start + i * span),
                output: {
                    "count": { $sum: "$count" }
                }
            }
        }
    ]
    
}
export default httpTrigger;
