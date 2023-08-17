import { Context } from "@azure/functions";

import signUp from "../signUp/index";
import getUserURLs from "./index";
import createURL from "../createURL/index";
import jwt from "jsonwebtoken";

describe("Unit tests for getUserURLs", () => {
    let accessToken;
    let shorts = [];

    for (let i = 0; i < 11; i++)
        shorts.push(Math.random().toString(36).substring(2, 18));
    

    jest.setTimeout(10000);
    test("setup", async () => {
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
    })

    test("No URLs yet", async () => {
        let context = ({ log: jest.fn() } as unknown) as Context;

        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                page: 0,
                sort: "Oldest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(200);

        let body = JSON.parse(context.res.body);
        expect(body.noURLs).toBe(true);
    });

    test("Put URLs", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;

        for (const short of shorts) {
            const req = {
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
    
            await createURL(context, req);
            expect(context.res.status).toBe(200);
        }
    });

    test("Get user urls Oldest", async () => {
        let context = ({ log: jest.fn() } as unknown) as Context;
        const copy = [...shorts]
        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                page: 0,
                sort: "Oldest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(200);

        let body = JSON.parse(context.res.body);
        expect(body.page).toBe(0);
        expect(body.pageCount).toBe(2);
        expect(body.paginatedURLs).toStrictEqual(copy.splice(0, 10));

        req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                page: 1,
                sort: "Oldest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(200);

        body = JSON.parse(context.res.body);
        expect(body.noURLs).toBe(false);
        expect(body.page).toBe(1);
        expect(body.pageCount).toBe(2);
        expect(body.paginatedURLs).toStrictEqual(copy.splice(0, 1));
    })

    
    test("Get user urls Newest", async () => {
        let context = ({ log: jest.fn() } as unknown) as Context;
        const reversed = [...shorts]
        reversed.reverse()

        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                page: 0,
                sort: "Newest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(200);

        let body = JSON.parse(context.res.body);
        expect(body.page).toBe(0);
        expect(body.pageCount).toBe(2);
        expect(body.paginatedURLs).toStrictEqual(reversed.splice(0, 10));

        req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                page: 1,
                sort: "Newest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(200);

        body = JSON.parse(context.res.body);
        expect(body.page).toBe(1);
        expect(body.pageCount).toBe(2);
        expect(body.paginatedURLs).toStrictEqual(reversed.splice(0, 1));
    })

    test("Get user urls seaching", async () => {
        let context = ({ log: jest.fn() } as unknown) as Context;
        const searchStr = shorts[0].substring(0, 2);
        const filtered = shorts.filter(short => short.includes(searchStr));

        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                page: 0,
                sort: "Oldest",
                search: searchStr
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(200);

        let body = JSON.parse(context.res.body);
        expect(body.page).toBe(0);
        expect(body.pageCount).toBe(2);
        expect(body.searchedPageCount).toBe(1);
        expect(body.paginatedURLs).toStrictEqual(filtered);
    })
    

    test("NaN Page", async () => {
        let context = ({ log: jest.fn() } as unknown) as Context;
        const reversed = [...shorts]
        reversed.reverse()

        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                page: "Str",
                sort: "Newest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(200);

        let body = JSON.parse(context.res.body);
        expect(body.page).toBe(0);
        expect(body.pageCount).toBe(2);
        expect(body.paginatedURLs).toStrictEqual(reversed.splice(0, 10));

    })
    

    test("No Token", async () => {
        let context = ({ log: jest.fn() } as unknown) as Context;
        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer NONE" 
            },
            query: {
                page: 0,
                sort: "Newest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token")

    })

    test("No Token 2", async () => {
        let context = ({ log: jest.fn() } as unknown) as Context;
        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": ""
            },
            query: {
                page: 0,
                sort: "Newest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("No token provided")

    })

    test("Bad token", async () => {
        const badAccessToken = jwt.sign( {}, process.env.JWT_SECRET, { expiresIn: "1h" } );

        let context = ({ log: jest.fn() } as unknown) as Context;
        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization":  "Bearer " + badAccessToken
            },
            query: {
                page: 0,
                sort: "Newest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token")

    })


    test("User not found", async () => {
        const badAccessToken = jwt.sign( {username: Math.random().toString(36).substring(2, 18)}, process.env.JWT_SECRET, { expiresIn: "1h" } );

        let context = ({ log: jest.fn() } as unknown) as Context;
        let req = {
            headers: {
                "Content-Type": "application/json",
                "authorization":  "Bearer " + badAccessToken
            },
            query: {
                page: 0,
                sort: "Newest"
            }
        }

        await getUserURLs(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("User not found")
    })

    
    
    
    
})

