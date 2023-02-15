<script setup lang="ts">
import { computed, ref } from 'vue'
import { Condition } from "../../types"
import AddConditionMenu from './AddConditionMenu.vue'
import ConditionDisplay from './ConditionDisplay.vue'


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

const handleUpdateUrl = (e: Event) => {
    emit('updateUrl', props.i, (e.target as HTMLInputElement).value);
}


const addCondition = (condition: Condition) => {
    showConditionMenu.value = false;
    emit('addCondition', props.i, condition);
}



const emit = defineEmits<{
    (event: 'delete', id: number): void,
    (event: 'updateUrl', id: number, url: string): void
    (event: 'addCondition', id: number, condition: Condition): void,
    (event: 'removeCondition', id: number, conId: number): void,
    (event: 'toggleAnd', id: number): void
}>()
</script>

<template>
    <div class = "bg-white/5 hover:bg-black/10 border border-black/20 my-4 mx-2 p-3 relative rounded cursor-move select-none">
      
        

        <button tabindex="-1" v-if="!onlyOne" @click = "$emit('delete', props.i)" class = "absolute top-0 right-2 text-lg text-red-400 hover:text-red-500">
            

            × 
        </button>

       


        <div class = "flex">
            <span class = "font-light text-white mr-1 h-fit">{{msg}}</span>

            <div v-if="!onlyOne && !props.last" class = "relative text-left">
                <div v-for="(condition, i) in conditions">
                    <ConditionDisplay
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

                <span @click="showConditionMenu = !showConditionMenu" class = "cursor-pointer my-auto relative text-green-200 hover:text-green-300">
                    {{showConditionMenu ? "×" : "+"}}
                </span>


                <AddConditionMenu 
                    v-if="showConditionMenu"
                    @addCondition = "addCondition"
                />
            </div>

            <div v-else-if="props.conditions.length > 0" class="text-white/25 italic"> Unused Conditions...</div>
        </div>

        <div class="flex mt-1 relative">
            <span v-if="redirects !== undefined" class = "text-green-200 text-xs font-light absolute -top-4 right-0">
                {{  `${props.redirects} redirect${props.redirects === 1 ? "" : "s"}` }}
            </span>
            <p class = "my-auto mr-1 font-light text-white"> Redirect to</p>
            <input 
                :value="props.url" 
                @input="handleUpdateUrl" 
                type = "text" class = "flex-grow pl-1 text-white font-light bg-white/10 focus:outline-none placeholder:text-white/50" placeholder="https://example.com"/>
        </div>
    </div>
    
</template>