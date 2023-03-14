import { Context } from "@azure/functions";
import getData from "./index"
import signUp from "../signUp/index";
import createUrl from "../createUrl/index";
import determineUrl from "../determineUrl/index";
import jwt from "jsonwebtoken";

test("No token", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "" 
        },
        query: {
            short: Math.random().toString(36).substring(2, 10),
            variable: "Language",
            page: 0,
            selectedUrl: -1,
            sort: "Increasing",
            refresh: true
        }
    }

    await getData(context, req);

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
            variable: "Language",
            page: 0,
            selectedUrl: -1,
            sort: "Increasing",
            refresh: true
        }
    }

    await getData(context, req);

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
            variable: "Language",
            page: 0,
            selectedUrl: -1,
            sort: "Increasing",
            refresh: true
        }
    }

    await getData(context, req);

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
            variable: "Language",
            page: 0,
            selectedUrl: -1,
            sort: "Increasing",
            refresh: true
        }
    }

    await getData(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})


describe("Setup", () => {
    let accessToken;
    const short = Math.random().toString(36).substring(2, 18);
    
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
                variable: "Language",
                page: 0,
                selectedUrl: -1,
                sort: "Increasing",
                refresh: true
            }
        }
    
        await getData(context, req);
    
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
                variable: "Language",
                page: 0,
                selectedUrl: -1,
                sort: "Increasing",
                refresh: true
            }
        }
    
        await getData(context, req);
    
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
                variable: "Language",
                page: 0,
                selectedUrl: -1,
                sort: "Increasing",
                refresh: true
            }
        }
    
        await getData(context, req);
    
        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL not found");
    })


    test("Invalid variable", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                variable: "Random variable that doesn't exist",
                page: 0,
                selectedUrl: -1,
                sort: "Increasing",
                refresh: true
            }
        }
    
        await getData(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid variable provided");
    })


    test("Empty data", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                variable: "Language",
                refresh: true
            }
        }
    
        await getData(context, req);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body).pageCount).toBe(1);
    })

    test("Add a data point", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
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

        const req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            query: {
                short: short,
                variable: "Language",
                refresh: true
            }
        }
    
        await getData(context, req2);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body).counts).toStrictEqual([
            {
                "key": "Spanish",
                "count": "1"
            },
            ...new Array(9).fill({
                "key": "-",
                "count": "-"
            })
        ]);
        expect(JSON.parse(context.res.body).pageCount).toBe(1);

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
                variable: "Language",
                refresh: false
            }
        }
    
        await getData(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })
    

    
})
