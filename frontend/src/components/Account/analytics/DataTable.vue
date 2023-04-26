<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue';
import { accessTokenKey, refreshTokensKey, Variables } from '../../../types';
import { Variable } from '../../ConditionalsEditor/AddConditionMenu.vue';
import PageArrows from '../../PageArrows.vue';
import Reload from '../../Icons/Reload.vue';

const props = defineProps<{
    short: string,
    urls: {id: number, url: string}[]
}>();



const doneLoading = ref(false);
const selected = ref<Variable>("Language");
const sort = ref<"Increasing" | "Decreasing">("Decreasing");

const counts = ref< {key: string, count: number}[]>(new Array(10).fill({key: "-", count: "-"}));
const page = ref(0);
const pageCount = ref(0);
const selectedURL = ref<number>(-1);

const accessToken = inject(accessTokenKey);
const refresh = inject(refreshTokensKey) as () => Promise<boolean>;


const getCounts = async (retry: boolean = true, refreshData: boolean = false) => {
    if (!accessToken || !accessToken.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getDataPage?short=${props.short}&variable=${selected.value}&selectedURL=${selectedURL.value}&page=${page.value}&sort=${sort.value}&refresh=${refreshData}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getDataPage?short=${props.short}&variable=${selected.value}&selectedURL=${selectedURL.value}&page=${page.value}&sort=${sort.value}&refresh=${refreshData}`;
    }

    doneLoading.value = false;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        },
    }).then((res) => {
        return res.json();
        
    });

    console.log(response)
    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await getCounts(false, refreshData);
        } else {
            doneLoading.value = true;
        }
    } else if (!response.msg) {
        counts.value = response.counts;
        pageCount.value = response.pageCount;
        doneLoading.value = true;

    }
}

onMounted(async () => {
    await getCounts(true, true)
})

watch(selected, async () => {
    page.value = 0;
    pageCount.value = 0;
    await getCounts();
})

watch([sort, page, selectedURL], async () => {
    await getCounts();
})

const hasNext = computed(() => {
    return page.value + 1 < pageCount.value;
})

const hasPrev = computed(() => {
    return page.value > 0;
})

const truncate = (str: string, maxLen: number = 50) => {
    if (str.length > maxLen) {
        return str.slice(0, maxLen) + "...";
    } else {
        return str;
    }
}

</script>

<template>
    <div class="bg-black/10 p-2 pb-4 rounded select-none text-white relative">
        <p class = "text-white text-xl font-extralight select-none mt-4">
            Data Counts
        </p>


        <Reload v-if = "doneLoading" @click="getCounts(true, true)" class="absolute top-2 right-2 cursor-pointer" />
        <div v-else class="absolute top-1 right-0 text-white font-light mx-2">
            ...
        </div>

        <span class="mr-1 font-light">From:</span>
        <select v-model="selectedURL" class = "select-none text-white border border-black/50 p-1 m-1 w-[200px] rounded font-light bg-gray-600/50">
            <option class="bg-gray-600" value = "-1">
                All URLs
            </option>
            <option class="bg-gray-600" v-for="url in props.urls" :value="url.id">
                {{`(${url.id + 1}) ${truncate(url.url)}`}}
            </option>
        </select>


        <table class="w-[95%] mx-auto text-left text-whitep-2 m-5 font-light">
            <thead class="text-white bg-[#424242]">
                <th class="w-1/2">
                    <select v-model="selected" class = "select-none border border-black/50 p-1 m-1 rounded font-light bg-gray-600/50">
                        <option class="bg-gray-600" v-for="variable in Variables">{{variable}}</option>
                    </select>
                </th>
                <th class="w-1/2">  
                    <select v-model="sort" class = "select-none border border-black/50 p-1 m-1 rounded font-light bg-gray-600/50">
                        <option class="bg-gray-600" value = "Decreasing">
                            Count ↓
                        </option>
                        <option class="bg-gray-600" value = "Increasing">
                            Count ↑
                        </option>
                    </select>        
                </th>
            </thead>
            
            <tbody class="px-6 py-4 whitespace-nowrap text-white select-text">
                <tr v-for="(datum, index) in counts" 
                    :key="datum.key + index" 
                    class="hover:bg-white/10" :class="index % 2 === 0 ? 'bg-black/30' : 'bg-black/40'">

                    <td class="p-2">{{datum.key}}</td>
                    <td class="p-2 select">{{datum.count}}</td>
                </tr>
            </tbody>
        </table>
        

        <PageArrows 
            v-if="pageCount > 0"
            :hasNext="hasNext" 
            :hasPrev="hasPrev" 
            :canMove="doneLoading"
            :page="page" 
            :pageCount="pageCount"
            @next="page++"
            @prev="page--"
        />

        <div v-else class="flex justify-center text-white font-light mx-2">
            Loading...
        </div>

    </div>

</template>