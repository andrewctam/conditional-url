<script setup lang='ts'>
import { onMounted, ref, inject } from 'vue'
import type { Ref } from 'vue'
import { accessTokenKey, Conditional, refreshTokensKey, updateMsgKey } from '../../types'
import ConditionalsEditor from '../ConditionalsEditor/ConditionalsEditor.vue';

const props = defineProps<{
    short: string
}>();

const conditionals: Ref<Conditional[]> = ref([]);

const doneLoading = ref(false);
const redirectsNonZero = ref(false);
const changesMade = ref(false);

const accessToken = inject(accessTokenKey)
const refresh = inject(refreshTokensKey) as () => Promise<boolean>
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void

onMounted(async () => {
    await getConditionals();
});

const getConditionals = async () => {
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
        } else if (res.status=== 401) {
            return -1;
        } else {
            return null;
        }
    });
    if (response === -1) {
        if (await refresh()) {
            await getConditionals();
        } else {
            doneLoading.value = true;
        }
    } else if (response) {
        conditionals.value = JSON.parse(response.conditionals);
    }

    for (let i = 0; i < response.redirects.length; i++) {
        if (response.redirects[i] !== 0) {
            redirectsNonZero.value = true;
        }

        conditionals.value[i].redirects = response.redirects[i];
    }
    
    doneLoading.value = true;
}


const updateConditionalUrl = async () => {
    if (!accessToken || !accessToken.value)
        return;
        
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
        if (res.status === 200) {
            return res.json();
        } else if (res.status === 401) { 
            return -1;
        } else if (res.status === 409) {
            updateMsg("URL already exists. Please enter a different short URL.", true)
            return null;
        } else if (res.status === 400) {
            updateMsg("Problem with conditionals. Please check your inputs and try again.", true)
            return null;
        } else {
            updateMsg("Something went wrong. Please try again later.", true)
            return null;
        }
    });

    if (response === -1) {
        if (await refresh()) {
            await updateConditionalUrl();
        }
        return;
    } else if (response) {
        updateMsg("Updated successfully");
        redirectsNonZero.value = false;
        conditionals.value = conditionals.value.map(c => {
            c.redirects = 0;
            return c;
        })

    }

}



</script>

<template>    
    <div v-if="doneLoading" class = "w-[90%] bg-black/10 my-8 mx-auto border border-black/25 rounded-xl text-center relative">
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
        <div v-if="changesMade && redirectsNonZero" class="text-red-200 my-2 font-light text-xs">
            WARNING: Saving changes will clear analytics
        </div>
    </div>

</template>

