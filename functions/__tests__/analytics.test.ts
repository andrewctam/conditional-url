import { Context } from "@azure/functions";

import signUp from "../signUp/index";
import createURL, { URL } from "../createURL/index";
import getDataPage from "../getDataPage"
import getDataPoints from "../getDataPoints"
import { DataPoint } from "../getDataPoints/index";
import { Variables } from "../types";
import { connectDB, disconnectDB } from "../database";
import { ObjectId } from "mongodb";
jest.setTimeout(10000000)


describe("Get requested analytics", () => {
    const NUM_POINTS = 5000;
    const UNIQUE_VALS = 95;

    let context = ({ log: jest.fn() } as unknown) as Context;
    let randomShort = Math.random().toString(36).substring(2, 10);

    let username = Math.random().toString(36).substring(2, 10);
    let password = Math.random().toString(36).substring(2, 10);
    console.log(username, password)

    let accessToken;

    const start = new Date("2021-01-01T00:00:00.000Z").getTime() / 60000;
    let end = -1;
    
    const redirects = [0, 0, 0, 0]
    const counts = {}
    const expCounts = {}
    let langDescending = null;

    const countsURL0 = {}
    const expCountsURL0 = {}

    for (const v of Variables) {
        counts[v] = {}
        countsURL0[v] = {}
    }

    let expDataPoints = []
    let expDataPointsURL0 = []

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


    

    it("should successfully be created", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com/1",
                        and: true,
                        conditions: [{
                            variable: "Browser",
                            operator: "=",
                            value: "Chrome"
                        }]
                    },
                    {
                        url: "https://example.com/2",
                        and: true,
                        conditions: [{
                            variable: "OS",
                            operator: "=",
                            value: "MacOS"
                        }]
                    },
                    {
                        url: "https://example.com/3",
                        and: true,
                        conditions: [{
                            variable: "Language",
                            operator: "=",
                            value: "Spanish"
                        }]
                    },
                    {
                        url: "https://example.com/4",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);

        
        const client = await connectDB();
        const db = client.db("conditionalurl");
        const urlsCollection = db.collection<URL>("urls")

        const shortURL = await urlsCollection.findOne({_id: randomShort});

        //artificially create some data
        let currentMinute = start;
        const data = []
        const mins = []
        const hrs = []
        const days = []

        
        for (let pt = 0; pt < NUM_POINTS; pt++) {
            const i = Math.floor(Math.random() * 4);
            redirects[i]++;

            const datum: DataPoint = {
                _id: new ObjectId(),
                urlUID: shortURL.uid,
                i: i,
                values: Variables.map(v => {
                    const val = Math.floor(Math.random() * UNIQUE_VALS).toString()

                    if (counts[v][val] === undefined)
                        counts[v][val] = 1
                    else
                        counts[v][val]++;
                    
                    if (i === 0) {
                        if (countsURL0[v][val] === undefined)
                            countsURL0[v][val] = 1
                        else
                            countsURL0[v][val]++;
                    }

                    return val;
                })
            }

            const unixHr = Math.floor(currentMinute / 60);
            const unixDay = Math.floor(currentMinute / 60 / 24);

            
            data.push(datum)
            
            if (pt === 0) {
                expDataPoints.push(1);

                if (i === 0)
                    expDataPointsURL0.push(1)
                else
                    expDataPointsURL0.push(0)

                mins.push({
                    urlUID: shortURL.uid, 
                    unixMin: currentMinute,
                    [i]: 1
                })

                hrs.push({
                    urlUID: shortURL.uid,
                    unixHour: unixHr,
                    [i]: 1
                })

                days.push({
                    urlUID: shortURL.uid,
                    unixDay: unixDay,
                    [i]: 1
                })

            } else {
                expDataPoints[expDataPoints.length - 1]++

                if (i === 0)
                    expDataPointsURL0[expDataPointsURL0.length - 1]++

                if (mins[mins.length - 1].unixMin !== currentMinute) {
                    mins.push({
                        urlUID: shortURL.uid,
                        owner: username,
                        unixMin: currentMinute,
                        [i]: 1
                    })
                } else {
                    if (mins[mins.length - 1][i])
                        mins[mins.length - 1][i]++
                    else
                        mins[mins.length - 1][i] = 1
                }

                if (hrs[hrs.length - 1].unixHr !== unixHr) {
                    hrs.push({
                        urlUID: shortURL.uid,
                        owner: username,
                        unixHour: unixHr,
                        [i]: 1
                    })
                } else {
                    if (hrs[hrs.length - 1][i])
                        hrs[hrs.length - 1][i]++
                    else
                        hrs[hrs.length - 1][i] = 1

                }

                if (days[days.length - 1].unixDay !== unixDay) {
                    days.push({
                        urlUID: shortURL.uid,
                        owner: username,
                        unixDay: unixDay,
                        [i]: 1
                    })
                } else {
                    if (days[days.length - 1][i])
                        days[days.length - 1][i]++
                    else
                        days[days.length - 1][i] = 1
                }
            }

            if (pt !== NUM_POINTS - 1 && Math.random() < 0.5) {

                const diff = Math.floor(Math.random() * 10) + 1;
                currentMinute += diff
                end = currentMinute;


                for (let i = 0; i < diff; i++) {
                    expDataPoints.push(0)
                    expDataPointsURL0.push(0)
                }
            }

        }

        await urlsCollection.updateOne({_id: randomShort}, {
            $set: {
                redirects: redirects,
                firstPoint: start
            }
        })

        const dpCollection = db.collection<DataPoint>("datapoints")
        await dpCollection.insertMany(data);

        const minCollection = db.collection("datamins")
        await minCollection.insertMany(mins);

        const hrCollection = db.collection("datahours")
        await hrCollection.insertMany(hrs);

        const dayCollection = db.collection("datadays")
        await dayCollection.insertMany(days);

        await disconnectDB();

        Variables.map((v) => {
            expCounts[v] = Object.keys(counts[v]).map((k) => {
                return {
                    key: k,
                    count: counts[v][k].toString()
                }
            })

            if (v === "Language") {
                langDescending = [...expCounts[v]]
                langDescending.sort((a, b) => {
                    let aCount = parseInt(a.count);
                    let bCount = parseInt(b.count);
    
                    if (aCount === bCount) {
                        return a.key.localeCompare(b.key)
                    } else {
                        return bCount - aCount
                    }
                })

                while(langDescending.length % 10 !== 0) {
                    langDescending.push({ key: "-", count: "-" })
                }
            }


            expCounts[v].sort((a, b) => {
                let aCount = parseInt(a.count);
                let bCount = parseInt(b.count);

                if (aCount === bCount) {
                    return a.key.localeCompare(b.key)
                } else {
                    return aCount - bCount
                }
            })



            while(expCounts[v].length % 10 !== 0) {
                expCounts[v].push({ key: "-", count: "-" })
            }



            expCountsURL0[v] = Object.keys(countsURL0[v]).map((k) => {
                return {
                    key: k,
                    count: countsURL0[v][k].toString()
                }
            })

            expCountsURL0[v].sort((a, b) => {
                let aCount = parseInt(a.count);
                let bCount = parseInt(b.count);

                if (aCount === bCount) {
                    return a.key.localeCompare(b.key)
                } else {
                    return aCount - bCount
                }
            })

            while(expCountsURL0[v].length % 10 !== 0) {
                expCountsURL0[v].push({ key: "-", count: "-" })
            }

            
        })
    })

    it("should successfully get data (test all vars)", async () => {
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
                    selectedURL: -1,
                    sort: "Increasing",
                    refresh: true
                }
            }

            await getDataPage(context, req);

            expect(context.res.status).toBe(200);
            
            const page: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;

            expect(page).toStrictEqual(expCounts[v].slice(0, 10));
        }
    });


    it("should successfully get data in decreasing order (test all vars)", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                variable: "Language",
                page: 0,
                selectedURL: -1,
                sort: "Decreasing",
                refresh: true
            }
        }

        await getDataPage(context, req);

        expect(context.res.status).toBe(200);
        
        const page: {
            key: string,
            count: string
        }[] = JSON.parse(context.res.body).counts;

        expect(page).toStrictEqual(langDescending.slice(0, 10));
    
    });


    it("should successfully get data for individual url (test all vars)", async () => {
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
                    selectedURL: 0,
                    sort: "Increasing",
                    refresh: true
                }
            }

            await getDataPage(context, req);

            expect(context.res.status).toBe(200);
            
            const page: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;

            expect(page).toStrictEqual(expCountsURL0[v].slice(0, 10));
        }
    });

    it("should successfully get all pages of data", async () => {
        const v = Variables[0];
        const pages = Math.ceil( Object.keys(counts[v]).length / 10);

        let prev: {
            key: string,
            count: string
        };

        for (let page = 0; page < pages; page++) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    variable: v,
                    page: page,
                    selectedURL: -1,
                    sort: "Increasing",
                    refresh: true
                }
            }

            await getDataPage(context, req);

            expect(context.res.status).toBe(200);
            
            const pg: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;

            expect(pg).toStrictEqual(expCounts[v].slice(page * 10, (page + 1) * 10));
        }
    });


    it("should successfully get all pages of data with redis", async () => {
        const v = Variables[0];
        const pages = Math.ceil( Object.keys(counts[v]).length / 10);

        let prev: {
            key: string,
            count: string
        };
        for (let page = 0; page < pages; page++) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                query: {
                    short: randomShort,
                    variable: v,
                    page: page,
                    selectedURL: -1,
                    sort: "Increasing",
                    refresh: false
                }
            }

            await getDataPage(context, req);

            expect(context.res.status).toBe(200);
            
            const pg: {
                key: string,
                count: string
            }[] = JSON.parse(context.res.body).counts;

            expect(pg).toStrictEqual(expCounts[v].slice(page * 10, (page + 1) * 10));
        }
    });

    it("should successfully get data points by min", async () => {
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
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(expDataPoints.slice(0, 30).map((i) => i.toString()))
    });


    it("should successfully get data points by min with redis", async () => {
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
                selectedURL: -1,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(expDataPoints.slice(0, 30).map((i) => i.toString()))
    });




    it("should successfully get data points by hour", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "hour",
                start: start,
                limit: 30,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(groupPoints(expDataPoints, 30, 60))
    

    });


    it("should successfully get data points by hour with redis", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "hour",
                start: start,
                limit: 30,
                selectedURL: -1,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
    
        expect(dataPoints).toStrictEqual(groupPoints(expDataPoints, 30, 60))
    

    });



    it("should successfully get data points by day", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "day",
                start: start,
                limit: 10,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;

        expect(dataPoints).toStrictEqual(groupPoints(expDataPoints, 10, 1440))
    });


    it("should successfully get data points by day with redis", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "day",
                start: start,
                limit: 10,
                selectedURL: -1,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(groupPoints(expDataPoints, 10, 1440))
    });
    





    it("should successfully get data points by min of specific url", async () => {
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
                selectedURL: 0,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(expDataPointsURL0.slice(0, 30).map((i) => i.toString()))
    });


    it("should successfully get data points by min with redis of specific url", async () => {
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
                selectedURL: 0,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(expDataPointsURL0.slice(0, 30).map((i) => i.toString()))
    });




    it("should successfully get data points by hour of specific url", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "hour",
                start: start,
                limit: 30,
                selectedURL: 0,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(groupPoints(expDataPointsURL0, 30, 60))
    

    });


    it("should successfully get data points by hour with redis of specific url", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "hour",
                start: start,
                limit: 30,
                selectedURL: 0,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
    
        expect(dataPoints).toStrictEqual(groupPoints(expDataPointsURL0, 30, 60))
    

    });



    it("should successfully get data points by day of specific url", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "day",
                start: start,
                limit: 10,
                selectedURL: 0,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;

        expect(dataPoints).toStrictEqual(groupPoints(expDataPointsURL0, 10, 1440))
    });


    it("should successfully get data points by day with redis of specific url", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: "day",
                start: start,
                limit: 10,
                selectedURL: 0,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(groupPoints(expDataPointsURL0, 10, 1440))
    });




    it("should successfully get data points way before start", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: start - 1000,
                limit: 30,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(new Array(30).fill("0"))
    });

    it("should successfully get data points way before start with redis", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: start - 1000,
                limit: 30,
                selectedURL: -1,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(new Array(30).fill("0"))
    });


    it("should successfully get data points slightly before start", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: start - 5,
                limit: 30,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(["0", "0", "0", "0", "0", ...expDataPoints.slice(0, 25).map((i) => i.toString())])
    });

    it("should successfully get data points slightly before start with redis", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: start - 5,
                limit: 30,
                selectedURL: -1,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(["0", "0", "0", "0", "0", ...expDataPoints.slice(0, 25).map((i) => i.toString())])
    });


    it("should successfully get data points slightly after start", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: start + 5,
                limit: 30,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(expDataPoints.slice(5, 35).map((i) => i.toString()))
    });

    it("should successfully get data points slightly after start with redis", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: start + 5,
                limit: 30,
                selectedURL: -1,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(expDataPoints.slice(5, 35).map((i) => i.toString()))
    });

    it("should successfully get data points way after end", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: new Date("2030-01-01").getTime() / 60000,
                limit: 30,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(new Array(30).fill("0"))
    });


    it("should successfully get data points way after end with redis", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: new Date("2030-01-01").getTime() / 60000,
                limit: 30,
                selectedURL: -1,
                refresh: false
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        expect(dataPoints).toStrictEqual(new Array(30).fill("0"))
    });


    it("should successfully get data points slightly after end", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: end - 25,
                limit: 30,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        const exp = [...expDataPoints.slice(expDataPoints.length - 1 - 25).map((i) => i.toString()), "0", "0", "0", "0"]

        expect(dataPoints).toStrictEqual(exp);
    });



    it("should successfully get data points slightly after end with redis", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort,
                span: 1,
                start: end - 25,
                limit: 30,
                selectedURL: -1,
                refresh: true
            }
        }

        await getDataPoints(context, req);

        expect(context.res.status).toBe(200);
        
        const dataPoints: number[] = JSON.parse(context.res.body).dataPoints;
        
        const exp = [...expDataPoints.slice(expDataPoints.length - 1 - 25).map((i) => i.toString()), "0", "0", "0", "0"]

        expect(dataPoints).toStrictEqual(exp);
    });

});


function groupPoints(expDataPoints: number[], limit: number, groupSize: number) {
    const expGrouped: string[] = []
        let i = 0;
        while (expGrouped.length < limit) {
            let sum = 0
            for (let j = 0; j < groupSize; j++) {
                if (j + i >= expDataPoints.length) {
                    expGrouped.push(sum.toString())
                    return expGrouped.concat(new Array(limit - expGrouped.length).fill("0"));
                }

                sum += expDataPoints[j + i];
            }
                
            expGrouped.push(sum.toString())
            i += groupSize;
        }
    return expGrouped;
}
