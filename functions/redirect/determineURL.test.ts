
import { Context } from "@azure/functions";
import redirect from "./index";

test("Nonexistent url", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        body: {
            short: Math.random().toString(36).substring(2, 10),
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


test("Invalid short", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        body: {
            short: "",
            data: JSON.stringify({
                Language: "English",
                "URL Parameter": JSON.stringify("")
            }), headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }
    }

    await redirect(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Short URL contains invalid characters");
})


test("Invalid short 2", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        body: {
            short: "&",
            data: JSON.stringify({
                Language: "English",
                "URL Parameter": JSON.stringify("")
            }), headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }
    }

    await redirect(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Short URL contains invalid characters");
})



test("Invalid short 2", async () => {
    const context = ({ log: jest.fn() } as unknown) as Context;
    const req = {
        body: {
            short: "&",
            data: JSON.stringify({
                Language: "English",
                "URL Parameter": JSON.stringify("")
            }), headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }
    }

    await redirect(context, req);

    expect(context.res.status).toBe(400);
    expect(JSON.parse(context.res.body).msg).toBe("Short URL contains invalid characters");
})
