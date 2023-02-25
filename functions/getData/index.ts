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
            body: JSON.stringify("No short URL provided")
        };
        return;
    }

    const variable = req.query.variable;

    if (variable === undefined || variable === "") {
        context.res = {
            status: 400,
            body: JSON.stringify("No variable provided")
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
    }


    const counts: {
        [key: string]: number
    } = {};

    for (const conditional of resource.redirects) { //go through each conditional's analytics
        for (const redirect of conditional) { //for each redirect in the conditional, increment the count for the selected variable
            let value = "";
            if (variable === "URL Parameter")
                value = toParamsString(JSON.parse(redirect["params"]));
            else 
                value = redirect[variable];

            if (counts[value] === undefined) {
                counts[value] = 1;
            } else {
                counts[value]++;
            }
        }
    }

    let compare: (a: string, b: string) => number;
    switch (req.query.sort) {
        case "Increasing":
            compare = (a, b) => {
                if (counts[a] > counts[b])
                    return -1;
                else if (counts[a] < counts[b])
                    return 1;
                else if (a > b)
                    return -1;
                else if (a < b)
                    return 1;
                else
                    return 0;
            }
            break;

        case "Decreasing":
        default:
            compare = (a, b) => {
                if (counts[a] < counts[b])
                    return -1;
                else if (counts[a] > counts[b])
                    return 1;
                else if (a < b)
                    return -1;
                else if (a > b)
                    return 1;
                else
                    return 0;
                    
            }
            break;
    }

    const sortedPaginatedData = []
    Object.keys(counts)
            .sort(compare) //sort the keys
            .slice(page * pageSize, (page + 1) * pageSize) //get the page
            .forEach((key) => { //copy over data
                sortedPaginatedData.push({
                    key,
                    count: counts[key]
                });
            });

    for (let i = sortedPaginatedData.length; i < pageSize; i++) {
        sortedPaginatedData.push({
            key: "-",
            count: "-"
        });
    }


    context.res = {
        status: 200,
        body: JSON.stringify({
            counts: sortedPaginatedData,
            pageCount: Math.ceil(Object.keys(counts).length / pageSize)
        })
    }
};


const toParamsString = (params: {[key: string]: string}) => {
    let str = "";
    let i = 0;

    for (const key in params) {
        str += `${key}=${params[key]}`;
        if (i++ < Object.keys(params).length - 1)
            str += "&";
    }

    if (str === "")
        str = '""';
    
    return str;
}

export default httpTrigger;
