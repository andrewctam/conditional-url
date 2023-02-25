<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue';
import { accessTokenKey, refreshTokensKey, Variables } from '../../types';
import { Variable } from '../ConditionalsEditor/AddConditionMenu.vue';
import PageArrows from '../PageArrows.vue';

const props = defineProps<{
    short: string
}>();



const doneLoading = ref(false);
const selected = ref<Variable>("Language");
const sort = ref<"Increasing" | "Decreasing">("Decreasing");

const counts = ref< {key: string, count: number}[] | null>(null);
const page = ref(0);
const pageCount = ref(0);

const accessToken = inject(accessTokenKey);
const refresh = inject(refreshTokensKey) as () => Promise<boolean>;


const getCounts = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;

    let url;
    const pageSize = 10;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getData?short=${props.short}&variable=${selected.value}&page=${page.value}&pageSize=${pageSize}&sort=${sort.value}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getData?short=${props.short}&variable=${selected.value}&page=${page.value}&pageSize=${pageSize}&sort=${sort.value}`;
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
        pageCount.value = response.pageCount;
        doneLoading.value = true;

    }
}

onMounted(async () => {
    await getCounts()
})

watch(selected, async () => {
    page.value = 0;
    pageCount.value = 0;
    doneLoading.value = false;
    await getCounts();
})

watch([sort, page], async () => {
    doneLoading.value = false;
    await getCounts();
})

const hasNext = computed(() => {
    return page.value + 1 < pageCount.value;
})

const hasPrev = computed(() => {
    return page.value > 0;
})


</script>

<template>
    <div class="bg-black/10 p-2 mb-6 rounded select-none">
        <p class = "text-white text-xl font-extralight select-none mt-4">Data Counts</p>
        <table class="w-[95%] mx-auto text-left text-whitep-2 m-5 font-light">
            <thead class="text-white bg-[#424242]">
                <th class="w-1/2">
                    <select v-model="selected" class = "select-none border border-black/50 p-1 m-1 rounded bg-transparent font-light">
                        <option v-for="variable in Variables">{{variable}}</option>
                    </select>
                </th>
                <th class="w-1/2">  
                    <select v-model="sort" class = "select-none border border-black/50 p-1 m-1 rounded bg-transparent font-light">
                        <option value = "Decreasing">
                            Count ↓
                        </option>
                        <option value = "Increasing">
                            Count ↑
                        </option>
                    </select>        
                </th>
            </thead>


            <tbody class="px-6 py-4 whitespace-nowrap text-white select-text">
                <tr v-for="(datum, index) in counts" 
                    :key="datum.key + index" 
                    class="hover:bg-white/5" :class="index % 2 === 0 ? 'bg-black/30' : 'bg-black/40'">

                    <td class="p-2">{{datum.key}}</td>
                    <td class="p-2 select">{{datum.count}}</td>
                </tr>
            </tbody>
        </table>

        <div v-if="!doneLoading" class="flex text-white font-light justify-center">
            Loading...
        </div>
        <PageArrows 
            v-else
            :hasNext="hasNext" 
            :hasPrev="hasPrev" 
            :page="page" 
            :pageCount="pageCount"
            @next="page++"
            @prev="page--"
        />
    </div>

</template>