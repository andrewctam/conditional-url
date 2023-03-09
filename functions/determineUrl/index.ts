import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Condition, Conditional, Data, Variables } from "../types"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';


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
        const key = process.env["COSMOS_KEY"];
        const endpoint = process.env["COSMOS_ENDPOINT"];
        
        const client = new CosmosClient({ endpoint, key });
        const container = client.database("conditionalurl").container("urls");

        const { resource: urlResource } = await container.item(short, short).read();

        if (urlResource === undefined || urlResource.deleted) {
            context.res = {
                status: 404,
                body: JSON.stringify({"msg": "Short URL not found"})
            };
            return;
        }
        
        const conditionals = JSON.parse(urlResource.conditionals);
        const [url, i] = determineUrl(conditionals, data)


        urlResource.redirects[i]++;
        await container.item(short, short).replace(urlResource);


        const dataPointsContainer = client.database("conditionalurl").container("dataPoints");
        await dataPointsContainer.items.create({
            short: short,
            info: {
                "url": i,
                "unixMin": Math.floor(Date.now() / 60000)
            },
            values: Variables.map(v => data[v]),
        })

        context.res = {
            status: 200,
            body: JSON.stringify(url)
        }
    }

};


const determineUrl = (conditionals: Conditional[], data: Data) => {
    const parsedParams: {[key: string]: string} = data["URL Parameter"].split("&")
            .reduce((acc, cur) => {
                const [key, value] = cur.split("=");

                if (/^\d+$/.test(value)) {
                    acc[key] = parseInt(value);
                } else
                    acc[key] = value;

                return acc;
            }, {} );

    for (let i = 0; i < conditionals.length; i++) {
        const conditional = conditionals[i];

        //else statement
        if (i === conditionals.length - 1) {
            return [conditional.url, conditionals.length - 1];
        }
        
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
}

export default httpTrigger;