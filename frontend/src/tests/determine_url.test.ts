import { expect, test } from 'vitest'
import { fetch } from 'cross-fetch'

interface Data {
    Language: string;
    Browser: string;
    OS: string;
    Time: string;
    'Time Zone': string;
    params: string;
}


async function fetchURL(data: Data) {
    const url = import.meta.env.VITE_DETERMINE_URL_LAMBDA;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "short": "Testing",
            "data": data
        })
    }).then((response) => {
        return response.json()
    }).catch((error) => {
        console.log(error)
    })

    return response;
}

/*
{   "url":"https://example.com/1",
    "and":true,"
    conditions":[
        {"variable":"Language","operator":"=","value":"English"},
        {"variable":"Time Zone","operator":"=","value":"+1"},
        {"variable":"Time","operator":"=","value":"12:52"},
        {"variable":"OS","operator":"=","value":"Linux"},
        {"variable":"Browser","operator":"=","value":"Safari"}]
},
*/
test('AND Test', async () => {
    const data = {
        Language: 'English',
        "Time Zone": "+1",
        Time: "12:52",
        OS: "Linux",
        Browser: 'Safari',
        params: JSON.stringify({})
    }

    const output = await fetchURL(data);
    const expected = "https://example.com/1"

    expect(output).toBe(expected)
})

/*
{"url":"https://example.com/2",
"and":false,
"conditions":
    [{"variable":"Language","operator":"=","value":"Spanish"},
    {"variable":"OS","operator":"=","value":"Android"},
    {"variable":"Time","operator":">=","value":"12:00"}]},
*/
test('OR Test 1', async () => {
    const data = {
        Language: 'Spanish',
        OS: "Linux",
        Time: "00:52",
        Browser: 'Safari',
        "Time Zone": "+1",
        params: JSON.stringify({})
    }

    const output = await fetchURL(data);
    const expected = "https://example.com/2"

    expect(output).toBe(expected)
})

test('OR Test 2', async () => {
    const data = {
        Language: 'English',
        Browser: 'Safari',
        Time: "00:52",
        OS: "Android",
        "Time Zone": "+1",
        params: JSON.stringify({})
    }

    const output = await fetchURL(data);
    const expected = "https://example.com/2"

    expect(output).toBe(expected)
})

test('OR Test 3', async () => {
    const data = {
        Language: 'English',
        Browser: 'Safari',
        Time: "14:00",
        OS: "Linux",
        "Time Zone": "+1",
        params: JSON.stringify({})
    }

    const output = await fetchURL(data);
    const expected = "https://example.com/2"

    expect(output).toBe(expected)
})


/*
{"url":"https://example.com/3",
"and":true,
"conditions":
    [{"variable":"URL Parameter","operator":"=","value":"1","param":"ONE"}]},
*/

test('Param Test', async () => {
    const data = {
        Language: 'French',
        Browser: 'Safari',
        Time: "01:00:",
        OS: "Linux",
        "Time Zone": "+1",
        params: JSON.stringify({"ONE": "1"})
    }

    const output = await fetchURL(data);
    const expected = "https://example.com/3"

    expect(output).toBe(expected)
})


//{"url":"https://example.com/4","and":true,"conditions":[]}
test('ELSE Test', async () => {
    const data = {
        Language: 'English',
        Browser: 'Safari',
        Time: "01:50",
        OS: "Linux",
        "Time Zone": "+1",
        params: JSON.stringify({})
    }

    const output = await fetchURL(data);
    const expected = "https://example.com/4"

    expect(output).toBe(expected)
})

//{"url":"https://example.com/4","and":true,"conditions":[]}
test('ELSE Test 2', async () => {
    const data = {
        Language: 'Other',
        Browser: 'Other',
        Time: "00:00",
        OS: "Other",
        "Time Zone": "Other",
        params: JSON.stringify({})
    }

    const output = await fetchURL(data);
    const expected = "https://example.com/4"

    expect(output).toBe(expected)
})


