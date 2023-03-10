import { Context } from "@azure/functions";

import signUp, { User } from "../signUp/index";
import refreshTokens from "./index";
import jwt from "jsonwebtoken";
import  { connectDB, disconnectDB } from "../database";
import { createHmac } from "crypto";

describe("Refresh token tests", () => {
    let context = ({ log: jest.fn() } as unknown) as Context;
    let username = Math.random().toString(36).substring(2, 10);
    let password = Math.random().toString(36).substring(2, 10);
    let refreshToken;
    let accessToken;


    test("Sign up", async () => {
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
        refreshToken = body.refreshToken;
    })

    test("Bad token", async () => {
        const badToken = jwt.sign({ }, process.env.JWT_SECRET, { expiresIn: "1d" });

        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: badToken
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })

    test("Bad token 2", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: "badToken"
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })

    test("User not found", async () => {
        const badToken = jwt.sign({ username : Math.random().toString(36).substring(2, 10) }, process.env.JWT_SECRET, { expiresIn: "1d" });

        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: badToken
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("User not found");
    })

    test("Successfully refresh tokens", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: refreshToken
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(200);

        const body = JSON.parse(context.res.body);
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
    })

    test("Fail to refresh using access token", async () => {        
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: accessToken
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");
    })


    test("Successfully refresh using almost expired refresh token", async () => {        
        //artificially replace the user's refresh token with an almost expired one
        const almostExpiredRefresh = jwt.sign({ username : username }, process.env.JWT_SECRET, { expiresIn: "1hr" });

        const hashed = createHmac("sha256", process.env.JWT_SECRET)
                                    .update(almostExpiredRefresh)
                                    .digest("hex");

        const client = await connectDB();
        const usersColleciton = client.db("conditionalurl").collection<User>("users");
        await usersColleciton.updateOne({_id: username}, {
            $set: {
                hashedRefresh: hashed
            }
        });



        //refresh tokens, and verify that a new one is issued to us
        let req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: almostExpiredRefresh
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(200);
        const body = JSON.parse(context.res.body);

        expect(body.accessToken).toBeDefined();

        const newRefeshToken = body.refreshToken;
        expect(newRefeshToken).not.toBe(almostExpiredRefresh);


        //verify old refresh token is no longer valid
        req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: almostExpiredRefresh
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Invalid token");

        //verify new refresh token is valid
        req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                refreshToken: newRefeshToken
            }
        }

        await refreshTokens(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body).refreshToken).toBe(newRefeshToken);

        await disconnectDB();

    })

    

})

