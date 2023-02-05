<script setup lang='ts'>
import { ref } from 'vue'
import type { Ref } from 'vue'
import Conditional from './Conditional.vue'
import draggable from 'vuedraggable'

interface Conditional {
    id: number,
    url: string
}

const i = ref(1);
const short = ref("");
const conditionals: Ref<Conditional[]> = ref([
    { 
        id: 0,
        url: "",
    }
]);

const newConditional = () => {
    conditionals.value.push({
        id: i.value++,
        url: ""
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



</script>

<template>
    <div class="mt-6">
        <h1 class="text-black text-3xl` text-center">
            Conditional URL
        </h1>

        <div class = "lg:w-1/2 md:w-3/4 w-[95%] py-8 mt-5 mx-auto border border-black/20 rounded bg-black/5 text-center">
            <div class = "mx-auto w-fit">
                <span class = "text-xl mr-1">conditional-url.web.app/</span>
                <input v-model = "short" type = "text" class = "border border-black/40 rounded p-1" placeholder="(optional)"/>
            </div>

            

            <draggable v-model = "conditionals" item-key="id" class = "mt-4">
                <template #item="{element, index}">
                    <Conditional
                        :key = "element.id"
                        :id = "element.id"
                        :first = "index === 0"
                        :last = "index === conditionals.length - 1"
                        @delete = "deleteConditional"
                        @updateUrl = "updateConditionalUrl"
                    />
                </template>
            </draggable>

            <button @click = "newConditional" class = "px-4 py-2 mt-4 border border-black bg-black/10 rounded-xl mx-auto">
                Create a Condition
            </button>

        </div>
    </div>
</template>

