<script setup lang='ts'>
import { onMounted, ref, inject, computed } from 'vue'
import type { Ref } from 'vue'
import { accessTokenKey, Conditional, Data, refreshTokensKey, updateMsgKey } from '../../types'
import ConditionalsEditor from '../ConditionalsEditor/ConditionalsEditor.vue';
import DataGraph from './DataGraph.vue';
import DataTable from './DataTable.vue';

const props = defineProps<{
    short: string
}>();

const conditionals: Ref<Conditional[]> = ref([]);

const doneLoading = ref(false);
const analyticsNonZero = ref(false);
const changesMade = ref(false);

const accessToken = inject(accessTokenKey)
const refresh = inject(refreshTokensKey) as () => Promise<boolean>
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void

const showAnalytics = ref(false);

const confirmDelete = ref(false);

const currentName = ref(props.short);
const rename = ref(props.short);


onMounted(async () => {
    await getConditionals();
});

const emit = defineEmits<{
    (event: 'close'): void,
    (event: 'closeAndFetch'): void
}>();


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

const validRename = computed(() => {
    return rename.value !== "" && rename.value !== currentName.value;
});

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
    }
}


const getConditionals = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getConditionals?short=${currentName.value}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getConditionals?short=${currentName.value}`;
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
            await getConditionals(false);
        } else {
            doneLoading.value = true;
        }
    } else if (!response.msg) {
        conditionals.value = JSON.parse(response.conditionals);
        
        for (let i = 0; i < response.redirects.length; i++) {
            if (response.redirects[i] !== 0) {
                analyticsNonZero.value = true;
            }
    
            conditionals.value[i].redirects = response.redirects[i];
        }
    }

    
    doneLoading.value = true;
}

const close = () => {
    if (props.short !== currentName.value) {
        emit('closeAndFetch');
    } else {
        emit('close');
    }
}


const updateConditionals = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value || !changesMade.value)
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
        analyticsNonZero.value = false;
        changesMade.value = false
        conditionals.value = conditionals.value.map(c => {
            c.redirects = 0;
            return c;
        })

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
    <span @click="close" class="absolute top-1 left-2 text-xl text-white hover:text-red-200 cursor-pointer select-none">
        ←
    </span>

   
    <div class="mt-4">
        <span class = "text-white font-extralight text-xl">{{`${domain}/`}}</span>
        <input 
            v-model = "rename" 
            type = "text" 
            class = "text-white text-xl font-extralight w-[120px] bg-white/10 focus:outline-none placeholder:text-white/50 placeholder:text-center" 
            />
    </div>
    
    <div v-if="doneLoading" class = "w-[95%] mt-2 py-2 mx-auto text-center relative">
        
        <div class="mx-auto w-fit">
            <div class="inline font-extralight cursor-pointer w-fit select-none">
                <span @click="confirmDelete = !confirmDelete" class="text-red-200 hover:text-red-300 text-sm px-2 py-1 bg-black/10 rounded-lg">
                    {{confirmDelete ? "Cancel" : "Delete URL"}}
                </span>

                <span @click="deleteURL()" v-if="confirmDelete" class="text-gray-200 hover:text-red-500 ml-2 text-sm px-2 py-1 bg-black/10 rounded-lg">
                    Confirm
                </span>
            </div>

            <div class="inline font-extralight text-sm w-fit ml-5 px-2 py-1 bg-black/10 rounded-lg select-none"
                :class="validRename ? 'text-green-200 hover:text-green-300 cursor-pointer' : 'text-gray-200/40 cursor-auto'"
                @click="renameURL()">
                Rename
            </div>

            <div class="inline font-extralight text-sm w-fit ml-5 px-2 py-1 bg-black/10 rounded-lg select-none whitespace-nowrap"
                :class="changesMade ? 'text-green-200 hover:text-green-300 cursor-pointer' : 'text-gray-200/40 cursor-auto'"
                @click="updateConditionals()">
                Save Changes
            </div>

            <div class="inline font-extralight text-sm w-fit ml-5 px-2 py-1 bg-black/10 rounded-lg select-none whitespace-nowrap"
                :class="analyticsNonZero ? 'text-blue-200 hover:text-blue-300 cursor-pointer' : 'text-gray-200/40 cursor-auto'"
                @click="() => { if (!analyticsNonZero) return; showAnalytics = !showAnalytics }">

                {{showAnalytics ? "Close Analytics" : "Show Analytics"}}
            </div>


            <div v-if="changesMade && analyticsNonZero" class="text-red-200 my-2 font-light text-xs select-none">
                WARNING: Saving changes will clear analytics
            </div>
        </div>
        
        <div v-if="showAnalytics" class="p-4">
            <DataTable
                :short="props.short"
                :urls="conditionals.map((c, i) => {
                    return {
                        id: i,
                        url: c.url
                    }
                })"
            />

            <DataGraph
                :short="props.short"
            />
        </div>
        
        <ConditionalsEditor 
            v-else
            :conditionals="conditionals"
            @update-conditionals="(updated) => {
                conditionals = updated;
                changesMade = true;
            }"
        />
        
      
    </div>

</template>

