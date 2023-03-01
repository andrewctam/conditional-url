
import { Context } from "@azure/functions";

import signUp from "../signUp/index";

test("Sign Up Fail 1", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        headers: {
            "Content-Type": "application/json"
        },
        body: {
            username: "Pass too short",
            password: ""
        }
    }

    await signUp(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid username or password");
})

test("Sign Up Fail 2", async () => {
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

    await signUp(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Invalid username or password");
})
