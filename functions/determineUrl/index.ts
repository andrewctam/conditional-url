import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Condition, Conditional, DataDay, DataHour, DataMin, Variables, DataValue, Data } from "../types"
import { connectDB } from "../database"
import * as dotenv from 'dotenv';
import { ShortURL } from "../types";
import axios from "axios";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const short = req.body.short.toLowerCase();
    const data = JSON.parse(req.body.data);

    if (short === "" || !/^[a-zA-Z0-9]*$/.test(short)) {
        context.res = {
            status: 400,
            body: JSON.stringify({"msg": "Short URL contains invalid characters"})
        };  
        return;  
    } 


    //get user's location from ip address
    let ip;
    try {
        //when running Azure functions locally x-forwarded-for header is undefined
        ip = req.headers["x-forwarded-for"].split(":")[0]; 
    } catch (e) { 
        ip = "100.128.0.0"
    }

    dotenv.config();
    const AZURE_MAPS_KEY = process.env["AZURE_MAPS_KEY"];

    
    try {
        if (AZURE_MAPS_KEY) {
            const locationData = await axios.get(`https://atlas.microsoft.com/geolocation/ip/json?api-version=1.0&ip=${ip}&subscription-key=${AZURE_MAPS_KEY}`);

            if (locationData.data.countryRegion.isoCode) {
                const countries = { "AR": "Argentina", "AU": "Australia", "AT": "Austria", "BD": "Bangladesh", "BE": "Belgium", "BR": "Brazil", "CA": "Canada", "CL": "Chile", "CN": "China", "CO": "Colombia", "CZ": "Czechia", "DK": "Denmark", "EG": "Egypt", "FI": "Finland", "FR": "France", "DE": "Germany", "GR": "Greece", "HU": "Hungary", "IN": "India", "ID": "Indonesia", "IR": "Iran", "IQ": "Iraq", "IE": "Ireland", "IL": "Israel", "IT": "Italy", "JP": "Japan", "KZ": "Kazakhstan", "KE": "Kenya", "KW": "Kuwait", "MY": "Malaysia", "MX": "Mexico", "NL": "Netherlands", "NG": "Nigeria", "NO": "Norway", "PK": "Pakistan", "PE": "Peru", "PH": "Philippines", "PL": "Poland", "PT": "Portugal", "QA": "Qatar", "RO": "Romania", "RU": "Russia", "SA": "Saudi Arabia", "SG": "Singapore", "ZA": "South Africa", "KR": "South Korea", "ES": "Spain", "SE": "Sweden", "CH": "Switzerland", "TW": "Taiwan", "TH": "Thailand", "TR": "Turkey", "AE": "United Arab Emirates", "GB": "United Kingdom", "US": "United States", "VN": "Vietnam" };

                // if ip is from a not listed country, just set it to the iso code
                data["Country"] = countries[locationData.data.countryRegion.isoCode] ?? locationData.data.countryRegion.isoCode;
            } else
                throw new Error("Failed to fetch");

        } else {
            //limited to 1,000 calls per day
            const location = await axios.get(`https://ipapi.co/${ip}/country_name`);

            if (location.data)
                data["Country"] = location.data;
            else
                throw new Error("Failed to fetch");
        }

    } catch (e) {
        data["Country"] = "Unknown";
    }
    

    

    const client = await connectDB();
    const db = client.db("conditionalurl");
    const urlsCollection = db.collection<ShortURL>("urls");

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

    const inc = { 
        $inc: { [i]: 1 }
    }

    const minsCollection = db.collection<DataMin>("datamins");
    await minsCollection.updateOne({
        urlUID: url.uid, 
        unixMin: Math.floor(Date.now() / 60000)
    }, inc, {upsert: true});
    
    const hoursCollection = db.collection<DataHour>("datahours");
    await hoursCollection.updateOne({
        urlUID: url.uid,
        unixHour: Math.floor(Date.now() / 3600000)
    }, inc, {upsert: true});
    
    const daysCollection = db.collection<DataDay>("datadays");
    await daysCollection.updateOne({
        urlUID: url.uid, 
        unixDay: Math.floor(Date.now() / 86400000)
    }, inc, {upsert: true});


    let writes = []
    Variables.forEach((v) => {
        if (data[v] !== undefined) {
            writes.push({
                "updateOne": {
                    "filter": {
                        urlUID: url.uid,
                        var: v,
                        val: data[v],
                    },
                    "update": inc,
                    "upsert": true
                }
            })
        }      
    })

    const valsCollection = db.collection<DataValue>("values");
    await valsCollection.bulkWrite(writes);

    context.res = {
        status: 200,
        body: JSON.stringify(redirect)
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