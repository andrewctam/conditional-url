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
    unixMin: number,
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

    let end = start + span * limit;

    
    let points: string[];
    let earliestPoint = "";

    //redis caching if env vars are set (and span > 1 since its unnecessary to cache by the minute)
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

            const info = await redisClient.lRange(short + "_graph", 0, 3)

            
            if (info.length === 0) {
                throw new Error("No cached data. Fetch from DB");   
            }

            const cacheSpan = parseInt(info[0]);
            const cacheStart = parseInt(info[1]);
            const cacheEnd = parseInt(info[2]);
            const username = info[3];

            if (username !== payload.username) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "You do not own this URL"})
                };

                await redisClient.disconnect();
                return;
            }

            if (cacheSpan !== span || end < cacheStart || start > cacheEnd) {
                throw new Error("Data outside cache requested. Fetch from DB");
            }

            //get indexes to get cached data, offset of 4 for meta data
            const firstIndex = 4 + Math.floor((Math.max(start, cacheStart) - cacheStart) / cacheSpan);
            points = await redisClient.lRange(short + "_graph", firstIndex, firstIndex + limit - 1);

            if (start < cacheStart && points.length < limit) {
                const numPoints = Math.min(Math.floor((cacheStart - start) / span), limit - points.length);
                points = new Array(numPoints).fill("0").concat(points);
            }
            
            if (points.length < limit) {
                points = points.concat(new Array(limit - points.length).fill("0"))
            }

            earliestPoint = new Date(cacheStart * 60000).toISOString()
        }
    } catch (error) {
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

        const dpCollection = db.collection<DataPoint>("datapoints");

        const dataPoints = await dpCollection.find({urlUID: url.uid})
                                             .sort({unixMin: 1})
                                             .toArray();


        if (dataPoints.length === 0) {
            context.res = {
                status: 200,
                body: JSON.stringify({"msg": "No Data Found"})
            }
            return;
        }

        earliestPoint = new Date(dataPoints[0].unixMin * 60000).toISOString()
        
        if (usingRedis) { //cache data for faster access
            points = groupPoints(dataPoints[0].unixMin, span, limit, dataPoints, true);

            const cachedData: string[] = [
                    span.toString(),
                    dataPoints[0].unixMin.toString(), 
                    dataPoints[dataPoints.length - 1].unixMin.toString(),
                    url.owner, 
                    ...points
                ]

            try {
                await redisClient.del(short + "_graph");
                await redisClient.rPush(short + "_graph", cachedData);
            } catch (error) {
                console.log(error)
            }

            const firstIndex = Math.floor((start - dataPoints[0].unixMin) / span);

            points = points.slice(
                    Math.max(firstIndex, 0),
                    Math.min(firstIndex + limit, points.length));

            if (start < dataPoints[0].unixMin && points.length < limit) {
                const numPoints = Math.min(Math.floor((dataPoints[0].unixMin - start) / span), limit - points.length);
                points = new Array(numPoints).fill("0").concat(points);
            }
            
            if (points.length < limit) {
                points = points.concat(new Array(limit - points.length).fill("0"))
            }

        } else { //just get requested data
            points = groupPoints(start, span, limit, dataPoints);
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
        })
    }

};



function groupPoints(start: number, span: number, limit: number, dataPoints: DataPoint[], allData: boolean = false): string[] {
    let index;
    let currentSpan;
    let points: string[] = []

    if (start > dataPoints[dataPoints.length - 1].unixMin) {
        //greater than all, so just send all 0s
        return new Array(limit).fill("0");
        
    } else if (start < dataPoints[0].unixMin) {
        const spansBeforeStart = Math.floor((dataPoints[0].unixMin - start) / span);

        if (spansBeforeStart >= limit) {
            //if there are more spans than the limit, then just send all 0s
            return new Array(limit).fill("0");
        } else {
            //otherwise, send padding of 0s and then the data
            points = new Array(spansBeforeStart).fill("0");
        }

        currentSpan = dataPoints[0].unixMin;
        index = 0;
    } else if (start === dataPoints[0].unixMin) {
        index = 0;
        currentSpan = dataPoints[0].unixMin;
    } else {
        index = getFirstGEQ(dataPoints, start);
        if (start < dataPoints[index].unixMin) {
            const spansBeforeStart = Math.floor((dataPoints[index].unixMin - start) / span);
            if (spansBeforeStart >= limit) {
                //if there are more spans than the limit, then just send all 0s
                return new Array(limit).fill("0");
            }

            points = new Array(spansBeforeStart).fill("0");
        }
        currentSpan = dataPoints[index].unixMin;
    }
    let compare: (a: number, b: number) => boolean;
    switch (span) {
        case 1:
            compare = (a, b) => { return a === b; } //already stored in unix time in minutes
            break;
        default:
            //in span => [a, a + span)
            compare = (a, b) => {
               return a <= b && b < a + span;
            }
            break;
    }

    let count = 0;
    currentSpan -= currentSpan % span
    //if limit is -1, then get all data in the dataPoints
    //group the data points into the same time spans
    while ((allData || points.length < limit) && index < dataPoints.length) {
        const nextPoint = dataPoints[index];

        if (compare(currentSpan, nextPoint.unixMin)) {
            //if the two times are the same span, add the count
            count++;
            index++;
        } else {
            //once we reach a new time span, push the sum and reset
            points.push(count.toString());
            count = 0;

            currentSpan += span;
        }
    }

    //push the last span, and pad extra zeroes if the end of array is reached
    if (allData) {
        points.push(count.toString());
    } else {
        while (points.length < limit) { 
            points.push(count.toString());
            currentSpan += span;
            count = 0;
        }
    }

    return points;
}

//search for the index of the first element with unixMinutes start,
//or the closest element that is greater than or equal to start
function getFirstGEQ(dataPoints: DataPoint[], start: number) {
    let low = 0;
    let high = dataPoints.length - 1;

    if (dataPoints.length === 0 || dataPoints[high].unixMin < start) {
        return -1;
    }

    while (low < high) {
        let mid = Math.floor((high + low) / 2);
        if (dataPoints[mid].unixMin < start) {
            low = mid + 1;
        } else if (dataPoints[mid].unixMin === start && (mid == 0 || dataPoints[mid - 1].unixMin < start)) {
            return mid;
        } else {
            high = mid;
        }
    }

    return low;
}



export default httpTrigger;
