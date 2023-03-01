import { Context } from "@azure/functions";
import getConditionals from "./index"
import signUp from "../signUp/index";
import createUrl from "../createUrl/index";
import jwt from "jsonwebtoken";

test("No token", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "" 
        },
        body: {
            short: Math.random().toString(36).substring(2, 10)
        }
    }

    await getConditionals(context, req);

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
            short: "example"
        }
    }

    await getConditionals(context, req);

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
            short: "example"
        }
    }

    await getConditionals(context, req);

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
            short: "example"
        }
    }

    await getConditionals(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})


describe("Setup", () => {
    let accessToken;
    let accessToken2;
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

        req = {
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

        accessToken2 = JSON.parse(context.res.body).accessToken;
        expect(accessToken2).toBeDefined();
            
        const req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: short,
                conditionals: JSON.stringify({
                    url: "https://example.com",
                    and: true,
                    conditions: []
                })
            }
        }

        await createUrl(context, req2);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(short);
    });

    test("User not found", async () => {
        const badAccessToken = jwt.sign( {username: Math.random().toString(36).substring(2, 10)}, process.env.JWT_SECRET, { expiresIn: "1h" } );
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken 
            },
            query: {
                short: short
            }
        }
    
        await getConditionals(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })

    test("URL not found", async () => {
        const badAccessToken = jwt.sign( {username: Math.random().toString(36).substring(2, 10)}, process.env.JWT_SECRET, { expiresIn: "1h" } );
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken 
            },
            query: {
                short: Math.random().toString(36).substring(2, 10)
            }
        }
    
        await getConditionals(context, req);
    
        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL not found");
    })


    test("Short not provided", async () => {
        const badAccessToken = jwt.sign( {username: Math.random().toString(36).substring(2, 10)}, process.env.JWT_SECRET, { expiresIn: "1h" } );
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken 
            },
            query: {
                short: ""
            }
        }
    
        await getConditionals(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("No short URL provided");
    })


    test("User not owner", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken2 
            },
            query: {
                short: short
            }
        }
    
        await getConditionals(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })

})
