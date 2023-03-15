import { ObjectId } from "mongodb"

export const Operators = ["=", "≠", ">", "≥", "<", "≤", "Contains"]
export const Variables = ["Language", "Time", "Time Zone", "Date", "OS", "Browser", "URL Parameter", "Screen Width", "Screen Height", "Has Touchscreen", "Using Ad Blocker"] as const

export type Data = {
    [key in typeof Variables[number]]: string
}

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

export type User = {
    _id: string,
    uid: ObjectId,
    urls: string[],
    urlCount: number,
    hashedPassword: string,
    hashedRefresh: string
}

export type ShortURL = {
    _id: string, //short url, can change
    uid: ObjectId, //never changes
    conditionals: string,
    urlCount: number,
    owner: string,
    redirects: number[],
    firstPoint: number,
    deleted: boolean
}

export type DataPoint = {
    _id: ObjectId,
    urlUID: ObjectId,
    i: number, // index of redirected
    values: string[]
};

interface Redirects {
    _id: ObjectId,
    urlUID: ObjectId,
    [i: number]: number
}

export interface DataMin extends Redirects {
    unixMin: number
}

export interface DataHour extends Redirects {
    unixHour: number
}

export interface DataDay extends Redirects {
    unixDay: number
}
