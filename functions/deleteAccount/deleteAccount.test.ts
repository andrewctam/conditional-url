import { Context } from "@azure/functions";

import signUp from "../signUp/index";
import signIn from "../signIn/index";
import deleteAccount from "./index";
import createURL from "../createURL/index";
import redirect from "../redirect/index";
import getURL from "../getURL/index";

describe("Delete account tests", () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    
    const username = Math.random().toString(36).substring(2, 10);
    const password = Math.random().toString(36).substring(2, 10);
    let accessToken;

    const short = Math.random().toString(36).substring(2, 10)
    const short2 = Math.random().toString(36).substring(2, 10)
    
    test("setup", async () => {
        let req = {
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

        accessToken = JSON.parse(context.res.body).accessToken;
        expect(accessToken).toBeDefined();

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
    })

    test("Fail to delete", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: "wrongPassword",
                alsoDeleteURLs: false
            }
        }

        await deleteAccount(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Incorrect password");
    })


    test("Fail to delete 2", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                alsoDeleteURLs: false
            }
        }

        await deleteAccount(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Incorrect password");
    })

    test("User not found", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: "test",
                password: password,
                alsoDeleteURLs: false
            }
        }

        await deleteAccount(context, req);

        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("User not found");
    })

    test("Successfully delete account", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: password,
                alsoDeleteURLs: false
            }
        }

        await deleteAccount(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("Deleted Account");
    })


    test("Succesfully fail to log in", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: password,
            }
        }

        await signIn(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Failed to sign in");
    })

    test("Successfully determine URL", async () => {
        const req = {
            body: {
                short: short,
                data: JSON.stringify({
                    "URL Parameter": JSON.stringify("")
                }), headers: {
                    "x-forwarded-for": "100.128.0.0:00000"
                }
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com");
    })


    test("Succesfully reuse username", async () => {
        let req = {
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

        accessToken = JSON.parse(context.res.body).accessToken;
        expect(accessToken).toBeDefined();

        const req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: short2,
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
    })

    test("Successfully fail to retrieve conditionals of old short", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: short
            }
        }

        await getURL(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })

    test("Fail to recreate old short", async () => {
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

        expect(context.res.status).toBe(409);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL already exists");
    })



    test("Successfully delete account and URLs", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: password,
                alsoDeleteURLs: true
            }
        }

        await deleteAccount(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("Deleted Account");
    })


    test("Succesfully fail to log in", async () => {
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: password,
            }
        }

        await signIn(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Failed to sign in");
    })

    test("Successfully fail to determine URL", async () => {
        const req = {
            body: {
                short: short2,
                data: JSON.stringify({
                    "URL Parameter": JSON.stringify("")
                }), headers: {
                    "x-forwarded-for": "100.128.0.0:00000"
                }
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL not found");
    })
    
})

