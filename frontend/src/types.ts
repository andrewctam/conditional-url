import { InjectionKey } from "vue";
import type { Ref } from "vue";

export const Operators = ["=", "≠", ">", "≥", "<", "≤", "Contains"]
export const Variables = ["Language", "Country", "Time", "Time Zone", "Date", "OS", "Browser", "URL Parameter", "Screen Width", "Screen Height", "Has Touchscreen", "Using Ad Blocker"]

export type Condition = {
    variable: typeof Variables[number],
    operator: typeof Operators[number],
    value: string,
    param?: string
}

export interface Conditional {
    url: string,
    and: boolean
    conditions: Condition[],
    redirects?: number
}


export const countries = ["Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Czechia", "Denmark", "Egypt", "Finland", "France", "Germany", "Greece", "Hungary", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Kazakhstan", "Kenya", "Kuwait", "Malaysia", "Mexico", "Netherlands", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Singapore", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Vietnam"]
export const operatingSystems = ["Windows", "MacOS", "Linux", "Android", "iOS"];
export const browsers = ["Chrome", "Firefox", "Safari", "Edge", "Opera"];
export const timezones = ["-12", "-11", "-10", "-9:30", "-9", "-8", "-7", "-6", "-5", "-4", "-3", "-2", "-1", "0", "+1", "+2", "+3", "+3:30", "+4", "+4:30", "+5", "+5:30", "+5:45", "+6", "+6:30", "+7", "+8", "+8:45", "+9", "+9:30", "+10", "+10:30", "+11", "+12", "+12:45", "+13", "+14"]
export const languages = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Russian", "Chinese", "Japanese", "Korean", "Hindi"]
export const booleans = ["True", "False"]

export const enum AccountAction {
    CreateURL, SignIn, SignUp, ViewURLs, Settings
}

export interface Data {
    [key: typeof Variables[number]]: string
}

export const usernameKey: InjectionKey<Ref<string>> = Symbol('username')
export const accessTokenKey: InjectionKey<Ref<string>> = Symbol('accessToken')
export const refreshTokensKey: InjectionKey<() => Promise<boolean>> = Symbol('refreshToken')
export const updateMsgKey: InjectionKey<(str: string, err?: boolean ) => void> = Symbol('updateMsg')

