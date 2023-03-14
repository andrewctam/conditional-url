<script setup lang='ts'>
import { computed, ref, inject } from 'vue'
import type { Ref } from 'vue'
import { accessTokenKey, Conditional, refreshTokensKey, updateMsgKey } from '../types'
import ConditionalsEditor from './ConditionalsEditor/ConditionalsEditor.vue'

const short = ref("");
const conditionals: Ref<Conditional[]> = ref([
    { 
        url: "",
        and: true,
        conditions: []
    },
    { 
        url: "",
        and: true,
        conditions: []
    }
]);
const error = ref("");
const responseUrl = ref("");

const accessToken = inject(accessTokenKey)
const refresh = inject(refreshTokensKey) as () => Promise<boolean>
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void

const createConditionalUrl = async (retry: boolean = true) => {
    //verify
    for (let i = 0; i < conditionals.value.length; i++) {
        const c = conditionals.value[i];
        if (c.url == "") {
            updateMsg(`Please enter a URL for block #${i + 1}`, true);
            return;
        }
        
        if (!c.url.startsWith("http://") && !c.url.startsWith("https://")) {
            updateMsg(`URL #${i + 1} should start with http:// or https://`, true);
            return;
        }

        if (c.url.startsWith(`https://${import.meta.env.VITE_PROD_URL}`)) {
            updateMsg(`Can not shorten a link to this site`, true);
            return;
        }
        
        if (c.conditions.length == 0 && i != conditionals.value.length - 1) {
            updateMsg(`Please enter at least one condition for block #${i + 1}`, true);
            return;
        }

        for (let j = 0; j < c.conditions.length; j++) {
            const condition = c.conditions[j];
            if (condition.value === "" && condition.variable !== "URL Parameter") { //url param value can be empty
                updateMsg(`Please enter a value for condition #${j + 1} in block #${i + 1}`, true);
                return;
            } else if (condition.variable === "URL Parameter") {
                if (!condition.param) {
                    updateMsg(`Please enter a URL Parameter for condition #${j + 1} in block #${i + 1}`, true);
                    return;
                }

                if (!/^[a-zA-Z0-9]*$/.test(condition.param)) {
                    updateMsg(`URL Parameter for condition #${j + 1} in block #${i + 1} can only contain letters and numbers`, true);
                    return;
                }
            }
        }
    }

    //remove analytics and remove any conditions in else
    let trimmed = conditionals.value.map((c, i) => {
        return {
            url: c.url,
            and: c.and,
            conditions: i == conditionals.value.length - 1 ? [] : c.conditions
        }
    })

    if (short.value !== "" && !/^[a-zA-Z0-9]*$/.test(short.value)) {
        updateMsg("Short URL can only contain letters and numbers", true);
        return;
    }

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/createUrl`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/createUrl`;
    }
    
    const authHeader = accessToken && accessToken.value ? `Bearer ${accessToken.value}` : "Bearer NONE";
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": authHeader
        },
        body: JSON.stringify({
            short: short.value === "" ? Math.random().toString(36).substring(2, 8) : short.value,
            conditionals: JSON.stringify(trimmed)
        })
    }).then((res) => {
        console.log(res)
        return res.json()
    }).catch((err) => {
        console.log(err)
        updateMsg("Error creating URL.", true)
        return null;
    });
    console.log(response)
    
    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await createConditionalUrl(false);
        }
        return;
    } else if (response.msg) {
        updateMsg(response.msg, true);
    } else {
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

const reset = () => {
    short.value = "";
    conditionals.value = [
        { 
            url: "",
            and: true,
            conditions: []
        },
        { 
            url: "",
            and: true,
            conditions: []
        }
    ];
    error.value = "";
    responseUrl.value = "";
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
   <div v-if="responseUrl !== ''" class = "text-center text-white font-light border border-black/25 xl:w-1/3 lg:w-2/3 md:w-5/6 w-[95%] p-6 mt-8 mx-auto rounded bg-black/10">
        <p class = "text-lg">Your Conditional URL was successfully created!</p>
        <input readonly type="text" 
            class = "w-80 text-black bg-white/90 text-center border border-black rounded px-2 py-1 mt-4" 
            :value="`${domain}/${responseUrl}`" 
            @click="selectText"/>

        <button @click='reset' class="mt-8 mx-auto hover:text-green-200 cursor-pointer block border border-black/20 rounded px-3 py-2 bg-black/10">
            Make Another URL
        </button>
    </div>
    <div v-else class = "xl:w-1/2 lg:w-2/3 md:w-5/6 w-[95%] bg-black/10 my-8 mx-auto border border-black/25 rounded-xl text-center relative">
        <div class = "mx-auto m-4">
            <span class = "text-white font-extralight text-base md:text-lg lg:text-xl">{{`${domain}/`}}</span>
            <input v-model = "short" type = "text" 
                class = "text-white font-extralight bg-white/10 focus:outline-none placeholder:text-white/50 placeholder:text-center
                text-base w-[135px]
                md:text-lg md:w-[155px]
                lg:text-xl lg:w-[165px]"
                placeholder="optional custom url"/>
        </div>

        <ConditionalsEditor 
            :conditionals="conditionals"
            @update-conditionals="(updated) => conditionals = updated"
        />

        <button @click = "createConditionalUrl()" class = "w-full px-4 py-2 mt-6 rounded-b-xl bg-black/10 border-t border-t-black/10 text-white font-light mx-auto hover:bg-black/30 hover:text-green-100 select-none">
            Create Conditional URL
        </button>
        
    </div>
</template>
