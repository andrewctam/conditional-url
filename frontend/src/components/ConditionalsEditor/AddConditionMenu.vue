<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import type { Ref } from 'vue'
import { Condition, Operators, Variables, browsers, operatingSystems, timezones, languages, booleans, updateMsgKey, countryCodes } from '../../types'
import Guide from './Guide.vue'
export type Operator = typeof Operators[number]
export type Variable = typeof Variables[number]

const selectedVariable: Ref<Variable> = ref("Language");
const selectedOperator: Ref<Operator> = ref("=");
const value = ref("");
const param = ref("");

const emit = defineEmits<{
    (event: 'addCondition', condition: Condition): void
}>();

const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void;

const valueOptions = computed(() => {
    switch(selectedVariable.value) {
        case "Country":
            return Object.values(countryCodes);
        case "OS":
            return operatingSystems;
        case "Browser":
            return browsers;
        case "Language":
            return languages;
        case "Time Zone":
            return timezones;
        case "Has Touchscreen":
        case "Using Ad Blocker":
            return booleans;
        default:
            return [];
    }
});

const operatorOptions = computed(() => {
    switch(selectedVariable.value) {
        case "Time":
        case "URL Parameter":
        case "Time Zone":
        case "Date":
        case "Screen Width":
        case "Screen Height":
            return ["=", "≠", ">", "≥", "<", "≤"];
        case "Country":
        case "OS":
        case "Browser":
        case "Language":
            return ["=", "≠"];
        case "Has Touchscreen":
        case "Using Ad Blocker":
            return ["="];
        default:
            return Operators;
    }
});

const checkAndCreate = () => {
    if (selectedVariable.value !== "URL Parameter" && value.value === "") {
        //url param can be blank
        updateMsg("Please specify a value", true);
        return;
    }

    if (selectedVariable.value === "URL Parameter") {
        if (param.value === "") {
            updateMsg("Please enter a parameter name", true);
            return;
        }

        if (!/^[a-zA-Z0-9]*$/.test(param.value)) {
            updateMsg("Parameter name can only contain letters and numbers", true);
            return;
        }

        if (!/^[a-zA-Z0-9]*$/.test(value.value)) {
            updateMsg("Parameter value can only contain letters and numbers", true);
            return;
        }
    }

    if (selectedVariable.value === "Time" && !value.value.match(/^\d{2}:\d{2}$/)) {
        updateMsg("Please enter a valid time", true);
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
        <form @submit.prevent="checkAndCreate" class = "block md:flex md:items-center"> 
            <select v-model="selectedVariable"  class = "border h-8 mr-1 border-black/50 text-white rounded font-light bg-emerald-600/20">
                <option class="bg-gray-600" v-for="variable in Variables">{{variable}}</option>
            </select>

            <input 
                v-if="selectedVariable === 'URL Parameter'" 
                v-model="param" 
                class = "bg-emerald-600/20 border w-24 border-black/50 h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" 
                type="text" 
                placeholder="Parameter">
            
            <select v-model="selectedOperator" class = "border h-8 mr-1 border-black/50 text-white rounded font-light bg-emerald-600/20">
                <option class="bg-gray-600" v-for="op in operatorOptions">{{op}}</option>
            </select>
            


            <input v-if="selectedVariable === 'Time'" 
                v-model="value" 
                type="time" 
                class = "bg-emerald-600/20 border border-black/50 h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" >

            <input v-else-if="selectedVariable === 'Date'" 
                v-model="value" 
                type="date" 
                class = "bg-emerald-600/20 border border-black/50 h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" >

            <input v-else-if="selectedVariable === 'Screen Width' || selectedVariable === 'Screen Height'" 
                v-model="value" 
                type="number"
                class = "bg-emerald-600/20 border border-black/50 h-8 mr-1 w-24 rounded font-light pl-1 text-white placeholder:text-white/50" >

            <input v-else-if="selectedVariable === 'URL Parameter'" 
                v-model="value" 
                type="text" 
                placeholder="Value" 
                class = "bg-emerald-600/20 border w-24 border-black/50 h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50">

            <select v-else v-model="value" class = "border h-8 mr-1 border-black/50 text-white rounded font-light bg-emerald-600/20">
                <option class="bg-gray-600" v-for="op in valueOptions">{{op}}</option>
            </select>


            
            <button type="submit" class = "hover:bg-emerald-600/50 bg-emerald-600/20 text-white border border-black/50 rounded h-8 py-1 px-2 text-sm font-light">
                Add
            </button>
        </form>


        <Guide :variable="selectedVariable" />
    </div>

</template>
