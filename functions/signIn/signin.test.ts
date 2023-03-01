
import { Context } from "@azure/functions";

import signIn from "../signIn/index";

test("Sign In Fail 1", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json"
        },
        body: {
            username: "",
            password: ""
        }
    }

    await signIn(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Failed to sign in");
})


test("Sign In Fail 2", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json"
        },
        body: {
            username: "&<Invalid Chars",
            password: ""
        }
    }

    await signIn(context, req);

    expect(context.res.status).toBe(401);
    expect(JSON.parse(context.res.body).msg).toBe("Failed to sign in");
})
