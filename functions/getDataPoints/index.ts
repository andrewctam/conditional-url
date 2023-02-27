import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
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

    const key = process.env["COSMOS_KEY"];
    const endpoint = process.env["COSMOS_ENDPOINT"];
    
    const client = new CosmosClient({ endpoint, key });
    const container = client.database("conditionalurl").container("urls");

    const short = req.query.short.toLowerCase();


    if (short === undefined || short === "") {
        context.res = {
            status: 400,
            body: JSON.stringify("Missing infromation")
        };
        return;
    }


    const { resource } = await container.item(short, short).read();

    if (resource === undefined) {
        context.res = {
            status: 400,
            body: JSON.stringify("Short URL not found")
        };
        return;
    }

    if (resource.owner !== payload.username) {
        context.res = {
            status: 400,
            body: JSON.stringify("You do not own this URL")
        };
        return;
    }

    const dataPoints = resource.dataPoints;

    if (dataPoints.length === 0) {
        context.res = {
            status: 200,
            body: JSON.stringify({
                dataPoints: [],
                firstPoint: null
            })
        }

        return;
    }

    let span: number;
    if (req.query.span === undefined || req.query.span === "undefined") {
        span = 1;
    } else {
        span = parseInt(req.query.span);
    }
    
    let limit: number;
    if (req.query.limit === undefined || req.query.limit === "undefined") {
        limit = 30;
    } else {
        limit = Math.min(100, parseInt(req.query.limit));
    }

    let start: number;
    if (req.query.start === undefined || req.query.start === "undefined") {
        start = Math.floor(Date.now() / 60000) - span * limit * 60000
    } else {
        start = parseInt(req.query.start);
    }

    let index;
    let currentSpan;
    if (start > dataPoints[dataPoints.length - 1].time) {
        //greater than all, so just send all 0s
        const allZeroes = new Array(limit).fill(null).map((_, i) => {
            return {
                spanStart: new Date(start * 60000 + i * span * 60000).toISOString(),
                count: 0
            }
        })
        
        context.res = {
            status: 200,
            body: JSON.stringify({
                dataPoints: allZeroes,
                earliestPoint: new Date(dataPoints[0].time * 60000).toISOString(),
            })
        }
        
        return;
    } else if (start < dataPoints[0].time) {
        //convert to 12AM of first point
        currentSpan = new Date((dataPoints[0].time - dataPoints[0].time % 1440) * 60000);
        index = 0
    } else  {
        index = binarySearchForGEQ(dataPoints, start);
        currentSpan = new Date(dataPoints[index].time * 60000); //minutes to milliseconds
    }
    let compare: (a: number, b: number) => boolean;
    switch (span) {
        case 1:
            compare = (a, b) => { return a === b; } //already stored in unix time in minutes
            break;
        default:
            //in span => [a, a + span)
            compare = (a, b) => {
               return b >= a && b - a <= span * 60000; //minutes to milliseconds
            }
            break;
    }

    /*
    console.log(dataPoints.map((d) => {
        return {
            ms: d.time,
            time: new Date(d.time * 60000),
            count: d.count
        }
    }))
    */
    
    const points: {
        spanStart: string,
        count: number
    }[] = [];


    let sum = 0;
    //group the data points into the same time spans
    while (points.length < limit && index < dataPoints.length) {
        const nextPoint = dataPoints[index];

        if (compare(currentSpan.getTime(), nextPoint.time * 60000)) {
            //if the two times are the same span, add the count
            sum += nextPoint.count;
            index++;
        } else {
            //once we reach a new time span, push the sum and reset
            points.push({
                spanStart: currentSpan.toISOString(),
                count: sum
            });
            sum = 0;

            currentSpan.setMinutes(currentSpan.getMinutes() + span);
        }
    }

    //push the last span, and pad extra zeroes if the end of array is reached
    while (points.length < limit) { 
        points.push({
            spanStart: currentSpan.toISOString(),
            count: sum
        });
        currentSpan.setMinutes(currentSpan.getMinutes() + span);
        sum = 0;
    }


  
    context.res = {
        status: 200,
        body: JSON.stringify({
            dataPoints: points,
            earliestPoint: new Date(dataPoints[0].time * 60000).toISOString(),
        })
    }
};

//binary search for closest element that is less than or equal to start
function binarySearchForGEQ(dataPoints: {"time": number, "count": number}[], start: number) {
    let low = 0;
    let high = dataPoints.length - 1;

    if (dataPoints.length === 0 || dataPoints[high].time < start) {
        return -1;
    }


    while (low < high) {
        let mid = Math.floor((high + low) / 2);
        if (dataPoints[mid].time < start) {
            low = mid + 1;
        } else if (dataPoints[mid].time === start) {
            return mid;
        } else {
            high = mid;
        }
    }

    return low;
}


export default httpTrigger;
