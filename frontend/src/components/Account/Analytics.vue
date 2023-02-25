<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue';
import { accessTokenKey, refreshTokensKey, Variables } from '../../types';
import { Variable } from '../ConditionalsEditor/AddConditionMenu.vue';

const props = defineProps<{
    short: string
}>();

type Sort = "Count ↑" | "Count ↓";

const doneLoading = ref(false);
const selected = ref<Variable>("Language");
const sort = ref<Sort>("Count ↓");

type Counts = {
        [key: typeof Variables[number]]: {
            [key: string]: number
        }
    }

const counts = ref<Counts | null>(null);
/*  Looks like this:
    {
        "Language": {
            "English": 1,
            "Spanish": 2,
            "French": 3
        },
        "Browser": {
            "Chrome": 4,
            "Firefox": 5,
            "Safari": 6
        }, 
        ...
    }
*/

const accessToken = inject(accessTokenKey);
const refresh = inject(refreshTokensKey) as () => Promise<boolean>;


const getCounts = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getAnalytics?short=${props.short}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getAnalytics?short=${props.short}`;
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
        } else if (res.status === 401) {
            return -1;
        } else {
            return null;
        }
    });

    if (response === -1) {
        if (retry && await refresh()) {
            await getCounts(false);
        } else {
            doneLoading.value = true;
        }
    } else if (response) {
        counts.value = response.counts;
        doneLoading.value = true;
    }
}

onMounted(async () => {
    await getCounts()
})

const sortedData = computed(() => {
    if (!counts.value)
        return null;

    let compare: (a: string, b: string) => number;
    const data = counts.value[selected.value];
    
    if (sort.value === "Count ↓") {
        compare = (a: string, b: string) => data[b] - data[a];
    } else {
        compare = (a: string, b: string) => data[a] - data[b];
    }

    /* 
    Sort the keys by value, copy over the values
    {
        "A": 3,
        "B": 5,
        "C": 2
    } 

    ["A", "B", C"] => ["C", "A", "B"]

    {
        "C": 2,
        "A": 3,
        "B": 5
    }
    */

    const sortedData: Counts[typeof Variables[number]] = {};
    Object.keys(data)
            .sort((a, b) => compare(a, b))
            .forEach((key) => {
                sortedData[key] = data[key];
            });

    return sortedData;
})


</script>

<template>
    <div v-if="!doneLoading" className = "text-white my-4 font-light">
        Loading...
    </div>
    <div v-else-if="!counts" className = "text-white my-4 font-light">
        No Data
    </div>
    <div v-else class="pt-8">

        <table class="w-[95%] mx-auto text-left text-white bg-white/5 p-2 m-5 rounded font-light">
            
            <thead class="text-gray-700 bg-stone-200">
                <th class="w-1/2">
                    <select v-model="selected" class = "border border-black/50 p-1 m-1 rounded bg-transparent font-normal">
                        <option v-for="variable in Variables">{{variable}}</option>
                    </select>
                </th>
                <th class="w-1/2">  
                    <select v-model="sort" class = "border border-black/50 p-1 m-1 rounded bg-transparent font-normal">
                        <option>
                            Count ↓
                        </option>
                        <option>
                            Count ↑
                        </option>
                    </select>        
                </th>
            </thead>


            <tbody class="px-6 py-4 whitespace-nowrap text-white">
                <tr v-for="(count, value, index) in sortedData" 
                    :key="value" 
                    class="hover:bg-white/5" :class="index % 2 === 0 ? 'bg-black/30' : 'bg-black/40'">

                    <td class="p-2">{{value}}</td>
                    <td class="p-2">{{count}}</td>
                </tr>
            </tbody>
        </table>

        
    </div>

</template>