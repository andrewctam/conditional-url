<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { Condition, updateMsgKey } from "../../types"
import AddConditionMenu from './AddConditionMenu.vue'
import ConditionBubble from './ConditionBubble.vue';


const props = defineProps<{
    i: number,
    first: boolean,
    last: boolean,
    and: boolean,
    conditions: Condition[],
    url: string
    redirects?: number
}>()


const showConditionMenu = ref(false)
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void;

const msg = computed(() => {
    if (props.first && props.last) {
        return "Always";
    } else if (props.last) {
        return "Else";
    } else if (props.first) {
        return "If";
    } else
        return "Else If";
})

const onlyOne = computed(() => {
    return props.first && props.last;
})

const handleUpdateURL = (e: Event) => {
    emit('updateURL', props.i, (e.target as HTMLInputElement).value);
}


const addCondition = (condition: Condition) => {
    for (const c of props.conditions) {
        if (c.variable === condition.variable && c.value === condition.value) {
            if (c.operator === condition.operator) {
                updateMsg("Duplicate condition!", true)
                return;
            }

            if ((c.operator === "=" && condition.operator === "≠") ||
                (c.operator === "≠" && condition.operator === "=") ||
                (c.operator === ">" && condition.operator === "≤") ||
                (c.operator === "≥" && condition.operator === "<") ||
                (c.operator === "<" && condition.operator === "≥") ||
                (c.operator === "≤" && condition.operator === ">")) {

                updateMsg(`New condition is the negation of an existing condition! Will always evaluate to ${props.and ? "false": "true"}!`, true)
                return;
            }
        }
    }

    showConditionMenu.value = false;
    emit('addCondition', props.i, condition);
}



const emit = defineEmits<{
    (event: 'delete', id: number): void,
    (event: 'updateURL', id: number, url: string): void
    (event: 'addCondition', id: number, condition: Condition): void,
    (event: 'removeCondition', id: number, conId: number): void,
    (event: 'toggleAnd', id: number): void
}>()
</script>

<template>
    <div class = "bg-white/5 hover:bg-black/5 border border-black/20 mb-4 mx-2 p-3 relative rounded select-none text-sm md:text-base">
        <button tabindex="-1" v-if="!onlyOne" @click = "$emit('delete', props.i)" class = "absolute top-0 right-2 text-lg text-red-400 hover:text-red-500">
            × 
        </button>

        <svg v-if="!onlyOne" xmlns="http://www.w3.org/2000/svg" class="handle cursor-grab z-30 absolute top-1 mx-auto left-0 right-0 text-white/20 hover:text-white/60" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path> <path d="M5 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path> <path d="M5 15m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path> <path d="M12 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path> <path d="M12 15m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path> <path d="M19 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path> <path d="M19 15m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
        </svg>

        <div class = "flex">
            <span class = "font-light text-white mr-1 h-fit">{{msg}}</span>

            <div v-if="!onlyOne && !props.last" class = "relative text-left">
                <div v-for="(condition, i) in conditions" class="mb-[2px]">
                    <ConditionBubble
                        :key = "i"
                        :id = "i"
                        :condition = "condition"
                        @delete = "emit('removeCondition', props.i, i)"
                    />

                    <span 
                        v-if="i != conditions.length - 1" 
                        @click="emit('toggleAnd', props.i)"
                        class = "font-light cursor-pointer text-sm"
                        :class = "props.and ? 'text-green-300' : 'text-purple-300'"
                    > 
                        {{props.and ? " and" : " or"}}
                    </span>
                </div>

                <span @click="showConditionMenu = !showConditionMenu" class = "cursor-pointer my-auto text-green-200 hover:text-green-300">
                    {{showConditionMenu ? "×" : "+"}}
                </span>

                <AddConditionMenu 
                    v-if="showConditionMenu"
                    @addCondition = "addCondition"
                />
            </div>

            <div v-else-if="props.conditions.length > 0" class="text-white/25 italic">Unused Conditions...</div>
        </div>

        <div class="mt-1 relative flex items-center text-xs sm:text-sm md:text-base">
            <p class = "my-auto mr-1 font-light text-white">Redirect to</p>
            <input 
                :value="props.url" 
                @input="handleUpdateURL" 
                type = "text" 
                class = "flex-grow pl-1 pr-14 text-white font-light bg-white/10 focus:outline-none placeholder:text-white/50" 
                :placeholder="`https://example.com/URL${props.i + 1}`"
            />

            <div class="absolute right-1 text-gray-400 text-xs font-light">
                {{"URL " + (i + 1)}}
            </div>
        </div>

        
    </div>
    
</template>