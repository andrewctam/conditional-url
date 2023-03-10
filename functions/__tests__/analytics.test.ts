import { Context } from "@azure/functions";

import signUp from "../signUp/index";
import createUrl, { URL } from "../createUrl/index";
import getData from "../getData"
import getDataPoints from "../getDataPoints"
import { DataPoint } from "../getDataPoints/index";
import { Variables } from "../types";
import { connectDB, disconnectDB } from "../database";
import { ObjectId } from "mongodb";
jest.setTimeout(100000)


describe("Get requested analytics", () => {
    const NUM_POINTS = 100;

    let context = ({ log: jest.fn() } as unknown) as Context;
    let randomShort = Math.random().toString(36).substring(2, 10);

    let username = Math.random().toString(36).substring(2, 10);
    let password = Math.random().toString(36).substring(2, 10);
    console.log(username, password)

    let accessToken;

    const start = new Date("2021-01-01T00:00:00.000Z").getTime() / 60000;

    const redirects = [0, 0, 0, 0]
    const expCountsTotal = {}
    const expCounts0 = {}

    for (const v of Variables) {
        expCountsTotal[v] = {}
        expCounts0[v] = {}
    }

    let expDataPoints = []
    


    it("should successfully sign up", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: password
            }
        }

        await signUp(context, req);

        expect(context.res.status).toBe(200);
        const body = JSON.parse(context.res.body);

        expect(body.username).toBe(username);
        expect(body.refreshToken).toBeDefined();

        accessToken = body.accessToken;

        expect(accessToken).toBeDefined();
    })

    const cond = 
    {
        url: "https://example.com/2",
        and: true,
        conditions: [{
            variable: "Language",
            operator: "=",
            value: "English"
        }]
    }
    
    

    it("should successfully be created", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    cond, cond, cond,
                    {
                        url: "https://example.com/2",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }

        await createUrl(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);

        
        const client = await connectDB();
        const db = client.db("conditionalurl");
        const urlsCollection = db.collection<URL>("urls")

        const shortUrl = await urlsCollection.findOne({_id: randomShort});

        //artificially create some data
        let currentMinute = start;
        const data = []

        
        for (let pt = 0; pt < NUM_POINTS; pt++) {
            const i = Math.floor(Math.random() * 4);
            redirects[i]++;

            const datum: DataPoint = {
                _id: new ObjectId(),
                urlUID: shortUrl.uid,
                i: i,
                owner: username,
                unixMin: currentMinute,
                values: Variables.map(v => {
                    const val = Math.floor(Math.random() * 10).toString()

                    if (expCountsTotal[v][val] === undefined)
                        expCountsTotal[v][val] = 1
                    else
                        expCountsTotal[v][val]++;
                    
                    if (i === 0) {
                        if (expCounts0[v][val] === undefined)
                            expCounts0[v][val] = 1
                        else
                            expCounts0[v][val]++;
                    }

                    return val;
                })
            }

            data.push(datum)
            

                
            if (pt === 0) {
                expDataPoints.push(1);
            } else {
                expDataPoints[expDataPoints.length - 1]++
            }

            if (Math.random() < 0.5) {
                const diff = Math.floor(Math.random() * 10) + 1;
                currentMinute += diff

                for (let i = 0; i < diff; i++)
                    expDataPoints.push(0)
            }
        }

        await urlsCollection.updateOne({_id: randomShort}, {
            $set: {
                redirects: redirects
            }
        })

        const dpCollection = db.collection<DataPoint>("datapoints")
        await dpCollection.insertMany(data);

        await disconnectDB();
    })


    it("should successfully get data", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    variable: v,
                    page: 0,
                    pageSize: 10,
                    selectedUrl: -1,
                    sort: "Increasing",
                    refresh: true
                }
            }

            await getData(context, req);

            expect(context.res.status).toBe(200);
            
            const table: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;

            for (let i = 0; i < table.length; i++) {
                if (table[i].key == "-")
                    continue;
                expect(table[i].count).toBe(expCountsTotal[v][table[i].key].toString());

                if (i !== 0) {
                    expect(parseInt(table[i].count)).toBeGreaterThanOrEqual(parseInt(table[i - 1].count))
                }
            }
        }
    });


    it("should successfully get data with redis", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    variable: v,
                    page: 0,
                    pageSize: 10,
                    selectedUrl: -1,
                    sort: "Increasing",
                    refresh: false
                }
            }

            await getData(context, req);

            expect(context.res.status).toBe(200);
            
            const table: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;

            for (let i = 0; i < table.length; i++) {
                if (table[i].key == "-")
                    continue;
                expect(table[i].count).toBe(expCountsTotal[v][table[i].key].toString());

                if (i !== 0) {
                    expect(parseInt(table[i].count)).toBeGreaterThanOrEqual(parseInt(table[i - 1].count))
                }
            }
        }
    });

    it("should successfully get data for individual url", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    variable: v,
                    page: 0,
                    pageSize: 10,
                    selectedUrl: 0,
                    sort: "Decreasing",
                    refresh: true
                }
            }

            await getData(context, req);

            expect(context.res.status).toBe(200);
            
            const table: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;
            for (let i = 0; i < table.length; i++) {
                if (table[i].key == "-")
                    continue;
                expect(table[i].count).toBe(expCounts0[v][table[i].key].toString());

                if (i !== 0) {
                    expect(parseInt(table[i].count)).toBeLessThanOrEqual(parseInt(table[i - 1].count))
                }
            }

        }
    });


    it("should successfully get data for individual url with redis", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    variable: v,
                    page: 0,
                    pageSize: 10,
                    selectedUrl: 0,
                    sort: "Decreasing",
                    refresh: false
                }
            }

            await getData(context, req);

            expect(context.res.status).toBe(200);
            
            const table: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;

            for (let i = 0; i < table.length; i++) {
                if (table[i].key == "-")
                    continue;
                expect(table[i].count).toBe(expCounts0[v][table[i].key].toString());

                if (i !== 0) {
                    expect(parseInt(table[i].count)).toBeLessThanOrEqual(parseInt(table[i - 1].count))
                }
            }

        }
    });


    it("should successfully get data points", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    span: 1,
                    start: start,
                    limit: 30,
                    refresh: true
                }
            }

            await getDataPoints(context, req);

            expect(context.res.status).toBe(200);
            
            const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
            
            expect(dataPoints).toStrictEqual(expDataPoints.slice(0, 30).map((i) => i.toString()))
        }

    });


    it("should successfully get data points with redis", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    span: 1,
                    start: start,
                    limit: 30,
                    refresh: false
                }
            }

            await getDataPoints(context, req);

            expect(context.res.status).toBe(200);
            
            const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
            
            expect(dataPoints).toStrictEqual(expDataPoints.slice(0, 30).map((i) => i.toString()))
        }

    });




    it("should successfully get data points with span 3", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    span: 3,
                    start: start,
                    limit: 30,
                    refresh: true
                }
            }

            await getDataPoints(context, req);

            expect(context.res.status).toBe(200);
            
            const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
            
            const expGrouped = []
            let i = 0;
            while (expGrouped.length < 30) {
                expGrouped.push((expDataPoints[i] + expDataPoints[i + 1] + expDataPoints[i + 2]).toString())
                i += 3;
            }

            expect(dataPoints).toStrictEqual(expGrouped)
        }

    });


    it("should successfully get data points with redis", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    span: 3,
                    start: start,
                    limit: 30,
                    refresh: false
                }
            }

            await getDataPoints(context, req);

            expect(context.res.status).toBe(200);
            
            const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
            
            const expGrouped = []
            let i = 0;
            while (expGrouped.length < 30) {
                expGrouped.push((expDataPoints[i] + expDataPoints[i + 1] + expDataPoints[i + 2]).toString())
                i += 3;
            }

            expect(dataPoints).toStrictEqual(expGrouped)
        }

    });



    it("should successfully get data points with span 10", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    span: 10,
                    start: start,
                    limit: 10,
                    refresh: true
                }
            }

            await getDataPoints(context, req);

            expect(context.res.status).toBe(200);
            
            const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
            
            const expGrouped = []
            let i = 0;
            while (expGrouped.length < 10) {
                let sum = 0
                for (let j = 0; j < 10; j++)
                    sum += expDataPoints[j + i];
                    
                expGrouped.push(sum.toString())
                i += 10;
            }

            expect(dataPoints).toStrictEqual(expGrouped)
        }

    });


    it("should successfully get data points with redis", async () => {
        for (const v of Variables) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    span: 10,
                    start: start,
                    limit: 10,
                    refresh: false
                }
            }

            await getDataPoints(context, req);

            expect(context.res.status).toBe(200);
            
            const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
            
            const expGrouped = []
            let i = 0;
            while (expGrouped.length < 10) {
                let sum = 0
                for (let j = 0; j < 10; j++)
                    sum += expDataPoints[j + i];
                    
                expGrouped.push(sum.toString())
                i += 10;
            }

            expect(dataPoints).toStrictEqual(expGrouped)
        }

    });

    

    


});
