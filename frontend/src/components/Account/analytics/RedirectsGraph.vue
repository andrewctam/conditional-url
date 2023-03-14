<script setup lang="ts">
import { ref, computed, watch} from 'vue';
import { Conditional } from '../../../types';

import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
 
const reloading = ref(false);

const props = defineProps<{
    conditionals: Conditional[]
}>();

watch(props, () => {
    reloading.value = false;
})

const sum = computed(() => {
    return props.conditionals.reduce((acc, cur) => {
        return acc + (cur.redirects ?? 0);
    }, 0)
})


const data = computed(() => {
    return {
        labels: props.conditionals.map((_, i) => "URL " + (i + 1)), 
        datasets: [
            {
                backgroundColor: '#b2d4d3',
                data: props.conditionals.map((c) => c.redirects ?? 0)
            }
        ]
    }
})

const options = {
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

        <Bar :data="data" :options="options" />
        
    </div>

</template>