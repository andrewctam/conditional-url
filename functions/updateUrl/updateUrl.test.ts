import { Context } from "@azure/functions";

import signUp from "../signUp/index";
import updateUrl from "./index"
import createUrl from "../createUrl/index";
import jwt from "jsonwebtoken";

describe("Unit tests for updateUrl", () => {
    let accessToken;
    let accessToken2;

    test("get a token", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;

        const req = {
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
                "Content-Type": "application/json"
            },
            body: {
                username: Math.random().toString(36).substring(2, 10),
                password: Math.random().toString(36).substring(2, 10)
            }
        }

        await signUp(context, req2);
        expect(context.res.status).toBe(200);

        accessToken2 = JSON.parse(context.res.body).accessToken;
        expect(accessToken2).toBeDefined();

      

    })

    test("No Auth", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": ""
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("No token provided");
    })


    test("Invalid token", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer badToken"
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })


    test("Invalid token", async () => {
        const badAccessToken = jwt.sign( {}, process.env.JWT_SECRET, { expiresIn: "1h" } );

        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })

    test("Not found", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL not found");
    })

    test("Not owner", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const randomShort = Math.random().toString(36).substring(2, 16);

        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com/3",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }

        await createUrl(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
        
        const req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken2
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com/2",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req2);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })


    test("Not owner 2", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const randomShort = Math.random().toString(36).substring(2, 16);

        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer NONE"
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com/3",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }

        await createUrl(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
        
        const req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com/2",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req2);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })

    

    test("Invalid URL Special Character", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: "*",
                conditionals: JSON.stringify([
                    {
                        url: "example",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL contains invalid characters");
    })
    
    
    test("Invalid URL Link", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "example",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("Error with a link");
    })
    
    
    test("Invalid URL Too Many", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify(new Array(101).fill({}))
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("Too many URLs");
    })
    
    test("Invalid URL Empty Value", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: [
                            {
                                variable: "Language",
                                operator: "=",
                                value: ""
                            }
                        ]
                    },
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("A value was not provided");
    })
    
    
    test("Invalid URL Missing AND/OR", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        conditions: [
                            {
                                variable: "Language",
                                operator: "=",
                                value: "English"
                            }
                        ]
                    },
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("No AND/OR value provided");
    })
    
    
    test("Invalid URL Missing Operator", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: [
                            {
                                variable: "Language",
                                value: "English"
                            }
                        ]
                    },
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid operator");
    })
    
    
    test("Invalid URL Params Invalid Character", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: [
                            {
                                variable: "URL Parameter",
                                param: "*",
                                value: "Test",
                                operator: "="
                            }
                        ]
                    },
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("URL Parameter param was invalid");
    })
    
    
    test("Invalid URL Params Undefined", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: [
                            {
                                variable: "URL Parameter",
                                value: "Test",
                                operator: "="
                            }
                        ]
                    },
                    {
                        url: "https://example.com",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("URL Parameter param was invalid");
    })
    
    
    test("Invalid URL Unsafe URL", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: Math.random().toString(36).substring(2, 16),
                conditionals: JSON.stringify([
                    {
                        url: "https://testsafebrowsing.appspot.com/s/phishing.html",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }
    
        await updateUrl(context, req);
    
        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("Unsafe URL detected");
    })
    
    
    
    
})

