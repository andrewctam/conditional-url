

import { Context } from "@azure/functions";

import createURL from "../createURL/index";
import determineURL from "./index";

describe("Redirect to countries correctly", () => {
    jest.setTimeout(1000000)
    let context = ({ log: jest.fn() } as unknown) as Context;
    let randomShort = Math.random().toString(36).substring(2, 10);

    
    const ips = {
        //testing all of them may not be necessary every time
        //if not using Azure's API, the free API is rate limited to 45 calls/min and will not be able to do all of these
        //"Argentina": "186.33.216.111", "Australia": "203.0.178.191", "Austria": "212.183.0.14", "Bangladesh": "119.148.7.17", "Belgium": "141.138.64.0", "Brazil": "187.7.57.36", "Canada": "216.254.141.62", "Chile": "200.54.218.3", "China": "202.106.0.20", "Colombia": "190.131.215.238", "Czechia": "37.157.192.54", "Denmark": "80.63.254.73", "Egypt": "41.178.38.1", "Finland": "62.78.198.146", "France": "217.70.180.148", "Germany": "104.101.112.0", "Greece": "195.251.15.58", "Hungary": "195.56.55.23", "India": "14.139.0.0", "Indonesia": "36.67.8.115", "Iran": "79.175.153.174", "Iraq": "149.255.192.0", "Ireland": "104.123.96.0", "Israel": "31.168.54.3", "Italy": "103.43.232.0", "Japan": "133.242.0.0", "Kazakhstan": "195.210.46.49", "Kenya": "105.17.240.0", "Kuwait": "168.187.63.68", "Malaysia": "183.78.169.1", "Mexico": "187.141.34.68", "Netherlands": "46.19.37.108", "Nigeria": "197.210.52.68", "Norway": "212.125.204.240", "Pakistan": "101.50.64.0", "Peru": "190.102.146.2", "Philippines": "202.90.159.42", "Poland": "77.252.144.8", "Portugal": "109.48.0.0", "Qatar": "89.211.45.80", "Romania": "109.166.147.0", "Russia": "109.124.0.0", "Saudi Arabia": "103.154.242.0", "Singapore": "203.125.197.3", "South Africa": "196.15.169.41", "South Korea": "211.115.63.19", "Spain": "81.46.212.220",
        "Sweden": "217.211.176.174", "Switzerland": "103.55.232.0", "United States": "100.128.0.0"
    }
    

    it("should successfully be created", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer NONE"
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    ...Object.keys(ips).map(country => {
                        return {
                            url: `https://example.com/${country}`,
                            and: true,
                            conditions: [
                                {
                                    variable: "Country",
                                    operator: "=",
                                    value: country
                                }
                            ]
                        }
                    }),
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
    })

    
    it("should successfully redirect for all countries", async () => {
        for (const [country, ip] of Object.entries(ips)) {
            const req = {
                body: {
                    short: randomShort,
                    data: JSON.stringify({ "URL Parameter": JSON.stringify("") })
                }, 
                headers: {
                    "x-forwarded-for": ip + ":00000"
                }
            }

            await determineURL(context, req);

            expect(context.res.status).toBe(200);
            expect(JSON.parse(context.res.body)).toBe(`https://example.com/${country}`);
        }

    })  

})
