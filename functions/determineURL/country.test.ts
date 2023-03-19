

import { Context } from "@azure/functions";

import createURL from "../createURL/index";
import determineURL from "./index";

describe("Redirect to countries correctly", () => {
    jest.setTimeout(20000)
    let context = ({ log: jest.fn() } as unknown) as Context;
    let randomShort = Math.random().toString(36).substring(2, 10);

    const someIPs = {
        "Argentina": "186.33.216.111",
        "Australia": "203.0.178.191",
        "Belgium": "141.138.64.0",
        "Brazil": "187.7.57.36",
        "Canada": "216.254.141.62", 
        "China": "202.106.0.20",
        "Denmark": "80.63.254.73",
        "Egypt": "41.178.38.1", 
        "Finland": "62.78.198.146", 
        "France": "217.70.180.148", 
        "Germany": "104.101.112.0", 
        "India": "14.139.0.0", 
        "Mexico": "187.141.34.68",
        "Norway": "212.125.204.240",
        "Poland": "77.252.144.8",
        "Portugal": "109.48.0.0",
        "Singapore": "203.125.197.3",
        "Spain": "81.46.212.220",
        "Sweden": "217.211.176.174",
        "Switzerland": "103.55.232.0",
        "United States": "100.128.0.0"
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
                    ...Object.keys(someIPs).map(country => {
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
        for (const [country, ip] of Object.entries(someIPs)) {
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
