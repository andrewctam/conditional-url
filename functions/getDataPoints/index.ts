import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { connectDB } from "../database"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { createClient, RedisClientType } from 'redis';
import { URL } from "../createUrl";
import { ObjectId } from "mongodb";

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
            body: JSON.stringify({"msg": "Missing infromation"})
        };
        return;
    }
    
    let span: number;
    if (req.query.span === undefined || req.query.span === "undefined") {
        span = 1;
    } else {
        span = Math.min(10080, parseInt(req.query.span));
    }
    
    let limit: number;
    if (req.query.limit === undefined || req.query.limit === "undefined") {
        limit = 30;
    } else {
        limit = Math.min(10000, parseInt(req.query.limit));
    }

    let start: number;
    if (req.query.start === undefined || req.query.start === "undefined") {
        start = Math.floor(Date.now() / 60000) - span * (limit - 2)
    } else {
        start = Math.max(15778380, parseInt(req.query.start));
    } //26297280 is 1/1/2000

    //round down to nearest span
    start = start - start % span; 

    const end = start + span * limit;

    const extendedStart = start - limit * span;
    const extendedEnd = extendedStart + 3 * limit * span

    
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

            points = getPointsInRange(start, cachedPoints, cacheStart, limit, span);
        }
    } catch (error) {
        fromCache = false;
        const client = await connectDB();
        const db = client.db("conditionalurl");

        const urlsCollection = db.collection<URL>("urls");
        
        const url = await urlsCollection.findOne({_id: short})

        if (url === null) {
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

        earliestPoint = new Date(url.firstPoint * 60000).toISOString();


        let collection;
        if (span === 1440) {
            collection = db.collection("datadays");
        } else if (span === 60) {
            collection = db.collection("datahours");
        } else
            collection = db.collection("datamins");

        //construct an aggregate query to count points in DB.
        //if usingRedis, then extend the range to cache more points
        let aggregate;

        if (usingRedis) {
            //extend the range
            //      ____
            // ____ ____ ____
        
            aggregate = constructAggregate(extendedStart, limit * 3, span, url.uid);
            points = new Array(3 * limit).fill("0")
        } else {
            aggregate = constructAggregate(start, limit, span, url.uid);
            points = new Array(limit).fill("0")
        }
        
        const docs: {
            _id: string,
            count: number
        }[] = await collection.aggregate(aggregate).toArray();

        Object.keys(docs).forEach((key) => {
            const info = docs[parseInt(key)]

            let i;
            if (span === 1440) {
                i = Math.floor(parseInt(info._id) - (usingRedis ? extendedStart : start) / 1440);
            } else if (span === 60) {
                i = Math.floor(parseInt(info._id) - (usingRedis ? extendedStart : start) / 60);
            } else
                i = Math.floor(parseInt(info._id) - (usingRedis ? extendedStart : start));
    

            points[i] = info.count.toString()
        })
    

        if (usingRedis) { //cache data for faster access
            try {
                const cachedData: string[] = [
                    span.toString(),
                    extendedStart.toString(),
                    extendedEnd.toString(),
                    url.firstPoint.toString(),
                    url.owner,
                    ...points
                ]

                await redisClient.del(short + "_graph");
                await redisClient.rPush(short + "_graph", cachedData);
            } catch (error) {
                console.log(error)
            }

            points = points.slice(limit, 2 * limit);

        }
    }



    if (usingRedis)
        await redisClient.disconnect();
        
    context.res = {
        status: 200,
        body: JSON.stringify({
            dataPoints: points,
            span,
            start,
            limit,
            earliestPoint,
            fromCache
        })
    }

};


function getPointsInRange(first: number, dataPoints: string[], start: number, limit: number, span: number) {
    if (span === 1440) {
        first = Math.floor(first / 1440);
        start = Math.floor(start / 1440);
        span = Math.floor(span / 1440);
    } else if (span === 60) {
        first = Math.floor(first / 60);
        start = Math.floor(start / 60);
        span = Math.floor(span / 60);
    }

    const outputPoints = []

    let i = 0;

    //if first req point is less than first data point
    while (first < start) {
        outputPoints.push("0");
        first += span

        if (outputPoints.length >= limit)
            return outputPoints;
    }

    //if first data point is before first req point
    while (start < first)  {
        i ++;
        start += span;

        if (i >= dataPoints.length)
            return new Array(limit).fill("0")
    }

    //copy over
    while (outputPoints.length < limit && i < dataPoints.length) {
        outputPoints.push(dataPoints[i++]);
    }

    //padding at end
    while (outputPoints.length < limit) {
        outputPoints.push("0");
    }

    return outputPoints
}



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
