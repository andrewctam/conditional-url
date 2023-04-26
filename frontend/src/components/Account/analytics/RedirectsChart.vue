<script setup lang="ts">
import { ref, computed, watch} from 'vue';

import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'
import Reload from '../../Icons/Reload.vue';

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
        

        <Reload 
            v-if ="!reloading"
            class="absolute top-2 right-2 cursor-pointer"
            @click="() => { reloading = true; $emit('refresh'); }" 
        />
        <div v-else class="absolute top-1 right-0 text-white font-light mx-2">
            ...
        </div>

        <Bar :data="data" :options="options"/>

    </div>

</template>
