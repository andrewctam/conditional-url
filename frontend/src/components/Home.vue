<script setup lang='ts'>
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import ConditionalBlock from './ConditionalBlock.vue'
import draggable from 'vuedraggable'
import { Condition } from '../types'
import { clear } from 'console'


interface Conditional {
    id: number,
    url: string,
    and: boolean
    conditions: Condition[]
}

const short = ref("");
const i = ref(2);
const error = ref("");
const responseUrl = ref("");
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

const updateError = (msg: string) => {
    setTimeout(() => {
        error.value = "";
    }, 2000);

    error.value = msg;
}
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

const createConditionalUrl = async () => {
    //verify
    for (let i = 0; i < conditionals.value.length; i++) {
        const c = conditionals.value[i];
        if (c.url == "") {
            updateError(`Please enter a URL for conditional #${i + 1}.`);
            return;
        }

        if (c.conditions.length == 0 && i != conditionals.value.length - 1) {
            updateError(`Please enter at least one condition for conditional #${i + 1}.`);
            return;
        }

        for (let j = 0; j < c.conditions.length; j++) {
            const condition = c.conditions[j];
            if (condition.value === "") {
                updateError(`Please enter a value for condition #${j + 1} in conditional #${i + 1}.`);
                return;
            } else if (/[^a-zA-Z0-9]/.test(condition.value)) {
                updateError(`Condition #${j + 1} in conditional #${i + 1} can only contain letters and numbers.`);
                return;
            }


        }
    }

    //remove id, remove any conditions in else
    let trimmed = conditionals.value.map((c, i) => {
        return {
            url: c.url,
            and: c.and,
            conditions: i == conditionals.value.length - 1 ? [] : c.conditions
        }
    })

    if (short.value !== "" && !/[a-zA-z0-9]/.test(short.value)) {
        updateError("Short URL can only contain letters and numbers");
        return;
    }

    const url = import.meta.env.VITE_CREATE_SHORT_LAMBDA;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            short: short.value === "" ? Math.random().toString(36).substring(2, 8) : short.value,
            conditionals: JSON.stringify(trimmed)
        })
    }).then((res) => {
        console.log(res)
        if (res.status === 409) {
            updateError("URL already exists. Please enter a different short URL.")
            return null;
        } else if (res.status === 400) {
            updateError("Problem with conditionals. Please check your inputs and try again.")
            return null;
        } else {
            return res.json();
        }
    });
    console.log(response)
    if (response) {
        responseUrl.value = response;
    }
}

const selectText = (event: MouseEvent) => {
    if (event.target) {
        const target = event.target as HTMLInputElement;
        if (target.tagName == "INPUT") {
            target.select();
        }
    }
}

const domain = computed(() => {
    if (import.meta.env.PROD) {
        return import.meta.env.VITE_PROD_URL;
    } else {
        return import.meta.env.VITE_DEV_URL;
    }
})

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

    <div v-if="responseUrl !== ''" class = "text-center font-light border border-black/25 w-fit mx-auto p-6 mt-8 rounded bg-black/10">
        <p class = "text-lg">Your Conditional URL was successfully created!</p>
        <input readonly type="text" 
            class = "w-80 text-slate-600 bg-white/50 text-center border border-black rounded px-2 py-1 mt-4" 
            :value="`${domain}/${responseUrl}`" 
            @click="selectText"/>
    </div>
    <div v-else class = "lg:w-1/2 md:w-3/4 w-[95%] bg-black/10 pt-2 my-8 mx-auto border border-black/20 rounded-xl text-center relative">
        <div class = "mx-auto mt-2">
            <span class = "text-gray-600 font-extralight text-xl">{{`${domain}/`}}</span>
            <input v-model = "short" type = "text" class = "text-gray-600 text-xl font-extralight w-[175px] bg-white/10 focus:outline-none placeholder:text-black/50 placeholder:text-center" placeholder="(optional custom url)"/>
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

        <div @click = "newConditional" class = "mx-8 p-2 cursor-pointer text-center rounded bg-black/20 border border-black/20 text-green-100 hover:text-green-200 text-sm font-light hover:bg-black/30">
            Add Block
        </div>

        <button @click = "createConditionalUrl" class = "w-full px-4 py-2 mt-12 rounded-b-xl bg-black/5 border-t border-t-black/10 text-green-100 hover:text-green-200 font-light mx-auto hover:bg-black/20">
            Create Conditional URL
        </button>

        <div v-if = "error" class = "fixed top-4 left-4 px-4 py-1 bg-red-100 rounded text-red-500 border border-black/25 text-center font-light">
            {{error}}
        </div>
    </div>

    
</template>

