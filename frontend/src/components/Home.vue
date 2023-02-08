<script setup lang='ts'>
import { ref } from 'vue'
import type { Ref } from 'vue'
import ConditionalBlock from './ConditionalBlock.vue'
import draggable from 'vuedraggable'
import { Condition } from '../types'


interface Conditional {
    id: number,
    url: string,
    and: boolean
    conditions: Condition[]
}

const short = ref("");

const conditionals: Ref<Conditional[]> = ref([
    { 
        id: 0,
        url: "",
        and: true,
        conditions: []
    },
    { 
        id: 1,
        url: "",
        and: true,
        conditions: []
    }
]);
const i = ref(2);

const newConditional = () => {
    conditionals.value.push({
        id: i.value++,
        url: "",
        and: true,
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

const toggleAnd = (id: number) => {
    conditionals.value = conditionals.value.map((conditional) => {
        if (conditional.id == id) {
            conditional.and = !conditional.and;
        }
        return conditional;
    })
}

const createConditionalUrl = () => {
    if (short.value == "") {
        short.value = Math.random().toString(36).substring(2, 8);
    }

    for (let i = 0; i < conditionals.value.length; i++) {
        const c = conditionals.value[i];
        if (c.url == "") {
            alert("Please enter a URL for each conditional.");
            return;
        }
        if (c.conditions.length == 0 && i != conditionals.value.length - 1) {
            alert("Please enter at least one condition for each conditional.");
            return;
        }
    }

    //remove id
    let trimmed = conditionals.value.map((c, i) => {
        return {
            url: c.url,
            and: c.and,
            conditions: i == conditionals.value.length - 1 ? [] : c.conditions
        }
    })


    const str = JSON.stringify(trimmed)

    console.log(str);
    
}
</script>

<template>
    <div class = "w-fit mt-16 mx-auto text-center px-4">
        <a href = "./">
            <h1 class="text-black text-5xl font-extralight">
                Conditional URL
            </h1>
        </a>

        <p class = "font-light mt-2">
            Create a shortened URL that conditionally redirects visitors to different URLs.
        </p>
    </div>

    <div class = "lg:w-1/2 md:w-3/4 w-[95%] bg-black/10 pt-2 my-8 mx-auto border border-black/20 rounded-xl text-center relative">
        <div class = "mx-auto mt-2">
            <span class = "text-black font-extralight text-lg">conditional-url.web.app/</span>
            <input v-model = "short" type = "text" class = "text-gray-600 font-extralight w-[148px] bg-white/20 focus:outline-none placeholder:text-black/50 placeholder:text-center" placeholder="(optional custom url)"/>
        </div>


        <draggable v-model = "conditionals" item-key="id" class = "mt-4">
            <template #item="{element, index}">
                <ConditionalBlock
                    :key = "element.id"
                    :id = "element.id"
                    :and= " element.and"
                    :first = "index === 0"
                    :last = "index === conditionals.length - 1"
                    :conditions="element.conditions"
                    @delete = "deleteConditional"
                    @updateUrl = "updateConditionalUrl"
                    @addCondition = "addCondition"
                    @removeCondition = "removeCondition"
                    @toggleAnd = "toggleAnd"
                />
            </template>
        </draggable>

        <div @click = "newConditional" class = "mx-8 py-1 cursor-pointer text-center rounded bg-black/20 border border-black/20 text-green-100 text-sm font-light ">
            Add Block
        </div>

        <button @click = "createConditionalUrl" class = "w-full px-4 py-2 mt-8 rounded-b-xl bg-black/20 border-t border-t-black/10 text-white font-light mx-auto">
            Create Conditional URL
        </button>
    </div>

    
</template>

