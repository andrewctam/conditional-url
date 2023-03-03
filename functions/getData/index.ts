import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { Variables } from "../types";

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

    if (payload === undefined || payload.username === undefined) {
        context.res = {
            status: 401,
            body: JSON.stringify({"msg": "Invalid token"})
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
            body: JSON.stringify({"msg": "No short URL provided"})
        };
        return;
    }


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


    let counts: {
        [key: string]: number
    } = {};

    let selectedUrl = parseInt(req.query.selectedUrl)
    if (selectedUrl === undefined || isNaN(selectedUrl) || selectedUrl > resource.redirects.length) {
        selectedUrl = -1;
    }
    
    let i = 0;
    let lim = resource.redirects.length;

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


    let compare: (a: string, b: string) => number;
    switch (req.query.sort) {
        case "Increasing":
            compare = (a, b) => {
                if (counts[a] > counts[b])
                    return -1;
                else if (counts[a] < counts[b])
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


export default httpTrigger;
