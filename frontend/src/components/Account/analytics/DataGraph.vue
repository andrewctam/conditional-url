<script setup lang="ts">
import { ref, watch, computed, inject, onMounted } from 'vue';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'vue-chartjs'
import { accessTokenKey, Conditional, refreshTokensKey } from '../../../types';

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
    short: string,
    urls: {id: number, url: string}[]
}>();

const enum Span {
    Minute = "min",
    Hour = "hour",
    Day = "day"
}


const start = ref<string>(
    //1 day ago
    new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().slice(0, -8)
);

const span = ref<Span>(Span.Hour);
const limit = ref<number>(30);
const selectedUrl = ref("-1");

const earliestPoint = ref<string | undefined>(undefined);
const dataPoints = ref<number[]>([]);

const accessToken = inject(accessTokenKey);
const refresh = inject(refreshTokensKey) as () => Promise<boolean>;
const doneLoading = ref(false);

onMounted(async () => {
    await getDataPoints(true, true);
})

watch([span, limit, start, selectedUrl], async () => {
        await getDataPoints();
})

const getDataPoints = async (retry: boolean = true, refreshData = false) => {
    if (!accessToken || !accessToken.value)
        return;

    const unixInMins = Math.floor(new Date(start.value).getTime() / 60000);
    
    if (unixInMins < 15778380) // year is before 2000
        return;
    
    doneLoading.value = false;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getDataPoints?short=${props.short}&span=${span.value}&start=${unixInMins}&limit=${limit.value}&selectedUrl=${selectedUrl.value}&refresh=${refreshData}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getDataPoints?short=${props.short}&span=${span.value}&start=${unixInMins}&limit=${limit.value}&selectedUrl=${selectedUrl.value}&refresh=${refreshData}`;
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
            await getDataPoints(false, refreshData);
        } else {
            doneLoading.value = true;
        }

    } else if (!response.msg) {
        dataPoints.value = response.dataPoints;
        doneLoading.value = true;

        //on initial load, set earliest point
        if (earliestPoint.value === undefined && dataPoints.value.length > 0) {
            earliestPoint.value = response.earliestPoint.slice(0, -8);
        }
    }
}


const truncate = (str: string, maxLen: number = 50) => {
    if (str.length > maxLen) {
        return str.slice(0, maxLen) + "...";
    } else {
        return str;
    }
}


const moveStartBySpan = (num: number) => {
    let spanMins: number;
    switch(span.value) {
        case Span.Minute:
            spanMins = 1;
            break;
        case Span.Hour:
            spanMins = 60;
            break;
        case Span.Day:
            spanMins = 1440;
            break;
        default:
            spanMins = 1;
    }

    const newDate = new Date(start.value);
    const localNewDate = new Date(newDate.getTime() - (newDate.getTimezoneOffset() * 60000));

    localNewDate.setMinutes(localNewDate.getMinutes() + (spanMins * num));
    start.value = localNewDate.toISOString().slice(0, -8);
}

const data = computed(() => {
    if (!start.value)
        return {
            labels: [],
            datasets: []
        };

    let spanMins: number;
    switch(span.value) {
        case Span.Minute:
            spanMins = 1;
            break;
        case Span.Hour:
            spanMins = 60;
            break;
        case Span.Day:
            spanMins = 1440;
            break;
        default:
            spanMins = 1;
    }
    
    let firstDate = new Date(start.value).getTime();
    firstDate -= firstDate % (spanMins * 60000); //round down to nearest span

    let labels = new Array(limit.value).fill(null).map((_, i) => {
        return new Date(firstDate + (spanMins * 60000 * i)).toLocaleString();
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
    <div class="w-full p-2 mb-8 text-white bg-black/10 rounded font-light select-none relative">
        <p class="my-4 font-extralight text-xl inline">
            Redirects Over Time
        </p>
        <div class="mt-2">
            <label class="text-sm">From:</label>
            <select v-model="selectedUrl" id="selectedUrl" class = "border border-black/50 p-1 m-1 rounded font-normal bg-gray-600/50">
                <option class="bg-gray-600"  value = "-1"> All URLs </option>
                <option class="bg-gray-600" v-for="url in props.urls" :value="url.id">
                    {{`(${url.id + 1}) ${truncate(url.url)}`}}
                </option>
        </select>
        </div>

        
        <svg v-if="doneLoading" @click="getDataPoints(true, true)" class="absolute top-2 right-2 cursor-pointer" xmlns="http://www.w3.org/2000/svg"  width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747"></path>
            <path d="M20 4v5h-5"></path>
        </svg>
        <div v-else class="absolute top-1 right-0 text-white font-light mx-2">
            ...
        </div>

        <div class="bg-[#424242] rounded mx-4 mt-2 mb-6 p-2 pt-0 sm:flex sm:flex-wrap sm:justify-around">
            <div class="mt-2">
                <label  class="block text-sm">
                    <span @click="moveStartBySpan(-1)" class = "cursor-pointer">←</span>
                    Range Start
                    <span @click="moveStartBySpan(1)" class = "cursor-pointer">→</span>
                </label>
                <input v-model = "start" 
                    type = "datetime-local" id="start" class = "bg-gray-600/50 border border-black/50 p-1 m-1 rounded my-auto font-normal inline"
                    :max="new Date().toISOString().slice(0, -8)"
                    />
            </div>

            <div class="mt-2">
                <label class="block text-sm">Time Span</label>
                <select v-model="span" id="span" class = "border border-black/50 p-1 m-1 rounded font-normal bg-gray-600/50">
                    <option class="bg-gray-600" :value = "Span.Minute"> 1 minute </option>
                    <option class="bg-gray-600" :value = "Span.Hour"> 1 hour </option>
                    <option class="bg-gray-600" :value = "Span.Day"> 1 day </option>
                </select>
            </div>

            <div class="mt-2">
                <label  class="block text-sm">Range Length</label>
                <select v-model="limit" id="limit" class = "border border-black/50 p-1 m-1 rounded font-normal bg-gray-600/50">
                    <option class="bg-gray-600" v-for="n in 10" :value = "n * 10"> {{`${n * 10} ${span}s`}} </option>
                </select>
            </div>
        </div>

        <Line :data="data" :options="options" />
    </div>

</template>