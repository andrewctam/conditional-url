export const Operators = ["=", "!=", ">", ">=", "<", "<=", "Contains"]
export const Variables = ["Language", "URL Parameter", "Time", "Time Zone", "OS", "Browser"]

export type Condition = {
    variable: typeof Variables[number],
    operator: typeof Operators[number],
    value: string,
    param?: string
}


export const operatingSystems = ["Windows", "MacOS", "Linux", "Android", "iOS"];
export const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Internet Explorer"];