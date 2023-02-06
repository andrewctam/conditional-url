<script setup lang='ts'>
import { ref } from 'vue'
import type { Ref } from 'vue'
import Conditional from './Conditional.vue'
import draggable from 'vuedraggable'
import { Condition } from '../types'




interface Conditional {
    id: number,
    url: string,
    conditions: Condition[]
}

const short = ref("");
const i = ref(1);
const conditionals: Ref<Conditional[]> = ref([
    { 
        id: 0,
        url: "",
        conditions: []
    }
]);

const newConditional = () => {
    conditionals.value.push({
        id: i.value++,
        url: "",
        conditions: []
    })
}

const updateConditionalUrl = (id: number, url: string) => {
    conditionals.value = conditionals.value.map((conditional) => {
        if (conditional.id == id) {
            conditional.url = url;
        }
        return conditional;
    })
}

const deleteConditional = (id: number) => {
    if (conditionals.value.length == 1) 
        return;

    conditionals.value = conditionals.value.filter((conditional) => {
        return conditional.id != id;
    })
}

const addCondition = (id: number, condition: Condition) => {
    conditionals.value = conditionals.value.map((conditional) => {
        if (conditional.id == id) {
            conditional.conditions.push(condition);
        }
        return conditional;
    })
}

const removeCondition = (id: number, i: number) => {
    conditionals.value = conditionals.value.map((conditional) => {
        if (conditional.id == id) {
            conditional.conditions.splice(i, 1);
        }
        return conditional;
    })
}
</script>

<template>
    <h1 class="text-black mt-16 text-5xl text-center font-extralight">
        Conditional URL
    </h1>

    <div class = "lg:w-1/2 md:w-3/4 w-[95%] pt-2 my-8 mx-auto border border-black/10 rounded bg-black/30 text-center relative">
        <div class = "mx-auto">
            <span class = "text-white font-light text-lg">conditional-url.web.app/</span>
            <input v-model = "short" type = "text" class = "text-white font-light  bg-white/20 focus:outline-none placeholder:text-white/90" placeholder="(optional custom url)"/>
        </div>


        <draggable v-model = "conditionals" item-key="id" class = "mt-4">
            <template #item="{element, index}">
                <Conditional
                    :key = "element.id"
                    :id = "element.id"
                    :first = "index === 0"
                    :last = "index === conditionals.length - 1"
                    :conditions="element.conditions"
                    @delete = "deleteConditional"
                    @updateUrl = "updateConditionalUrl"
                    @addCondition = "addCondition"
                    @removeCondition = "removeCondition"
                />
            </template>
        </draggable>

        <button @click = "newConditional" class = "px-4 py-2 mt-2 text-sm bg-black/20 text-white rounded-lg mx-auto">
            Add a Condition
        </button>

        <button class = "w-full px-4 py-2 mt-8 bg-green-800/10 border-t border-t-black/20 text-white mx-auto">
            Create Conditional URL
        </button>
    </div>

    
</template>

