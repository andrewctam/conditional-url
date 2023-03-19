import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { Conditional, Operators } from "../types";
import axios from "axios";
import { connectDB } from "../database"
import { ShortURL } from "../types";
import { ObjectId } from "mongodb";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const short = req.body.short.toLowerCase();
    const conditionals = req.body.conditionals;

    if (short === "" || !/^[a-zA-Z0-9]*$/.test(short) || short.startsWith("http")) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Short URL contains invalid characters"})
        };    
        return;
    } 

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

    
    const parsedConditionals: Conditional[] = JSON.parse(conditionals);

    if (parsedConditionals.length > 100) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Too many URLs"})
        };    
        return;
    }
    
    const urls: {url: string}[] = [];

    for (let i = 0; i < parsedConditionals.length; i++) {
        const c = parsedConditionals[i];
        if (c.url == "" ||
            !c.url.startsWith("http://") && !c.url.startsWith("https://") ||
            c.conditions.length == 0 && i != parsedConditionals.length - 1 ||
            c.url.startsWith(`https://conditionalurl.web.app`)
        ) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "Error with a link"})
            };    
            return;
        } 

        if (c.and !== true && c.and !== false) {
            context.res = {
                status: 400,
                body: JSON.stringify({"msg": "No AND/OR value provided"})
            }
            return;
        }

        urls.push({"url": c.url});

        for (let j = 0; j < c.conditions.length; j++) {
            const condition = c.conditions[j];


            if (!Operators.includes(condition.operator)) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "Invalid operator"})
                };    
                return;
            }

            if (condition.value === "" && condition.variable !== "URL Parameter") { //url param value can be empty
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "A value was not provided"})
                };    
                return;
            } else if (condition.variable === "URL Parameter") {
                if (!condition.param || !/^[a-zA-Z0-9]*$/.test(condition.param)) {
                    context.res = {
                        status: 400,
                        body: JSON.stringify({"msg": "URL Parameter param was invalid"})
                    };    
                    return;
                }
            }
        }
    }

    //send URLs to Safe Browsing API
    dotenv.config();
    const GOOGLE_API_KEY = process.env["GOOGLE_API_KEY"];
    if (GOOGLE_API_KEY) { //if no key provided in .env, skip
        const APIURL = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + GOOGLE_API_KEY;

        const body = {
            client: {
                clientId: "conditionalurl",
                clientVersion: "1.0.0"
            },
            threatInfo: {
                threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                platformTypes: ["ANY_PLATFORM"],
                threatEntryTypes: ["URL"],
                threatEntries: urls
            }
        }

        try {
            const response = await axios.post(APIURL, body);
            if (response.data.matches) {
                context.res = {
                    status: 400,
                    body: JSON.stringify({"msg": "Unsafe URL detected"})
                };
                return;
            }

        } catch (error) {
            console.log(error)
        }
    }
         

    const client = await connectDB();
    const db = client.db("conditionalurl");

    const urlsCollection = db.collection<ShortURL>("urls");

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
            status: 401,
            body: JSON.stringify({"msg": "You do not own this URL"})
        };
        return;
    }

    const updateURL = {
        $set: {
            conditionals: parsedConditionals,
            uid: new ObjectId(), //disassociate the data with this url
            redirects: new Array(parsedConditionals.length).fill(0),
            firstPoint: -1,
            urlCount: parsedConditionals.length
        }
    }

    await urlsCollection.updateOne({_id: short}, updateURL);


    context.res = {
        status: 200,
        body: JSON.stringify(short)
    }

};

export default httpTrigger;