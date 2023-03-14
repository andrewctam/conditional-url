<script setup lang="ts">
import { ref, computed, watch} from 'vue';
import { Conditional } from '../../../types';

import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
 
const reloading = ref(false);

const props = defineProps<{
    redirects: number[]
}>();

enum Sort {
    URLOrder = "URL Order",
    MostRedirects = "Most Redirects",
    LeastRedirects = "Least Redirects"
}

const sort = ref<Sort>(Sort.URLOrder);

watch(props, () => {
    reloading.value = false;
})

const sum = computed(() => {
    return props.redirects.reduce((acc, cur) => {
        return acc + cur;
    }, 0)
})


const data = computed(() => {
    let redirects: number[] = [...props.redirects]
    let indexes: number[] = props.redirects.map((_, i) => i);
    switch(sort.value) {
        case Sort.MostRedirects:
            indexes.sort((a, b) => redirects[b] - redirects[a])
            redirects.sort((a, b) => b - a);
            break;
        case Sort.LeastRedirects:
            indexes.sort((a, b) => redirects[a] - redirects[b])
            redirects.sort((a, b) => a - b);
            break;

        case Sort.URLOrder: //already sorted
        default: 
            break;
    }

    return {
        labels: indexes.map(i => "URL " + (i + 1)), 
        datasets: [
            {
                backgroundColor: '#a4cacb',
                data: redirects
            }
        ],
    }
})

const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            display: false
        }
    }

}


defineEmits<{
    refresh: () => void
}>()

</script>


<template>
    <div class="w-full p-2 mb-8 text-white bg-black/10 rounded font-light select-none relative">
        <p class="my-4 font-extralight text-xl inline">
            Redirect Counts
        </p>

        <p class = "text-sky-100">Total: {{ sum }} </p>

        <div class="mt-2">
            <span class="mr-1 font-light">Sort by:</span>
            <select v-model="sort" class = "select-none text-white border border-black/50 p-1 m-1 w-[200px] rounded font-light bg-gray-600/50">
                <option class="bg-gray-600" v-for="s in Object.values(Sort)" :value="s">
                    {{ s }}
                </option>
            </select>
        </div>
        


        <svg v-if ="!reloading" @click="() => {
                reloading = true;
                $emit('refresh')
            }" 
            class="absolute top-2 right-2 cursor-pointer" xmlns="http://www.w3.org/2000/svg"  width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">

            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747"></path>
            <path d="M20 4v5h-5"></path>
        </svg>
        <div v-else class="absolute top-1 right-0 text-white font-light mx-2">
            ...
        </div>

        <Bar :data="data" :options="options"/>

    </div>

</template>
