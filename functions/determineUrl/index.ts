import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import type { Condition, Conditional, Data } from "../types"
import { CosmosClient } from "@azure/cosmos";
import * as dotenv from 'dotenv';


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const short = req.body.short;
    const data = JSON.parse(req.body.data);

    if (short === "" || !/^[a-zA-Z0-9]*$/.test(short)) {
        context.res = {
            status: 400,
            body: "Short URL contains invalid characters"
        };    

    } else {
        dotenv.config();
        const key = process.env["COSMOS_KEY"];
        const endpoint = process.env["COSMOS_ENDPOINT"];
        
        const client = new CosmosClient({ endpoint, key });
        const container = client.database("conditionalurl").container("urls");

        const { resource } = await container.item(short, short).read();

        if (resource === undefined) {
            context.res = {
                status: 404,
                body: JSON.stringify("Short URL not found")
            };
            return;
        }
        
        const conditionals = JSON.parse(resource.conditionals);
        const [url, i] = determineUrl(conditionals, data)

        resource.redirects[i]++;
        await container.item(short, short).replace(resource);

        context.res = {
            status: 200,
            body: JSON.stringify(url)
        }
    }

};


const determineUrl = (conditionals: Conditional[], data: Data) => {
    const parsedParams: {string: string} = JSON.parse(data["params"])

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
            if (condition.variable == "URL Parameter") {
                if (condition.param in parsedParams)
                    variable = parsedParams[condition.param]
            } else
                variable = data[condition.variable]
            
            let result = false;
            switch(condition.operator) {
                case "=":
                    result = variable === condition.value;
                    break;
                case "!=":
                    result = variable !== condition.value;
                    break;
                case ">=":
                    result = variable >= condition.value;
                    break;
                case "<=":
                    result = variable <= condition.value;
                    break;
                case ">":
                    result = variable > condition.value;
                    break;
                case "<":
                    result = variable < condition.value;
                    break;
                default:
                    break
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