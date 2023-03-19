import { connectDB, disconnectDB } from "../database";
import { Context } from "@azure/functions";

import createURL from "../createURL/index";
import redirect from "../redirect/index";
import { ShortURL } from "../types";

describe("Create and determine", () => {
    let context = ({ log: jest.fn() } as unknown) as Context;
    let randomShort = Math.random().toString(36).substring(2, 10);

    it("should successfully be created", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer NONE"
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
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
                        and: false,
                        conditions: [
                            {
                                variable: "Browser",
                                operator: "=",
                                value: "Chrome"
                            },
                            {
                                variable: "Time",
                                operator: ">",
                                value: "12:00"
                            }
                        ]
                    },
                    {
                        url: "https://example.com/3",
                        and: true,
                        conditions: [
                            {
                                variable: "URL Parameter",
                                operator: "=",
                                value: "1",
                                param: "Test"
                            }
                        ]
                    },
                    {
                        url: "https://example.com/4",
                        and: true,
                        conditions: [
                            {
                                variable: "OS",
                                operator: "≠",
                                value: "MacOS",
                            }
                        ]
                    },
                    {
                        url: "https://example.com/5",
                        and: true,
                        conditions: [
                            {
                                variable: "Date",
                                operator: "≤",
                                value: "2022-01-01",
                            }
                        ]
                    },
                    {
                        url: "https://example.com/6",
                        and: true,
                        conditions: [
                            {
                                variable: "Screen Width",
                                operator: "≥",
                                value: "1000",
                            }
                        ]
                    },
                    {
                        url: "https://example.com/7",
                        and: true,
                        conditions: [
                            {
                                variable: "Screen Height",
                                operator: "<",
                                value: "1000",
                            }
                        ]
                    },
                    {
                        url: "https://example.com/8",
                        and: true,
                        conditions: [
                            {
                                variable: "Country",
                                operator: "=",
                                value: "France",
                            }
                        ]
                    },
                    {
                        url: "https://example.com/9",
                        and: true,
                        conditions: [
                            {
                                variable: "Country",
                                operator: "=",
                                value: "United States",
                            }
                        ]
                    },
                    {
                        url: "https://example.com/10",
                        and: true,
                        conditions: []
                    }
                ])
            }
        }

        await createURL(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe(randomShort);
    })


    it("should fail to be created", async () => {
        const req = {
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer NONE"
            },
            body: {
                short: randomShort,
                conditionals: JSON.stringify([
                    {
                        url: "https://example.com/1",
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

    it("should be 1", async () => {

        const data = {
            Language: "English",
            Browser: "Chrome",
            Time: "13:00",
            "URL Parameter": JSON.stringify("")
        };


        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/1");
    })

    it("should be 2", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Chrome",
            Time: "01:00",
            "URL Parameter": JSON.stringify("")
        }


        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/2");
    })

    it("should also be 2", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "13:00",
            "URL Parameter": JSON.stringify("")
        }


        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/2");
    })

    it("should be 3", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": "Test=1"
        }


        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/3");
    })

    it("should be 4", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": JSON.stringify(""),
            OS: "Windows"
        }


        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/4");
    })

    it("should be 5", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": JSON.stringify(""),
            OS: "MacOS",
            Date: "2020-01-01"
        }


        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/5");
    })

    it("should be 6", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": JSON.stringify(""),
            OS: "MacOS",
            Date: "2022-01-02",
            "Screen Width": "1000"
        }

        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/6");
    })

    it("should be 7", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": JSON.stringify(""),
            OS: "MacOS",
            Date: "2022-01-02",
            "Screen Width": "999",
            "Screen Height": "999"
        }

        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/7");
    })

    it("should be 8", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": JSON.stringify(""),
            OS: "MacOS",
            Date: "2022-01-02",
            "Screen Width": "999",
            "Screen Height": 1000
        }

        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "217.70.180.148:00000"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/8");
    })



    it("should be 9", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": JSON.stringify(""),
            OS: "MacOS",
            Date: "2022-01-02",
            "Screen Width": "999",
            "Screen Height": 1000
        }

        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, 
            /*
            should default to 100.128.0.0 if not provided
            headers: {
                "x-forwarded-for": "100.128.0.0:00000"
            }
            */
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/9");
    })


    it("should be 10", async () => {
        const data = {
            Language: "Spanish",
            Browser: "Safari",
            Time: "01:00",
            "URL Parameter": JSON.stringify(""),
            OS: "MacOS",
            Date: "2022-01-02",
            "Screen Width": "999",
            "Screen Height": 1000
        }

        const req = {
            body: {
                short: randomShort,
                data: JSON.stringify(data)
            }, headers: {
                "x-forwarded-for": "203.0.178.191"
            }
        }

        await redirect(context, req);

        expect(context.res.status).toBe(200);
        expect(JSON.parse(context.res.body)).toBe("https://example.com/10");
    })


    test("verify redirect nums", async () => {
        const client = await connectDB();
        const urlsCollection = client.db("conditionalurl").collection<ShortURL>("urls");
        const url = await urlsCollection.findOne({_id: randomShort});
        await disconnectDB();

        expect(url.redirects).toStrictEqual([1, 2, 1, 1, 1, 1, 1, 1, 1, 1])
    });

})
