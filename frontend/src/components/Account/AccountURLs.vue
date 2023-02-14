<script setup lang="ts">
import { ref, computed, onBeforeMount, inject } from 'vue'
import type { Ref } from 'vue'
import ShortBlock from './ShortBlock.vue';
import URLEditor from './URLEditor.vue';

const page = ref(0);
const pageCount = ref(0);
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

const fetchUrls = async () => {
    if (!accessToken || !accessToken.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/userUrls?page=${page.value}`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/userUrls?page=${page.value}`;
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
            await fetchUrls();
        }
        return;
    } else if (response) {
        console.log(response)
        shortUrls.value = response.paginatedUrls;
        pageCount.value = response.pageCount;

        page.value++;
    }

}

onBeforeMount(async () => {
    await fetchUrls();
})

</script>

<template>
    <div class="xl:w-1/2 lg:w-2/3 md:w-5/6 w-[95%] bg-black/10 my-8 mx-auto border border-black/25 rounded-xl text-center relative">
        <div v-if='selected === "" '>
            <span @click='$emit("close")' class="absolute top-1 left-2 text-xl text-white hover:text-red-200 cursor-pointer ">
                ←
            </span>

            <div class="mx-auto my-4 text-white font-extralight md:text-2xl text-lg">
                Your URLs
            </div>

            <ul v-for="short in shortUrls" :key="short" class="my-4">
                <ShortBlock :short="short" @select="selected = short" />
            </ul>
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