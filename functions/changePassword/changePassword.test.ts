import { Context } from "@azure/functions";

import signUp from "../signUp/index";
import signIn from "../signIn/index";
import changePassword from "./index";

describe("Change password unit tests", () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    
    const username = Math.random().toString(36).substring(2, 10);
    const password = Math.random().toString(36).substring(2, 10);
    const newPassword = Math.random().toString(36).substring(2, 10);


    test("Successfully sign up", async () => {
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

    test("Successfully change password", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                oldPassword: password,
                newPassword: newPassword
            }
        }

        await changePassword(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("Password successfully changed");
    })

    test("Old password fail to login", async () => {
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

    test("New password successfully login", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                password: newPassword
            }
        }

        await signIn(context, req);

        expect(context.res.status).toBe(200);

        const body = JSON.parse(context.res.body);

        expect(body.username).toBe(username);
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();

    })


    test("Wrong password fail to change password", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                oldPassword: "wrongPassword",
                newPassword: password
            }
        }

        await changePassword(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Incorrect password");
    })

    test("Missing info fail to change password", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: username,
                newPassword: password
            }
        }

        await changePassword(context, req);

        expect(context.res.status).toBe(401);
        expect(JSON.parse(context.res.body).msg).toBe("Incorrect password");
    })

    test("User not found", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json"
            },
            body: {
                username: Math.random().toString(36).substring(2, 10),
                newPassword: password,
                oldPassword: newPassword
            }
        }

        await changePassword(context, req);

        expect(context.res.status).toBe(404);
        expect(JSON.parse(context.res.body).msg).toBe("User not found");
    })


})

