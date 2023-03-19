import { Context } from "@azure/functions";

import signUp from "../signUp/index";
import createURL from "../createURL/index";
import deleteAllURLs from "./index";
import redirect from "../redirect/index";
import jwt from "jsonwebtoken";
describe("Delete account tests", () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    
    const username = Math.random().toString(36).substring(2, 10);
    let accessToken;

    const shorts = [
        Math.random().toString(36).substring(2, 10),
        Math.random().toString(36).substring(2, 10)
    ]
    
    test("setup", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: Math.random().toString(36).substring(2, 10)
            }
        }

        await signUp(context, req);
        expect(context.res.status).toBe(200);

        accessToken = JSON.parse(context.res.body).accessToken;
        expect(accessToken).toBeDefined();

        for (const short of shorts) {
            const req2 = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                body: {
                    short: short,
                    conditionals: JSON.stringify([
                        {
                            url: "https://example.com",
                            and: true,
                            conditions: []
                        }
                    ])
                }
            }
            await createURL(context, req2);

            expect(context.res.status).toBe(200);
        }
    })


    test("Missing token", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": ""
            },
        }

        await deleteAllURLs(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("No token provided");
    })

    test("Bad token", async () => {
        const badAccessToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: "1h" });
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken
            },
        }

        await deleteAllURLs(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })

    test("Bad token", async () => {
        const badAccessToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: "1h" });
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer badToken"
            },
        }

        await deleteAllURLs(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })

    test("Wrong user token", async () => {
        const badAccessToken = jwt.sign({username: Math.random().toString(36).substring(2, 10)}, process.env.JWT_SECRET, { expiresIn: "1h" });
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken
            },
        }

        await deleteAllURLs(context, req);

        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("User not found");
    })

    test("Successfully delete URLs", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
        }

        await deleteAllURLs(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("All URLs deleted");
    })


    test("Successfully fail to delete URLs", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
        }

        await deleteAllURLs(context, req);

        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("No URLs to delete");
    })

    test("Successfully not find URLs", async () => {
        for (const short of shorts) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                body: {
                    short: short,
                    data: JSON.stringify({
                        Language: "English",
                        "URL Parameter": JSON.stringify("")
                    }), headers: {
                        "x-forwarded-for": "100.128.0.0:00000"
                    }
                }
            }

            await redirect(context, req);

            expect(context.res.status).toBe(404);
            expect(JSON.parse(context.res.body).msg).toBe("Short URL not found");
        }
    })

    test("Guest fail to create", async () => {
        for (const short of shorts) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer NONE"
                },
                body: {
                    short: short,
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

            expect(context.res.status).toBe(409);
            expect(JSON.parse(context.res.body).msg).toBe("Short URL already exists");
        }
    })


    test("User successfully recreate", async () => {
        for (const short of shorts) {
            const req = {
                headers: {
                    "Content-Type": "application/json",
                    "authorization": "Bearer " + accessToken
                },
                body: {
                    short: short,
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

            expect(context.res.status).toBe(200);
            expect(JSON.parse(context.res.body)).toBe(short);
        }
    })


    
})

