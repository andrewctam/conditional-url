import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Condition, Conditional, Data, Variables } from "../types"
import { connectDB } from "../database"
import * as dotenv from 'dotenv';
import { URL } from "../createUrl";
import { DataPoint } from "../getDataPoints";
import { ObjectId } from "mongodb";


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const short = req.body.short.toLowerCase();
    const data = JSON.parse(req.body.data);

    if (short === "" || !/^[a-zA-Z0-9]*$/.test(short)) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Short URL contains invalid characters"})
        };    

    } else {
        dotenv.config();
        const client = await connectDB();
        const db = client.db("conditionalurl");
        const urlsCollection = db.collection<URL>("urls");


        const url = await urlsCollection.findOne({ _id: short });

        if (url === null || url.deleted) {
            context.res = {
                status: 404,
                body: JSON.stringify({"msg": "Short URL not found"})
            };
            return;
        }
        
        const conditionals = JSON.parse(url.conditionals);
        const [redirect, i] = determine(conditionals, data)

        let incrementCount;
        if (url.firstPoint === -1) {
            incrementCount = {
                $inc: {
                    [`redirects.${i}`]: 1
                },
                $set: {
                    firstPoint: Math.floor(Date.now() / 60000)
                }
            }
        } else
            incrementCount = {
                $inc: {
                    [`redirects.${i}`]: 1
                }
            }
        await urlsCollection.updateOne({_id: short}, incrementCount)

        const dpCollection = db.collection<DataPoint>("datapoints");
        const dp = {
            _id: new ObjectId(),
            urlUID: url.uid,
            i: i as number,
            owner: url.owner,
            values: Variables.map(v => data[v]),
        }

        await dpCollection.insertOne(dp)


        const inc = { 
            $inc: { count: 1 }
        }

        const minsCollection = db.collection("datamins");
        await minsCollection.updateOne({
            urlUID: url.uid, 
            owner: url.owner,
            unixMin: Math.floor(Date.now() / 60000)
        }, inc, {upsert: true});
        
        const hoursCollection = db.collection("datahours");
        await hoursCollection.updateOne({
            urlUID: url.uid,
            owner: url.owner,
            unixHour: Math.floor(Date.now() / 3600000)
        }, inc, {upsert: true});
        
        const daysCollection = db.collection("datadays");
        await daysCollection.updateOne({
            urlUID: url.uid, 
            owner: url.owner,
            unixDay: Math.floor(Date.now() / 86400000)
        }, inc, {upsert: true});

        context.res = {
            status: 200,
            body: JSON.stringify(redirect)
        }
    }


};


function determine(conditionals: Conditional[], data: Data): [url: string, i: number] {
    const parsedParams: {[key: string]: string} = data["URL Parameter"].split("&")
            .reduce((acc, cur) => {
                const [key, value] = cur.split("=");

                if (/^\d+$/.test(value)) {
                    acc[key] = parseInt(value);
                } else
                    acc[key] = value;

                return acc;
            }, {} );

    for (let i = 0; i < conditionals.length - 1; i++) {
        const conditional = conditionals[i];
        const conditions: Condition[] = conditional.conditions;

        //if AND, start as true and break on first false. 
        //if OR, start as false and break on first true.
        let valid = conditional.and;
        

        for (let i = 0; i < conditions.length; i++) {
            const condition: Condition = conditions[i];

            let variable = null;
            let value: string | number = condition.value;
            if (condition.variable == "URL Parameter") {
                if (condition.param in parsedParams)
                    variable = parsedParams[condition.param]
                    
                if (/^\d+$/.test(value)) {
                    value = parseInt(value);
                } 
            } else if (["Screen Height", "Screen Width"].includes(condition.variable)) {
                variable = parseInt(data[condition.variable])
                value = parseInt(value)
            } else
                variable = data[condition.variable]
            
            let result = false;
            switch(condition.operator) {
                case "=":
                    result = variable === value;
                    break;
                case "≠":
                    result = variable !== value;
                    break;
                case "≥":
                    result = variable >= value;
                    break;
                case "≤":
                    result = variable <= value;
                    break;
                case ">":
                    result = variable > value;
                    break;
                case "<":
                    result = variable < value;
                    break;
                default:
                    continue;
            }
                

            if (result) {
                if (!conditional.and) { //condition is true, if OR then done
                    valid = true
                    break
                } else
                    continue //keep checking
            } else {
                if (conditional.and) { //condition is false, if AND then done
                    valid = false
                    break;
                } else
                    continue;
            }

        }

        if (!valid)
            continue
        else
            return [conditional.url, i]
    }

    //else statement
    return [conditionals[conditionals.length - 1].url, conditionals.length - 1];
}

export default httpTrigger;