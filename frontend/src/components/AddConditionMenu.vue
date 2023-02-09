<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { Condition, Operators, Variables, browsers, operatingSystems, timezones, languages } from '../types'
import Guide from './Guide.vue'
export type Operator = typeof Operators[number]
export type Variable = typeof Variables[number]

const selectedVariable: Ref<typeof Variables[number]> = ref("Language");
const selectedOperator: Ref<typeof Operators[number]> = ref("=");
const value = ref("");
const param = ref("");
const error = ref("");
const emit = defineEmits<{
    (event: 'addCondition', condition: Condition): void
}>();

const valueOptions = computed(() => {
    switch(selectedVariable.value) {
        case "OS":
            return operatingSystems
        case "Browser":
            return browsers;
        case "Language":
            return languages;
        case "Time Zone":
            return timezones;
        default:
            return [];
    }
});

const opOptions = computed(() => {
    switch(selectedVariable.value) {
        case "Time":
        case "URL Parameter":
        case "Time Zone":
            return ["=", "!=", ">", ">=", "<", "<="];
        case "OS":
        case "Browser":
        case "Language":
            return ["=", "!="];
        default:
            return Operators;
    }
});

const updateError = (msg: string) => {
    error.value = msg;
    const timeout = setTimeout(() => {
        error.value = "";
        clearTimeout(timeout);
    }, 2000);
}

const checkAndCreate = () => {
    if (selectedVariable.value !== "URL Parameter" && value.value === "") {
        //url param can be blank
        updateError("Please specify a value");
        return;
    }

    if (selectedVariable.value === "URL Parameter" && param.value === "") {
        updateError("Please enter a parameter name");
        return;
    }

    if (selectedVariable.value === "Time" && !value.value.match(/^\d{2}:\d{2}$/)) {
        updateError("Please enter a valid time");
        return;
    }

    emit('addCondition', {
            variable: selectedVariable.value,
            operator: selectedOperator.value, 
            value: value.value,
            param: selectedVariable.value === 'URL Parameter' ? param.value : undefined
        })
}

</script>

<template>
    <div class = "p-2 ml-3 mb-1 w-fit bg-black/10 rounded-xl rounded-tl-none cursor-default text-center">
        <div v-if = "error" class = "fixed top-4 left-4 px-4 py-1 bg-red-100 border border-black/25 rounded text-red-500 text-center font-light">
            {{error}}
        </div>

        <form @submit.prevent="checkAndCreate" class = "flex items-center"> 
            <select v-model="selectedVariable"  class = "bg-transparent border h-8 mr-1 border-black/50 text-white rounded font-light">
                <option v-for="variable in Variables">{{variable}}</option>
            </select>

            <input v-if="selectedVariable === 'URL Parameter'" v-model="param" class = "bg-transparent border w-20 border-black/50 h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" type="text" placeholder="Param">
            
            <select v-model="selectedOperator" class = "bg-transparent border h-8 mr-1 border-black/50 text-white rounded font-light">
                <option v-for="op in opOptions">{{op}}</option>
            </select>

            <input v-if="selectedVariable === 'Time'" v-model="value" class = "bg-transparent border border-black/50 h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" type="time">
            <input v-else-if="selectedVariable === 'URL Parameter'" v-model="value" class = "bg-transparent border w-20 border-black/50 h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" type="text" placeholder="Value">
            <select v-else v-model="value" class = "bg-transparent border h-8 mr-1 border-black/50 text-white rounded font-light">
                <option v-for="op in valueOptions">{{op}}</option>
            </select>


            <button type="submit" class = "hover:bg-green-100/75 bg-green-100/50 border border-black/50 rounded h-8 py-1 px-2 text-sm font-light">
                Add
            </button>
        </form>


        <Guide :variable="selectedVariable" />
    </div>

</template>
