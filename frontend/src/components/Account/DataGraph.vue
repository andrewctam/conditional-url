<script setup lang="ts">
import { ref, watch, computed, inject, onMounted } from 'vue';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'vue-chartjs'
import { accessTokenKey, refreshTokensKey } from '../../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)
ChartJS.defaults.color = "white";

const props = defineProps<{
    short: string
}>();


const start = ref<string | undefined>(undefined);
const span = ref<number>(60);
const limit = ref<number>(30);

const earliestPoint = ref<string | undefined>(undefined);
const dataPoints = ref<number[]>([]);

const accessToken = inject(accessTokenKey);
const refresh = inject(refreshTokensKey) as () => Promise<boolean>;
const doneLoading = ref(false);


onMounted(async () => {
    await getDataPoints(true, true);
})

watch([span, limit], async () => {
        await getDataPoints();
})

watch(start, async (newStart, oldStart) => {
    if (oldStart !== undefined) // don't run again after setting oldStart in first load
        await getDataPoints();

})


const zeroesIfNecessary = (num: number) => {
    if (num < 10)
        return `0${num}`;
    return num;
}

const getDataPoints = async (retry: boolean = true, refreshData = false) => {
    if (!accessToken || !accessToken.value)
        return;

    const unixInMins = start.value ? Math.floor(new Date(start.value).getTime() / 60000) : "undefined";
    
    if (unixInMins < 15778380) // year is before 2000
        return;
    
    doneLoading.value = false;

    


    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getDataPoints?short=${props.short}&span=${span.value}&start=${unixInMins}&limit=${limit.value}&refresh=${refreshData}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getDataPoints?short=${props.short}&span=${span.value}&start=${unixInMins}&limit=${limit.value}&refresh=${refreshData}`;
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

    console.log(response)

    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await getDataPoints(false);
        } else {
            doneLoading.value = true;
        }

    } else if (!response.msg) {
        dataPoints.value = response.dataPoints;
        doneLoading.value = true;

        //on initial load, set start to earliest point
        if (start.value === undefined && dataPoints.value.length > 0) {
            const day = new Date(response.start * 60000);

            const y = day.getFullYear();
            const m = zeroesIfNecessary(day.getMonth() + 1);
            const d = zeroesIfNecessary(day.getDate());
            const h = zeroesIfNecessary(day.getHours());
            const min = zeroesIfNecessary(day.getMinutes());

            start.value = `${y}-${m}-${d}T${h}:${min}`;
        }

        //on initial load, set earliest point to earliest point
        if (earliestPoint.value === undefined && dataPoints.value.length > 0) {
            const day = new Date(response.earliestPoint);

            const y = day.getFullYear();
            const m = zeroesIfNecessary(day.getMonth() + 1);
            const d = zeroesIfNecessary(day.getDate());
            const h = zeroesIfNecessary(day.getHours());
            const min = zeroesIfNecessary(day.getMinutes());

            earliestPoint.value = `${y}-${m}-${d}T${h}:${min}`;
        }

    }
}


const unit = computed(() => {
    if (span.value >= 1440)
        return "day"
    else if (span.value >= 60)
        return "hour"
    else if (span.value >= 1)
        return "minute"

    return "";
})

const rangeMultiplier = computed(() => {
    if (span.value >= 1440)
        return span.value / 1440;
    else if (span.value >= 60)
        return span.value / 60;
    else
        return span.value;
})


const data = computed(() => {
    if (!start.value)
        return {
            labels: [],
            datasets: []
        };

    let firstDate = new Date(start.value).getTime();
    firstDate -= firstDate % (span.value * 60000);

    let labels = new Array(limit.value).fill(null).map((_, i) => {
        return new Date(firstDate + (span.value * 60000 * i)).toLocaleString();
    });

    return {
        labels: labels,
        datasets: [
            {
                label: "Redirects",
                data: dataPoints.value,
                borderColor: "rgb(169, 209, 209)",
                borderWidth: 1,
                pointRadius: 1
            }
        ]
    }
});

const options = {
    responsive: true,
    interaction: {
        intersect: false,
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0,
            },
        },
        x:{
            ticks: {
                display: false 
            }
        }
        
    },
    plugins: {
        legend: {
            display: false
        }
    }
}
</script>


<template>
    <div class="w-full p-2 text-white bg-black/10 rounded font-light select-none relative">
        <p class="my-4 font-extralight text-xl inline">
            Redirects Over Time
        </p>

        <svg @click="getDataPoints(true, true)" class="absolute top-2 right-2 cursor-pointer" xmlns="http://www.w3.org/2000/svg"  width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747"></path>
            <path d="M20 4v5h-5"></path>
        </svg>

        <div class="sm:flex justify-around bg-[#424242] rounded mx-6 my-2 p-2">
            <div>
                <label for="start" class="block text-sm">Range Start</label>
                <input v-model = "start" 
                    type = "datetime-local" id="start" class = "bg-gray-600 border border-black/50 p-1 m-1 rounded my-auto font-normal inline"
                    :min="earliestPoint"
                    :max="new Date().toISOString().slice(0, -8)"
                    :step="span * 60"
                    />
            </div>

            <div>
                <label for="span" class="block text-sm">Time Span</label>
                <select v-model="span" id="span" class = "border border-black/50 p-1 m-1 rounded font-normal bg-gray-600">
                    <option :value = "1"> 1 minute </option>
                    <option :value = "5"> 5 minutes </option>
                    <option :value = "15"> 15 minutes </option>
                    <option :value = "30"> 30 minutes </option>
                    <option :value = "60"> 1 hour </option>
                    <option :value = "180"> 3 hours </option>
                    <option :value = "360"> 6 hours </option>
                    <option :value = "720"> 12 hours </option>
                    <option :value = "1440"> 1 day </option>
                </select>
            </div>

            <div>
                <label for="limit" class="block text-sm">Range Length</label>
                <select v-model="limit" id="limit" class = "border border-black/50 p-1 m-1 rounded font-normal bg-gray-600">
                    <option v-for="n in 10" :value = "n * 10"> {{`${n * 10 * rangeMultiplier} ${unit}s`}} </option>
                </select>
            </div>

           
        </div>

        <Line :data="data" :options="options" />
    </div>

</template>