import { Context } from "@azure/functions";

import createURL from "../createURL/index";
import signUp from "../signUp/index";
import signIn from "../signIn/index";
import getURL from "../getURL/index";
import getUserURLs from "../getUserURLs/index";
import updateURL from "../updateURL/index";
import renameURL from "../renameURL/index";
import deleteURL from "../deleteURL/index";
import redirect from "../redirect/index";
import deleteAccount from "../deleteAccount/index";

describe("Sign up, Login, and Create/Edit URLs", () => {
    let context = ({ log: jest.fn() } as unknown) as Context;
    let randomShort = Math.random().toString(36).substring(2, 10);
    let randomShort2 = Math.random().toString(36).substring(2, 10);

    let username = Math.random().toString(36).substring(2, 10);
    let password = Math.random().toString(36).substring(2, 10);
    let accessToken;

    const conditionals1 = JSON.stringify([
        {
            url: "https://example.com/1",
            and: true,
            conditions: [
                {
                    variable: "Language",
                    operator: "=",
                    value: "English"
                }
            ]
        },
        {
            url: "https://example.com/2",
            and: true,
            conditions: []
        }
    ]);


    const conditionals2 = JSON.stringify([
        {
            url: "https://example.org/1",
            and: true,
            conditions: [
                {
                    variable: "Language",
                    operator: "=",
                    value: "English"
                }
            ]
        },
        {
            url: "https://example.org/2",
            and: false,
            conditions: [
                {
                    variable: "Browser",
                    operator: "=",
                    value: "Chrome"
                }
            ]
        },
        {
            url: "https://example.org/3",
            and: true,
            conditions: []
        }
    ]);


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
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
    })

    it("should fail to sign up", async () => {
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

        expect(context.res.status).toBe(400);
        expect(JSON.parse(context.res.body).msg).toBe("Username already exists");
    })

    it("should fail to login", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: "1"
            }
        }

        await signIn(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Failed to sign in");
    })

    it("should successfully login", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: password
            }
        }

        await signIn(context, req);

        expect(context.res.status).toBe(200);
        const body = JSON.parse(context.res.body);
        expect(body.username).toBe(username);
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();

        accessToken = body.accessToken;
    })


    it("should successfully be created", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: conditionals1
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
    })

    it("should successfully be in user's list", async () => {
        const req = {
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

        const body = JSON.parse(context.res.body);
        expect(body.page).toBe(0);
        expect(body.pageCount).toBe(1);
        expect(body.paginatedURLs).toStrictEqual([randomShort]);
    })

    it("should successfully be retrieved", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort
            }
        }

        await getURL(context, req);

        expect(context.res.status).toBe(200);

        const body = JSON.parse(context.res.body);
        expect(body.conditionals).toStrictEqual(JSON.parse(conditionals1));
    })

    it("should successfully be edited", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: conditionals2
            }
        }

        await updateURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
    })

    it("should successfully be retrieved with updated", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort
            }
        }

        await getURL(context, req);

        expect(context.res.status).toBe(200);

        const body = JSON.parse(context.res.body);
        expect(body.conditionals).toStrictEqual(JSON.parse(conditionals2));
    })

    it("should successfully be renamed", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                oldShort: randomShort,
                newShort: randomShort2
            }
        }

        await renameURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("URL renamed");
    })


    it("should successfully be retrieved with updated name", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort2
            }
        }

        await getURL(context, req);

        expect(context.res.status).toBe(200);

        const body = JSON.parse(context.res.body);
        expect(body.conditionals).toStrictEqual(JSON.parse(conditionals2));
    })



    it("should successfully be in user's list after rename", async () => {
        const req = {
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

        const body = JSON.parse(context.res.body);
        expect(body.page).toBe(0);
        expect(body.pageCount).toBe(1);
        expect(body.paginatedURLs).toStrictEqual([randomShort2]);
    })

    

    it("should not find old URL", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            body: {
                short: randomShort,
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
    })

    it("should not be be created again by Guest", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer NONE"
            },
            body: {
                short: randomShort,
                conditionals: conditionals1
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(409);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL already exists");
    })


    it("should be created again by user", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: conditionals1
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
    })

    it("should be deleted by user", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort
            }
        }

        await deleteURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("URL deleted");
    })

    
    it("should not find old URL", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            body: {
                short: randomShort,
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
    })

    it("should not be be created again by Guest", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer NONE"
            },
            body: {
                short: randomShort,
                conditionals: conditionals1
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(409);
        expect(JSON.parse(context.res.body).msg).toBe("Short URL already exists");
    })


    it("should be created again by user", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: randomShort,
                conditionals: conditionals1
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
    })
    
    it("should successfully delete account", async () => {
        const req = {
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

    it("should fail to login", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: password
            }
        }

        await signIn(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Failed to sign in");
    })

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
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();

        accessToken = body.accessToken;
    })



    it("should not find old url in user's list after account deleted", async () => {
        const req = {
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

        const body = JSON.parse(context.res.body);
        expect(body.noURLs).toBe(true);
    })


    it("should fail be retrieved after account deleted", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            query: {
                short: randomShort
            }
        }

        await getURL(context, req);
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("You do not own this URL");
    })

    


    it("should still find old url", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify({
                    Language: "English",
                    "URL Parameter": JSON.stringify("")
                }), headers: {
                    "x-forwarded-for": "100.128.0.0:00000"
                }
            }
        }
    
        await redirect(context, req);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/1");

    })






})

