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


const span = ref<number>(60);
const start = ref<string | undefined>(undefined);
const earliestPoint = ref<string | undefined>(undefined);

const limit = ref<number>(30);
const dataPoints = ref<{
    spanStart: string,
    count: number
}[]>([]);

const accessToken = inject(accessTokenKey);
const refresh = inject(refreshTokensKey) as () => Promise<boolean>;
const doneLoading = ref(false);


onMounted(async () => {
    await getDataPoints();
})

watch([span, limit, start], async ([newSpan, newLimit, newStart], [oldSpan, oldLimit, oldStart]) => {
    if (oldStart !== undefined) //prevent another call after updating the start for the inital load
        await getDataPoints();
})

const zeroesIfNecessary = (num: number) => {
    if (num < 10)
        return `0${num}`;
    return num;
}

const getDataPoints = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;

    doneLoading.value = false;

    
    const unixInMins = start.value ? Math.floor(new Date(start.value).getTime() / 60000) : "undefined";

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getDataPoints?short=${props.short}&span=${span.value}&start=${unixInMins}&limit=${limit.value}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getDataPoints?short=${props.short}&span=${span.value}&start=${unixInMins}&limit=${limit.value}`;
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
            await getDataPoints(false);
        } else {
            doneLoading.value = true;
        }
    } else if (response) {
        dataPoints.value = response.dataPoints;
        doneLoading.value = true;

        if (start.value === undefined && dataPoints.value.length > 0) {
            const day = new Date(dataPoints.value[0].spanStart);

            const y = day.getFullYear();
            const m = zeroesIfNecessary(day.getMonth() + 1);
            const d = zeroesIfNecessary(day.getDate());
            const h = zeroesIfNecessary(day.getHours());
            const min = zeroesIfNecessary(day.getMinutes());

            start.value = `${y}-${m}-${d}T${h}:${min}`;
        }

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
    return {
        labels: dataPoints.value.map((d) =>  {
            const start = new Date(d.spanStart);

            return start.toLocaleString() + " to " + 
                    new Date(start.getTime() + (span.value * 60000)).toLocaleString()
        }),
        datasets: [
            {
                label: "Redirects",
                data: dataPoints.value.map((d) => d.count),
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
    <div class="w-full p-2 text-white bg-black/10 rounded font-light select-none">
        <p class="my-4 font-extralight text-xl">
            Redirects Over Time
        </p>

        <div class="sm:flex justify-around bg-[#424242] rounded mx-6 my-2 p-2">
            <div>
                <label for="start" class="block text-sm">Range Start</label>
                <input v-model = "start" type = "datetime-local" id="start" class = "border border-black/50 p-1 m-1 rounded bg-transparent font-normal inline" :min="earliestPoint"/>
            </div>

            <div>
                <label for="span" class="block text-sm">Time Span</label>
                <select v-model="span" id="span" class = "border border-black/50 p-1 m-1 rounded bg-transparent font-normal">
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
                <select v-model="limit" id="limit" class = "border border-black/50 p-1 m-1 rounded bg-transparent font-normal">
                    <option v-for="n in 10" :value = "n * 10"> {{`${n * 10 * rangeMultiplier} ${unit}s`}} </option>
                </select>
            </div>

           
        </div>

        <Line :data="data" :options="options" />
    </div>

</template>