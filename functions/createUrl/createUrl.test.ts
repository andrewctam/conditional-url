import { Context } from "@azure/functions";

import createURL from "./index"
import jwt from "jsonwebtoken";

test("Invalid URL Special Character", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Short URL contains invalid characters");
})


test("Invalid URL Link", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Error with a link");
})


test("Invalid URL Too Many", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
        },
        body: {
            short: Math.random().toString(36).substring(2, 16),
            conditionals: JSON.stringify(new Array(101).fill({}))
        }
    }

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Too many URLs");
})

test("Invalid URL Empty Value", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("A value was not provided");
})


test("Invalid URL Missing AND/OR", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("No AND/OR value provided");
})


test("Invalid URL Missing Operator", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid operator");
})


test("Invalid URL Params Invalid Character", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("URL Parameter param was invalid");
})


test("Invalid URL Params Undefined", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("URL Parameter param was invalid");
})


test("Invalid URL Unsafe URL", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Unsafe URL detected");
})




test("Invalid URL Bad Token URL", async () => {
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

    await createURL(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})



test("Invalid URL Invalid Token 2", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;

    const accessToken = jwt.sign( {}, process.env.JWT_SECRET, { expiresIn: "1h" } );
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

    await createURL(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})


test("Invalid URL Invalid Token 3", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;

    const accessToken = jwt.sign( 
        { username: Math.random().toString(36).substring(2, 16) },
        process.env.JWT_SECRET, 
        { expiresIn: "1h" } 
        );
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

    await createURL(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("User not found");
})
