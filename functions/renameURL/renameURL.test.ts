import { Context } from "@azure/functions";
import renameUrl from "./index"
import signUp from "../signUp/index";
import createUrl from "../createUrl/index";
import deleteUrl from "../deleteUrl/index";
import jwt from "jsonwebtoken";

test("Bad short", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE" 
        },
        body: {
            oldShort: "example",
            newShort: ""
        }
    }

    await renameUrl(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Short URL contains invalid characters");
})


test("Bad short 2", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE" 
        },
        body: {
            oldShort: "example",
            newShort: "&"
        }
    }

    await renameUrl(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Short URL contains invalid characters");
})



test("Bad token", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer badToken" 
        },
        body: {
            oldShort: "example",
            newShort: "example2"
        }
    }

    await renameUrl(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");

})


test("Bad token 2", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "" 
        },
        body: {
            oldShort: "example",
            newShort: "example2"
        }
    }

    await renameUrl(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("No token provided");
})


test("Bad token 3", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json",
            "authorization": "Bearer NONE"
        },
        body: {
            oldShort: "example",
            newShort: "example2"
        }
    }

    await renameUrl(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
})

describe("Setup", () => {
    let accessToken;
    let accessToken2;
    const short = Math.random().toString(36).substring(2, 18);
    const newShort = Math.random().toString(36).substring(2, 18);
    const existingShort = Math.random().toString(36).substring(2, 18);

    const user2Short = Math.random().toString(36).substring(2, 18);
    
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
            
        let req2 = {
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


        req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                short: existingShort,
                conditionals: JSON.stringify({
                    url: "https://example.com",
                    and: true,
                    conditions: []
                })
            }
        }

        await createUrl(context, req2);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(existingShort);


        req2 = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken2
            },
            body: {
                short: user2Short,
                conditionals: JSON.stringify({
                    url: "https://example.com",
                    and: true,
                    conditions: []
                })
            }
        }

        await createUrl(context, req2);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(user2Short);

    });



    test("User not owner", async () => {
        const badAccessToken = jwt.sign( {}, process.env.JWT_SECRET, { expiresIn: "1h" } );
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken 
            },
            body: {
                oldShort: short,
                newShort: newShort
            }
        }

        await renameUrl(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })

    test("User not owner 2", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken2
            },
            body: {
                oldShort: short,
                newShort: newShort
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Unauthorized");
    })



    test("User not owner 3", async () => {
        const badAccessToken = jwt.sign( {username: Math.random().toString(36).substring(2, 10)}, process.env.JWT_SECRET, { expiresIn: "1h" } );
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + badAccessToken 
            },
            body: {
                oldShort: short,
                newShort: newShort
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("User not found");
    })


    test("Rename to existing fail", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            body: {
                oldShort: short,
                newShort: existingShort
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(409);
        expect(JSON.parse(context.res.body).msg).toBe("New URL already exists");
    })

    test("Rename to new success", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken 
            },
            body: {
                oldShort: short,
                newShort: newShort
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("URL renamed")
    })

    test("Another user can not rename to old short", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken2
            },
            body: {
                oldShort: user2Short,
                newShort: short
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(409);
        expect(JSON.parse(context.res.body).msg).toBe("New URL already exists");
    })


    test("Original user can rename to old short", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                oldShort: newShort,
                newShort: short
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("URL renamed")
    })

    test("Another user can not rename to deleted short", async () => {
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
    
        await deleteUrl(context, req);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("URL deleted")
    })

    test("Another user can not rename to deleted short", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken2
            },
            body: {
                oldShort: user2Short,
                newShort: short
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(409);
        expect(JSON.parse(context.res.body).msg).toBe("New URL already exists");
    })

    test("Original user can rename to deleted short", async () => {
        const context = ({ log: jest.fn() } as unknown) as Context;
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + accessToken
            },
            body: {
                oldShort: existingShort,
                newShort: short
            }
        }
    
        await renameUrl(context, req);
    
        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("URL renamed");
    })



    
})
