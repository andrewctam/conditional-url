<script setup lang="ts">
import { computed, ref } from 'vue'
import { Condition } from "../types"
import ConditionMenu from './ConditionMenu.vue'
import ConditionDisplay from './ConditionDisplay.vue'


const props = defineProps<{
    id: number,
    first: boolean,
    last: boolean,
    conditions: Condition[]
}>()


const showConditionMenu = ref(false)

const msg = computed(() => {
    if (props.first && props.last) {
        return "";
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
    emit('updateUrl', props.id, (e.target as HTMLInputElement).value);
}


const addCondition = (condition: Condition) => {
    showConditionMenu.value = false;
    emit('addCondition', props.id, condition);
}



const emit = defineEmits<{
    (event: 'delete', id: number): void,
    (event: 'updateUrl', id: number, url: string): void
    (event: 'addCondition', id: number, condition: Condition): void,
    (event: 'removeCondition', id: number, conId: number): void
}>()
</script>

<template>
    <div class = "bg-gray-500/20 border border-black/20 my-4 mx-8 p-2 relative rounded cursor-move">
        <button v-if="!onlyOne" @click = "$emit('delete', props.id)" class = "absolute top-0 right-2 text-lg text-red-400">
            × 
        </button>

        <div class = "flex items-left">
            <span class = "font-light text-white mr-1 h-fit">{{msg}}</span>

            <div v-if="!onlyOne && !props.last" class = "relative text-left">
                <div v-for="(condition, i) in conditions">
                    <ConditionDisplay
                        :key = "i"
                        :id = "i"
                        :condition = "condition"
                        @delete = "emit('removeCondition', props.id, i)"
                    />

                    <span v-if="i != conditions.length - 1" class = "text-green-100 font-light"> and</span>
                </div>

                <span @click="showConditionMenu = !showConditionMenu" class = "font-bold cursor-pointer text-green-200 my-auto relative">
                    +
                </span>

                <ConditionMenu 
                    v-if="showConditionMenu"
                    @addCondition = "addCondition"
                />

            </div>
        </div>

        <div class="flex mt-1">
            <p class = "my-auto mr-1 font-light text-white"> Redirect to</p>
            <input @change="handleUpdateUrl" type = "text" class = "flex-grow pl-1 text-white bg-transparent bg-gradient-to-r from-white/10 focus:outline-none placeholder:text-white/50" placeholder="URL"/>
        </div>
    </div>
    
</template>