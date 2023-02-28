<script setup lang="ts">
import { ref, computed, onBeforeMount, inject, watch } from 'vue'
import type { Ref } from 'vue'
import ShortBlock from './ShortBlock.vue';
import URLEditor from './URLEditor.vue';
import { accessTokenKey, refreshTokensKey, updateMsgKey } from '../../types';
import { useRoute, useRouter } from 'vue-router';
import PageArrows from '../PageArrows.vue';

const router = useRouter();
const route = useRoute();

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
const refresh = inject(refreshTokensKey) as () => Promise<boolean>
const accessToken = inject(accessTokenKey)


const emit = defineEmits<{
    (event: 'close'): void
}>();

const selected = ref("");

const fetchUrls = async (direction: Direction, retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;
    
    if (page.value + direction < 0 || page.value + direction >= pageCount.value)
        return;
    
    doneLoading.value = false;
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
        return res.json();
    });

    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await fetchUrls(direction, false);
        }
        return;
    } else if (!response.msg) {
        shortUrls.value = response.paginatedUrls;
        pageCount.value = response.pageCount;
    }

    doneLoading.value = true;
    page.value += direction;
}

const hasNext = computed(() => {
    return page.value + 1 < pageCount.value;
})

const hasPrev = computed(() => {
    return page.value - 1 >= 0;
})

onBeforeMount(async () => {
    await fetchUrls(Direction.Same);

    const view = route.query.view as string | undefined;
    if (view) {
        selected.value = view;
    }

})

watch(sorting, async (oldSorting, newSorting) => {
    if (oldSorting !== newSorting)
        await fetchUrls(Direction.Same);
})


</script>

<template>
    <div class="xl:w-1/2 lg:w-2/3 md:w-5/6 w-[95%] bg-black/10 my-8 pb-4 mx-auto border border-black/25 rounded-xl text-center relative">
        <URLEditor 
            v-if="selected !== ''"
            
            :short="selected"
            @close="selected = ''"
            @closeAndFetch="() => {
                selected = '';
                fetchUrls(Direction.Same);
            }"
        />    

        <div v-else>
            <div class="mx-auto mt-4 text-white font-extralight md:text-2xl text-lg select-none">
                Your URLs
            </div>

            <div v-if="doneLoading && shortUrls.length > 0" class="mt-1 mb-4">
                <span @click="sorting=Sorting.Newest" class="cursor-pointer select-none" :class="sorting===Sorting.Newest ? 'text-blue-200' : 'text-white'" >
                    Newest
                </span>
                <span class="text-white text-xl select-none">
                    •
                </span>
                <span @click="sorting=Sorting.Oldest" class="cursor-pointer select-none" :class="sorting===Sorting.Oldest ? 'text-blue-200' : 'text-white'" >
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
                <ShortBlock 
                    :short="short" 
                    @select="() => {
                        selected = short
                        router.push({query: {view: short}})
                    }" />
            </ul>

            <PageArrows
                :hasNext="hasNext"
                :hasPrev="hasPrev"
                :page="page"
                :pageCount="pageCount"
                @prev="fetchUrls(Direction.Prev)"
                @next="fetchUrls(Direction.Next)"
            />
        </div>

    </div>

</template>