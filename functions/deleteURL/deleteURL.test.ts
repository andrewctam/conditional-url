import { Context } from "@azure/functions";
import deleteURL from "./index"
import signUp from "../signUp/index";
import createURL from "../createURL/index";
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

    await deleteURL(context, req);

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
        body: {
            short: Math.random().toString(36).substring(2, 10)
        }
    }

    await deleteURL(context, req);

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
        body: {
            short: Math.random().toString(36).substring(2, 10)
        }
    }

    await deleteURL(context, req);

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
        body: {
            short: Math.random().toString(36).substring(2, 10)
        }
    }

    await deleteURL(context, req);

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

        await createURL(context, req2);

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
            body: {
                short: short
            }
        }
    
        await deleteURL(context, req);
    
        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("User not found");
    })

    test("URL not found in user's list", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            body: {
                short: Math.random().toString(36).substring(2, 10)
            }
        }
    
        await deleteURL(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Unauthorized");
    })

    test("User not owner", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken2
            },
            body: {
                short: short
            }
        }
    
        await deleteURL(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Unauthorized");
    })

    test("Success", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: short
            }
        }
    
        await deleteURL(context, req);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("URL deleted");
    })
    
})
