<script setup lang='ts'>
import { onMounted, ref, inject } from 'vue'
import type { Ref } from 'vue'
import { Conditional } from '../../types'
import ConditionalsEditor from '../ConditionalsEditor/ConditionalsEditor.vue';

const props = defineProps<{
    short: string
}>();

const conditionals: Ref<Conditional[]> = ref([]);
const error = ref("");
const doneLoading = ref(false);
const redirectsNonZero = ref(false);
const accessToken: Ref<string> | undefined = inject('accessToken')
const changesMade = ref(false);
const refresh: undefined | (() => Promise<boolean>) = inject('refresh');


const updateError = (msg: string) => {
    setTimeout(() => {
        error.value = "";
    }, 2000);

    error.value = msg;
}

onMounted(async () => {
    if (!accessToken || !accessToken.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getConditionals?short=${props.short}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getConditionals?short=${props.short}`;
    }

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        },
    }).then((res) => {
        if (res.status === 200) {
            return res.json();
        } else {
            return null;
        }
    });
    console.log(response)
    if (response) {
        conditionals.value = JSON.parse(response.conditionals);
    }

    for (let i = 0; i < response.redirects.length; i++) {
        if (response.redirects[i] !== 0) {
            redirectsNonZero.value = true;
        }

        conditionals.value[i].redirects = response.redirects[i];
    }
    
    doneLoading.value = true;
})


const updateConditionalUrl = async () => {
    if (!accessToken || !accessToken.value)
        return;
        
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

    //remove analytics and remove any conditions in else
    let trimmed = conditionals.value.map((c, i) => {
        return {
            url: c.url,
            and: c.and,
            conditions: i == conditionals.value.length - 1 ? [] : c.conditions
        }
    })


    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/updateUrl`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/updateUrl`;
    }
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        },
        body: JSON.stringify({
            short: props.short,
            conditionals: JSON.stringify(trimmed)
        })
    }).then((res) => {
        console.log(res)
        if (res.status === 200) {
            return res.json();
        } else if (res.status === 401) { 
            return -1;
        } else if (res.status === 409) {
            updateError("URL already exists. Please enter a different short URL.")
            return null;
        } else if (res.status === 400) {
            updateError("Problem with conditionals. Please check your inputs and try again.")
            return null;
        } else {
            updateError("Something went wrong. Please try again later.")
            return null;
        }
    });

    if (response === -1) {
        if (refresh !== undefined && await refresh()) {
            await updateConditionalUrl();
        }
        return;
    } else if (response) {
        updateError("Updated successfully");
        redirectsNonZero.value = true;
    }

}



</script>

<template>
    <div v-if = "error" class = "fixed top-4 left-4 px-4 py-1 bg-red-100 border border-black/25 rounded text-black text-center font-light">
        {{error}}
    </div>

    
    <div v-if="doneLoading" class = "w-[90%] bg-black/10 my-8 mx-auto border border-black/25 rounded-xl text-center relative">
        <div v-if="redirectsNonZero" class="text-red-200 mt-2 font-light">
            WARNING: Saving changes will clear analytics
        </div>

        <ConditionalsEditor 
            :conditionals="conditionals"
            @update-conditionals="(updated) => {
                conditionals = updated;
                changesMade = true;
            }"
        />
        
        <button 
            :disabled="!changesMade" 
            @click = "updateConditionalUrl" 
            class = "w-full px-4 py-2 mt-6 rounded-b-xl bg-black/10 border-t border-t-black/10 text-white font-light mx-auto select-none 
                            hover:bg-black/30 hover:text-green-100 disabled:bg-black/5 disabled:text-gray-500 disabled:hover:bg-black/5">
            Save Changes
        </button>
    </div>

</template>

