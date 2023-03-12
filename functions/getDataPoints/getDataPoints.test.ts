import { Context } from "@azure/functions";
import getDataPoints from "./index"
import signUp from "../signUp/index";
import createUrl from "../createUrl/index";
import determineUrl from "../determineUrl/index";
import jwt from "jsonwebtoken";
jest.setTimeout(10000)

test("No token", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "" 
        },
        query: {
            short: Math.random().toString(36).substring(2, 10),
            span: 1,
            start: Date.now() / 60000,
            limit: 30,
            refresh: true
        }
    }

    await getDataPoints(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("No token provided");
})

test("Bad token", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer badToken" 
        },
        query: {
            short: Math.random().toString(36).substring(2, 10),
            span: 1,
            start: Date.now() / 60000,
            limit: 30,
            refresh: true
        }
    }

    await getDataPoints(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})


test("Bad token 2", async () => {
    const badAccessToken = jwt.sign( {}, process.env.JWT_SECRET, { expiresIn: "1h" } );

    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer " + badAccessToken 
        },
        query: {
            short: Math.random().toString(36).substring(2, 10),
            span: 1,
            start: Date.now() / 60000,
            limit: 30,
            refresh: true
        }
    }

    await getDataPoints(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})


test("Bad token 3", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE" 
        },
        query: {
            short: Math.random().toString(36).substring(2, 10),
            span: 1,
            start: Date.now() / 60000,
            limit: 30,
            refresh: true
        }
    }

    await getDataPoints(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})


describe("Setup", () => {
    let accessToken;
    const short = Math.random().toString(36).substring(2, 18);
    let now;
    
    test("Sign up and create url", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;

        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: Math.random().toString(36).substring(2, 10),
                password: Math.random().toString(36).substring(2, 10)
            }
        }

        await signUp(context, req);
        expect(context.res.status).toBe(200);

        accessToken = JSON.parse(context.res.body).accessToken;
        expect(accessToken).toBeDefined();
            
        const req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: short,
                conditionals: JSON.stringify([{
                    url: "https://example.com",
                    and: true,
                    conditions: []
                }])
            }
        }

        await createUrl(context, req2);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(short);
    });

    test("Not owner", async () => {
        const badAccessToken = jwt.sign( {username: Math.random().toString(36).substring(2, 10)}, process.env.JWT_SECRET, { expiresIn: "1h" } );
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken 
            },
            query: {
                short: short,
                span: 1,
                start: Date.now() / 60000,
                limit: 30,
                refresh: true
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })



    test("Short not provided", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: "",
                span: 1,
                start: Date.now() / 60000,
                limit: 30,
                refresh: true
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("No short URL provided");
    })


    test("Short not found", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: Math.random().toString(36).substring(2, 10),
                span: 1,
                start: Date.now() / 60000,
                limit: 30,
                refresh: true
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL not found");
    })


    test("Add a data point", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        now = Date.now();
        const req = {
            body: {
                short: short,
                data: JSON.stringify({
                    Language: "Spanish",
                    Browser: "Safari",
                    Time: "01:00",
                    "URL Parameter": JSON.stringify(""),
                    OS: "MacOS",
                    Date: "2022-01-02",
                    "Screen Width": "999",
                    "Screen Height": "1000"
                })
            }
        }

        await determineUrl(context, req);
        expect(context.res.status).toBe(200);
    })

    test("Test minute", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                span: 1,
                start: Math.floor(now / 60000),
                limit: 5,
                refresh: true
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(200);
      
        const currrentMinute = Math.floor(Date.now() / 60000);

        if (currrentMinute == Math.floor(now / 60000)) {
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "1", "0", "0", "0", "0"
            ])
        } else { //minute changed since the test
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "0", "1", "0", "0", "0"
            ])
        }
    })


    test("Test redis", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                span: 1,
                start: Math.floor(now / 60000),
                limit: 5,
                refresh: false
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(200);
      
        const currrentMinute = Math.floor(Date.now() / 60000);

        if (currrentMinute == Math.floor(now / 60000)) {
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "1", "0", "0", "0", "0"
            ])
        } else { //minute changed since the test
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "0", "1", "0", "0", "0"
            ])
        }
    })


    test("Not owner (redis)", async () => {
        const badAccessToken = jwt.sign( {username: Math.random().toString(36).substring(2, 10)}, process.env.JWT_SECRET, { expiresIn: "1h" } );
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken 
            },
            query: {
                short: short,
                span: 1,
                start: Date.now() / 60000,
                limit: 30,
                refresh: false
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })

    
    
    test("Test hour", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                span: 60,
                start: Math.floor(now / 60000),
                limit: 5,
                refresh: true
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(200);
      
        const currentHour = Math.floor(Date.now() / 3600000);

        if (currentHour == Math.floor(now / 3600000)) {
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "1", "0", "0", "0", "0"
            ])
        } else { //hour changed since the test
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "0", "1", "0", "0", "0"
            ])
        }
    })

    test("Test day", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                span: 1440,
                start: Math.floor(now / 60000),
                limit: 5,
                refresh: true
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(200);
      
        const currentDay = Math.floor(Date.now() / 86400000);

        if (currentDay == Math.floor(now / 86400000)) {
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "1", "0", "0", "0", "0"
            ])
        } else { //day` changed since the test
            expect(JSON.parse(context.res.body).dataPoints).toStrictEqual([
                "0", "1", "0", "0", "0"
            ])
        }
    })



    test("Test auto", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                refresh: true
            }
        }
    
        await getDataPoints(context, req);
    
        expect(context.res.status).toBe(200);
      
        expect(JSON.parse(context.res.body).dataPoints).toStrictEqual(new Array(30).fill("0"))
    })

})
