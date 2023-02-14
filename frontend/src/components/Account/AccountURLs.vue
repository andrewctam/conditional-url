<script setup lang="ts">
import { ref, computed, onBeforeMount, inject } from 'vue'
import type { Ref } from 'vue'
import ShortBlock from './ShortBlock.vue';
import URLEditor from './URLEditor.vue';

const enum Sorting {
    "Newest" = "Newest",
    "Oldest" = "Oldest"
}

const enum Direction {
    "Same" = 0,
    "Prev" = -1,
    "Next" = 1,
}
const sorting = ref(Sorting.Newest);
const page = ref(0);
const pageCount = ref(1);
const doneLoading = ref(false);
const shortUrls: Ref<string[]> = ref([]);
const refresh: undefined | (() => Promise<boolean>) = inject('refresh');

const emit = defineEmits<{
    (event: 'close'): void
}>();

const selected = ref("");
const accessToken: Ref<string> | undefined = inject('accessToken')

const domain = computed(() => {
    if (import.meta.env.PROD) {
        return import.meta.env.VITE_PROD_URL;
    } else {
        return import.meta.env.VITE_DEV_URL;
    }
})


const fetchUrls = async (direction: Direction) => {
    if (!accessToken || !accessToken.value)
        return;

    if (page.value + direction < 0 || page.value + direction >= pageCount.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/userUrls?page=${page.value + direction}&sort=${sorting.value}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/userUrls?page=${page.value + direction}&sort=${sorting.value}`;
    }

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        },
    }).then((res) => {
        console.log(res)
        if (res.status === 200) {
            return res.json();
        } else if (res.status === 401) {
            return -1;
        } else {
            return null;
        }
    });

    if (response === -1) {
        if (refresh && await refresh()) {
            await fetchUrls(direction);
        }
        return;
    } else if (response) {
        console.log(response)
        shortUrls.value = response.paginatedUrls;
        pageCount.value = response.pageCount;
    }

    doneLoading.value = true;
    page.value += direction;
}

onBeforeMount(async () => {
    await fetchUrls(Direction.Same);
})

const hasNext = computed(() => {
    return page.value + 1 < pageCount.value;
})

const hasPrev = computed(() => {
    return page.value - 1 >= 0;
})

</script>

<template>
    <div class="xl:w-1/2 lg:w-2/3 md:w-5/6 w-[95%]bg-black/10 my-8 pb-10 mx-auto border border-black/25 rounded-xl text-center relative">
        <div v-if='selected === ""'>
            <span @click='$emit("close")' class="absolute top-1 left-2 text-xl text-white hover:text-red-200 cursor-pointer ">
                ←
            </span>

            <div class="mx-auto mt-4 text-white font-extralight md:text-2xl text-lg">
                Your URLs
            </div>

            <div v-if="doneLoading && shortUrls.length > 0" class="mt-1 mb-4">
                <span @click="sorting=Sorting.Newest; fetchUrls(Direction.Same)" class="cursor-pointer" :class="sorting===Sorting.Newest ? 'text-blue-200' : 'text-white'" >
                    Newest
                </span>
                <span class="text-white text-xl">
                    •
                </span>
                <span @click="sorting=Sorting.Oldest; fetchUrls(Direction.Same)" class="cursor-pointer" :class="sorting===Sorting.Oldest ? 'text-blue-200' : 'text-white'" >
                    Oldest
                </span>
            </div>

            <p v-if="!doneLoading" class="text-white font-light mt-4">
                Loading...
            </p>
            <p v-else-if="shortUrls.length === 0" class="text-white font-light mt-4">
                No URLs created. 
                <span @click="$emit('close')" class="text-blue-200 hover:text-blue-300 font-light cursor-pointer">
                    Create your first!
                </span>
            </p>
            <ul v-else v-for="short in shortUrls" :key="short" class="my-3">
                <ShortBlock :short="short" @select="selected = short" />
            </ul>

            <div v-if="hasPrev" @click="fetchUrls(Direction.Prev)" class = "absolute bottom-1 left-4 text-white hover:text-red-200 cursor-pointer font-light">
                Back
            </div>

            <div v-if="hasNext" @click="fetchUrls(Direction.Next)" class = "absolute bottom-1 right-4 text-white hover:text-green-200 cursor-pointer font-light">
                Next
            </div>
        </div>

        <div v-else>
            <span @click='selected = ""' class="absolute top-1 left-2 text-xl text-white hover:text-red-200 cursor-pointer ">
                ←
            </span>

            <div v-if='selected !== ""' class="my-4 text-white font-extralight text-2xl">
                {{`${domain}/${selected}`}}
            </div>

            <URLEditor :short="selected" />
        </div>


    </div>

</template>