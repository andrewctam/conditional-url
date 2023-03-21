<script setup lang='ts'>
import { onMounted, ref, inject, computed } from 'vue'
import type { Ref } from 'vue'
import { accessTokenKey, Conditional, refreshTokensKey, updateMsgKey } from '../../types'
import ConditionalsEditor from '../ConditionalsEditor/ConditionalsEditor.vue';
import DataGraph from './analytics/DataGraph.vue';
import DataTable from './analytics/DataTable.vue';
import RedirectsChart from './analytics/RedirectsChart.vue';
import router from '../../router';

const props = defineProps<{
    short: string
}>();

const conditionals: Ref<Conditional[]> = ref([]);
const redirects: Ref<number[]> = ref([]);

const doneLoading = ref(false);
const changesMade = ref(false);

const accessToken = inject(accessTokenKey)
const refresh = inject(refreshTokensKey) as () => Promise<boolean>
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void

const showAnalytics = ref(false);

const confirmDelete = ref(false);

const currentName = ref(props.short);
const rename = ref(props.short);

const notOwner = ref(false);

onMounted(async () => {
    await getURL();
});

const emit = defineEmits<{
    (event: 'close'): void,
    (event: 'closeAndFetch'): void
}>();


const close = () => {
    if (props.short !== currentName.value) {
        emit('closeAndFetch');
    } else {
        emit('close');
    }
}

const deleteURL = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value || !currentName.value)
        return;
    
    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/deleteURL`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/deleteURL`;
    }

    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        }, 
        body: JSON.stringify({
            short: currentName.value
        })
    }).then((res) => {
        return res.json();
    });

    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await deleteURL(false);
            return;
        } else {
            updateMsg("Failed to delete URL", true);
        }
    } else if (!response.msg) {
        updateMsg("URL deleted successfully");
        emit('closeAndFetch');
    }
}

const renameURL = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value || !currentName.value || !validRename.value)
        return;
    
    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/renameURL`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/renameURL`;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        }, 
        body: JSON.stringify({
            oldShort: currentName.value,
            newShort: rename.value
        })
    }).then((res) => {
        return res.json();
    });

    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await renameURL(false);
            return;
        } else {
            updateMsg("Failed to rename URL", true);
        }
    } else if (response.msg) {
        updateMsg(response.msg, true);
    } else {
        updateMsg("URL renamed successfully");
        currentName.value = rename.value;
        router.push({query: { view: rename.value }})
    }
}


const getURL = async (updateConditionals: boolean = true, updateRedirects: boolean = true, retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getURL?short=${currentName.value}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getURL?short=${currentName.value}`;
    }

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        },
    }).then((res) => {
        return res.json();
    });
    
    if (response.msg === "Invalid token" ) {
        if (retry && await refresh()) {
            await getURL(updateConditionals, updateRedirects, false);
        } else {
            doneLoading.value = true;
        }
    } else if (response.msg === "You do not own this URL" || response.msg === "Short URL not found") {
        notOwner.value = true;
    } else if (!response.msg) {
        if (updateConditionals)
            conditionals.value = response.conditionals;
        
        if (updateRedirects)
            redirects.value = response.redirects;
    }

    
    doneLoading.value = true;
}


const updateConditionals = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value || !changesMade.value)
        return;
        
    //verify
    for (let i = 0; i < conditionals.value.length; i++) {
        const c = conditionals.value[i];
        if (c.url == "") {
            updateMsg(`Please enter a URL for redirect URL #${i + 1}`, true);
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
            updateMsg(`Please enter at least one condition for redirect URL #${i + 1}`, true);
            return;
        }

        for (let j = 0; j < c.conditions.length; j++) {
            const condition = c.conditions[j];
            if (condition.value === "" && condition.variable !== "URL Parameter") { //url param value can be empty
                updateMsg(`Please enter a value for condition #${j + 1} in redirect URL #${i + 1}`, true);
                return;
            } else if (condition.variable === "URL Parameter") {
                if (!condition.param) {
                    updateMsg(`Please enter a URL Parameter for condition #${j + 1} in redirect URL #${i + 1}`, true);
                    return;
                }

                if (!/^[a-zA-Z0-9]*$/.test(condition.param)) {
                    updateMsg(`URL Parameter for condition #${j + 1} in redirect URL #${i + 1} can only contain letters and numbers`, true);
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
        url = `${import.meta.env.VITE_PROD_API_URL}/api/updateURL`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/updateURL`;
    }
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        },
        body: JSON.stringify({
            short: currentName.value,
            conditionals: JSON.stringify(trimmed)
        })
    }).then((res) => {
        return res.json();
    }).catch((err) => {
        console.log(err);
    });


    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await updateConditionals(false);
        }
        return;
    } else if (response.msg) {
        updateMsg(response.msg, true);
    } else {
        updateMsg("Updated successfully");
        changesMade.value = false
        redirects.value = new Array(conditionals.value.length).fill(0);
        showAnalytics.value = false;
    }

}

const domain = computed(() => {
    if (import.meta.env.PROD) {
        return import.meta.env.VITE_PROD_URL;
    } else {
        return import.meta.env.VITE_DEV_URL;
    }
})

const validRename = computed(() => {
    return rename.value !== "" && rename.value !== currentName.value;
});


const analyticsNonZero = computed(() => {
    for (let i = 0; i < redirects.value.length; i++) {    
        if (redirects.value[i] !== 0)
            return true;
    }

    return false;
})

</script>

<template>
    <div class = "w-[95%] mx-auto relative" :class = "showAnalytics ? 'md:mx-10 md:grid md:grid-cols-2 md:gap-10' : 'xl:w-1/2 lg:w-2/3 md:w-5/6'" >
        <div class="w-full h-fit bg-[#3e3f41] my-8 pb-4 mx-auto border border-black/25 rounded-xl text-center"
            :class = "showAnalytics ? 'z-40 max-h-[25vh] md:max-h-[95vh] overflow-y-auto sticky top-4' : ''"
            >
            
            <span @click="close" class="absolute top-1 left-2 text-xl text-white hover:text-red-200 cursor-pointer select-none">
                ←
            </span>
        
            <div class="mt-6">
                <span class = "text-white font-extralight text-base md:text-lg lg:text-xl">{{`${domain}/`}}</span>
                <input v-model = "rename" type = "text" 
                    class = "text-white font-extralight w-[120px] bg-white/10 focus:outline-none placeholder:text-white/50 placeholder:text-center text-base md:text-lg lg:text-xl"
                />
            </div>
            
            <div v-if="notOwner" class = "w-[95%] mt-4 mx-auto text-center relative text-red-200 font-extralight text-xl">
                You do not own this URL
            </div>
            
            <div v-else-if="doneLoading" class = "w-[95%] mt-2 py-2 mx-auto text-center relative">
                <div class="flex flex-wrap justify-center">
                    <div class="mx-3 my-1 font-extralight text-sm w-fit px-2 py-1 bg-black/10 rounded-lg select-none whitespace-nowrap text-blue-200 hover:text-blue-300 cursor-pointer"
                        @click="() => { 
                            if (!showAnalytics) //if toggling to true, refresh the redirects
                                getURL(false, true, true)

                            showAnalytics = !showAnalytics 
                        }">

                        {{showAnalytics ? "Close Analytics" : "Show Analytics"}}
                    </div>

                    <div class="mx-3 my-1 font-extralight text-sm w-fit px-2 py-1 bg-black/10 rounded-lg select-none whitespace-nowrap cursor-pointer"
                        :class="confirmDelete ? 'text-green-200 hover:text-green-300' : 'text-red-200 hover:text-red-300'"
                        @click="confirmDelete = !confirmDelete">
                        {{confirmDelete ? "Cancel" : "Delete URL"}}
                    </div>

                    <div v-if="confirmDelete" 
                        class="mx-3 my-1 font-extralight text-sm w-fit px-2 py-1 bg-black/10 rounded-lg select-none whitespace-nowrap cursor-pointer text-red-400 hover:text-red-500"
                        @click="deleteURL()">
                        Confirm
                    </div>

                    <div class="mx-3 my-1 font-extralight text-sm w-fit px-2 py-1 bg-black/10 rounded-lg select-none"
                        :class="validRename ? 'text-green-200 hover:text-green-300 cursor-pointer' : 'text-gray-200/40 cursor-auto'"
                        @click="renameURL()">
                        Rename
                    </div>

                    <div class="mx-3 my-1 font-extralight text-sm w-fit px-2 py-1 bg-black/10 rounded-lg select-none whitespace-nowrap"
                        :class="changesMade ? 'text-green-200 hover:text-green-300 cursor-pointer' : 'text-gray-200/40 cursor-auto'"
                        @click="updateConditionals()">
                        Save Edits
                    </div>
                </div>

                <div v-if="changesMade && analyticsNonZero" class="text-red-200 my-2 font-light text-xs select-none">
                    WARNING: Saving changes will clear analytics
                </div>
                
                <ConditionalsEditor
                    :conditionals="conditionals"
                    @update-conditionals="(updated) => {
                        conditionals = updated;
                        changesMade = true;
                    }"
                />
            </div>
        </div>

        <div v-if="showAnalytics" class="w-full h-fit overflow-y-auto bg-black/10 my-8 p-4 mx-auto border border-black/25 rounded-xl text-center relative">
            <DataGraph
                :short="currentName"
                :urls="conditionals.map((c, i) => {
                    return {
                        id: i,
                        url: c.url
                    }
                })"
            />

            <RedirectsChart
                :redirects="redirects"
                @refresh = "getURL(false, true, true)"
            />

            <DataTable
                :short="currentName"
                :urls="conditionals.map((c, i) => {
                    return {
                        id: i,
                        url: c.url
                    }
                })"
            />
        </div>
    </div>
</template>

