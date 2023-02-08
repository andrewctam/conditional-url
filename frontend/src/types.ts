export const Operators = ["=", "!=", ">", ">=", "<", "<=", "Contains"]
export const Variables = ["Language", "Time", "Time Zone", "OS", "Browser", "URL Parameter"]

export type Condition = {
    variable: typeof Variables[number],
    operator: typeof Operators[number],
    value: string,
    param?: string
}

export const reserved = ["docs"]

export const operatingSystems = ["Windows", "MacOS", "Linux", "Android", "iOS"];
export const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"];
export const languages = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese", "Japanese", "Korean", "Hindi"]
