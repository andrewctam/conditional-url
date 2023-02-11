<script setup lang='ts'>
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import ConditionalBlock from './ConditionalBlock.vue'
import draggable from 'vuedraggable'
import { Condition, Conditional } from '../../types'



const short = ref("");
const i = ref(0); //used for temp id, removed before uploading
const conditionals: Ref<Conditional[]> = ref([
    { 
        id: i.value++,
        url: "",
        and: true,
        conditions: []
    },
    { 
        id: i.value++,
        url: "",
        and: true,
        conditions: []
    }
]);
const error = ref("");
const responseUrl = ref("");

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
            updateError(`Please enter a URL for block #${i + 1}`);
            return;
        }
        
        if (!c.url.startsWith("http://") && !c.url.startsWith("https://")) {
            updateError(`URL #${i + 1} should start with http:// or https://`);
            return;
        }

        if (c.url.startsWith(`https://${import.meta.env.VITE_PROD_URL}`)) {
            updateError(`Can not shorten a link to this site`);
            return;
        }
        
        if (c.conditions.length == 0 && i != conditionals.value.length - 1) {
            updateError(`Please enter at least one condition for block #${i + 1}`);
            return;
        }

        for (let j = 0; j < c.conditions.length; j++) {
            const condition = c.conditions[j];
            if (condition.value === "" && condition.variable !== "URL Parameter") { //url param value can be empty
                updateError(`Please enter a value for condition #${j + 1} in block #${i + 1}`);
                return;
            } else if (condition.variable === "URL Parameter") {
                if (!condition.param) {
                    updateError(`Please enter a URL Parameter for condition #${j + 1} in block #${i + 1}`);
                    return;
                }

                if (!/^[a-zA-Z0-9]*$/.test(condition.param)) {
                    updateError(`URL Parameter for condition #${j + 1} in block #${i + 1} can only contain letters and numbers`);
                    return;
                }
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

    if (short.value !== "" && !/^[a-zA-Z0-9]*$/.test(short.value)) {
        updateError("Short URL can only contain letters and numbers");
        return;
    }

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/createUrl`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/createUrl`;
    }
    
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
    <div v-if = "error" class = "fixed top-4 left-4 px-4 py-1 bg-red-100 border border-black/25 rounded text-black text-center font-light">
        {{error}}
    </div>

   <div v-if="responseUrl !== ''" class = "text-center text-white font-light border border-black/25 w-fit mx-auto p-6 mt-8 rounded bg-black/10">
        <p class = "text-lg">Your Conditional URL was successfully created!</p>
        <input readonly type="text" 
            class = "w-80 text-black bg-white/90 text-center border border-black rounded px-2 py-1 mt-4" 
            :value="`${domain}/${responseUrl}`" 
            @click="selectText"/>
    </div>
    <div v-else class = "lg:w-1/2 md:w-3/4 w-[95%] bg-black/10 my-8 mx-auto border border-black/25 rounded-xl text-center relative">
        <div class = "mx-auto mt-4">
            <span class = "text-white font-extralight text-xl">{{`${domain}/`}}</span>
            <input v-model = "short" type = "text" class = "text-white text-xl font-extralight w-[165px] bg-white/10 focus:outline-none placeholder:text-white/50 placeholder:text-center" placeholder="optional custom url"/>
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

        <div @click = "newConditional" class = "mx-8 p-2 cursor-pointer text-center rounded bg-white/5 border border-black/20 text-green-100 hover:text-green-200 text-sm font-light hover:bg-black/30 select-none">
            Add Block
        </div>

        <button @click = "createConditionalUrl" class = "w-full px-4 py-2 mt-12 rounded-b-xl bg-black/10 border-t border-t-black/10 text-white font-light mx-auto hover:bg-black/30 hover:text-green-100 select-none">
            Create Conditional URL
        </button>

    </div>
</template>

