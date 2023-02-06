<script setup lang="ts">
import {ref } from 'vue'
import type { Ref } from 'vue'
import { Condition, Operators, Variables } from '../types'

export type Operator = typeof Operators[number]
export type Variable = typeof Variables[number]

const selectedVariable: Ref<typeof Variables[number]> = ref("Location");
const selectedOperator: Ref<typeof Operators[number]> = ref("=");
const value: Ref<string> = ref("");


const emit = defineEmits<{
    (event: 'addCondition', condition: Condition): void
}>();

</script>

<template>
    <div class = "p-2 w-fit bg-white/20 rounded-xl rounded-tl-none cursor-default text-center">
        <select v-model="selectedVariable"  class = "bg-transparent border h-8 mr-1 border-black text-white rounded font-light">
            <option v-for="variable in Variables">{{variable}}</option>
        </select>
        
        <select v-model="selectedOperator" class = "bg-transparent border h-8 mr-1 border-black text-white rounded font-light">
            <option v-for="op in Operators">{{op}}</option>
           
        </select>

        <input v-model="value" class = "bg-transparent border border-black h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" type="text" placeholder="Value">

        <button @click="$emit('addCondition', {
                    variable: selectedVariable,
                    operator: selectedOperator, 
                    value: value
                })"
                class = "bg-green-100 border border-black/10 rounded h-8 py-1 px-2 mt-1 text-sm font-light">
                Create
        </button>
    </div>
</template>
