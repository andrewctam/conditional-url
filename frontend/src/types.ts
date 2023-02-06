export const Operators = ["=", "!=", ">", ">=", "<", "<="]
export const Variables = ["Location", "Local Time", "Unix Time", "Timezone", "Device", "OS"]

export type Condition = {
    variable: typeof Variables[number],
    operator: typeof Operators[number],
    value: string
}

