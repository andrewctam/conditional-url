<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { Condition, Operators, Variables, browsers, operatingSystems } from '../types'
import Guide from './Guide.vue'
export type Operator = typeof Operators[number]
export type Variable = typeof Variables[number]

const selectedVariable: Ref<typeof Variables[number]> = ref("Language");
const selectedOperator: Ref<typeof Operators[number]> = ref("=");
const value = ref("");
const param = ref("");
const emit = defineEmits<{
    (event: 'addCondition', condition: Condition): void
}>();

const valueOptions = computed(() => {
    switch(selectedVariable.value) {
        case "OS":
            return operatingSystems
        case "Browser":
            return browsers;
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
            return ["=", "!="];
        case "Language":
            return ["=", "!=", "Contains"];
        default:
            return Operators;
    }
});


</script>

<template>
    <div class = "p-2 ml-3 w-fit bg-white/20 rounded-xl rounded-tl-none cursor-default text-center">
        <select v-model="selectedVariable"  class = "bg-transparent border h-8 mr-1 border-black text-white rounded font-light">
            <option v-for="variable in Variables">{{variable}}</option>
        </select>

        <input v-if="selectedVariable === 'URL Parameter'" v-model="param" class = "bg-transparent border w-20 border-black h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" type="text" placeholder="Param">
        
        <select v-model="selectedOperator" class = "bg-transparent border h-8 mr-1 border-black text-white rounded font-light">
            <option v-for="op in opOptions">{{op}}</option>
        </select>

        <input v-if="selectedVariable === 'Time'" v-model="value" class = "bg-transparent border border-black h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" type="time">
        <input v-else-if="selectedVariable === 'URL Parameter'" v-model="value" class = "bg-transparent border w-20 border-black h-8 mr-1 rounded font-light pl-1 text-white placeholder:text-white/50" type="text" placeholder="Value">
        <input v-else-if="selectedVariable === 'Time Zone'" v-model="value" class = "bg-transparent border w-20 border-black h-8 mr-1 rounded font-light pl-1 text-white text-sm placeholder:text-white/50" type="text" placeholder="Offset">
        <input v-else-if="selectedVariable === 'Language'" v-model="value" class = "bg-transparent border w-20 border-black h-8 mr-1 rounded font-light pl-1 text-white text-sm placeholder:text-white/50" type="text" placeholder="en-us">
        <select v-else v-model="value" class = "bg-transparent border h-8 mr-1 border-black text-white rounded font-light">
            <option v-for="op in valueOptions">{{op}}</option>
        </select>


        <button @click="$emit('addCondition', {
                    variable: selectedVariable,
                    operator: selectedOperator, 
                    value: value,
                    param: selectedVariable === 'URL Parameter' ? param : undefined
                })"
                class = "bg-green-100/50 border border-black/25 rounded h-8 py-1 px-2 mt-1 text-sm font-light">
                Create
        </button>


        <Guide :variable="selectedVariable" />
    </div>

</template>
