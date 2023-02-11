export const Operators = ["=", "!=", ">", ">=", "<", "<=", "Contains"]
export const Variables = ["Language", "Time", "Time Zone", "OS", "Browser", "URL Parameter"]

export type Condition = {
    variable: typeof Variables[number],
    operator: typeof Operators[number],
    value: string,
    param?: string
}

export interface Conditional {
    id: number,
    url: string,
    and: boolean
    conditions: Condition[]
}


export const operatingSystems = ["Windows", "MacOS", "Linux", "Android", "iOS"];
export const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"];
export const timezones = ["-12", "-11", "-10", "-9:30", "-9", "-8", "-7", "-6", "-5", "-4", "-3", "-2", "-1", "0", "+1", "+2", "+3", "+3:30", "+4", "+4:30", "+5", "+5:30", "+5:45", "+6", "+6:30", "+7", "+8", "+8:45", "+9", "+9:30", "+10", "+10:30", "+11", "+12", "+12:45", "+13", "+14"]
export const languages = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese", "Japanese", "Korean", "Hindi"]

export const enum AccountAction {
    None, SignIn, SignUp
}

export interface Data {
    "Language": string,
    "Browser": string,
    "OS": string,
    "Time": string,
    'Time Zone': string,
    "params": string
}