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
const search = ref("");
const noURLs = ref(false);
const page = ref(0);
const pageCount = ref(1);
const searchedPageCount = ref(1);
const doneLoading = ref(false);
const shortURLs: Ref<string[]> = ref([]); 
const refresh = inject(refreshTokensKey) as () => Promise<boolean>
const accessToken = inject(accessTokenKey)

const emit = defineEmits<{
    (event: 'close'): void
}>();

const selected = ref("");

const fetchURLs = async (direction: Direction, retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;
    
    if (page.value + direction < 0 || page.value + direction >= pageCount.value)
        return;
    
    const searchParam = search.value ? `?search=${search.value}&` : "";
    doneLoading.value = false;
    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/getUserURLs${searchParam}?page=${page.value + direction}&sort=${sorting.value}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/getUserURLs${searchParam}?page=${page.value + direction}&sort=${sorting.value}`;
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
            await fetchURLs(direction, false);
        }
        return;
    } else if (!response.msg) {
        noURLs.value = response.noURLs;
        if (!noURLs.value) {
            shortURLs.value = response.paginatedURLs;
            pageCount.value = response.pageCount;
            searchedPageCount.value = response.searchedPageCount;
        }
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
    await fetchURLs(Direction.Same);

    const view = route.query.view as string | undefined;
    if (view) {
        selected.value = view;
    }

})

watch([search, sorting], async () => {
    await fetchURLs(Direction.Same);
})

watch(selected, () => {
    if (selected.value)
        router.push({query: { view: selected.value }})
    else
        router.push({ query: { action: 'viewurls' }});
})


</script>

<template>
    <div v-if="selected === ''" class="xl:w-1/2 lg:w-2/3 md:w-5/6 w-[95%] bg-black/10 my-8 pb-4 mx-auto border border-black/25 rounded-xl text-center relative">
        <div class="mx-auto mt-4 text-white font-extralight md:text-2xl text-lg select-none">
            Your URLs
        </div>

        <p v-if="noURLs" class="text-white font-light my-4">
            No URLs created. 
            <span @click="$emit('close')" class="text-blue-200 hover:text-blue-300 font-light cursor-pointer">
                Create your first!
            </span>
        </p>
        <div v-else>
            <div class="mt-1 mb-4">
                <div>
                    <input 
                        v-model="search"
                        placeholder="Search"
                        type="text" 
                        class="text-white bg-black/25 rounded-xl px-2 py-1 my-2" 
                    >
                </div>

                <span @click="sorting=Sorting.Newest" class="cursor-pointer select-none text-sm" :class="sorting===Sorting.Newest ? 'text-blue-200' : 'text-white'" >
                    Newest
                </span>
                <span class="text-white text-xl select-none">
                    •
                </span>
                <span @click="sorting=Sorting.Oldest" class="cursor-pointer select-none text-sm" :class="sorting===Sorting.Oldest ? 'text-blue-200' : 'text-white'" >
                    Oldest
                </span>
            </div>

            
            <ul v-for="short in shortURLs" :key="short" class="my-3">
                <ShortBlock 
                    :short="short" 
                    @select="() => { selected = short }" 
                />
            </ul>

            <PageArrows
                v-if="searchedPageCount > 1"
                :hasNext="hasNext"
                :hasPrev="hasPrev"
                :canMove="doneLoading"
                :page="page"
                :pageCount="pageCount"
                @prev="fetchURLs(Direction.Prev)"
                @next="fetchURLs(Direction.Next)"
            />
        </div>
    </div>

    <URLEditor 
        v-else
        :short="selected"
        @close="selected = ''"
        @closeAndFetch="() => {
            selected = '';
            fetchURLs(Direction.Same);
        }"
    />    

</template>