<script setup lang="ts">
import { ref, inject } from 'vue'
import { accessTokenKey, refreshTokensKey, updateMsgKey, usernameKey } from '../../../types';

const accessToken = inject(accessTokenKey);
const refresh = inject(refreshTokensKey) as () => Promise<boolean>;
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void

const emit = defineEmits<
    (event: 'close') => void
>();
const deleteAllURLs = async (retry: boolean = true) => {
    if (!accessToken || !accessToken.value)
        return;
        let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/deleteAllURLs`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/deleteAllURLs`;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken.value}`
        }
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
            await deleteAllURLs(false);
        } else {
            updateMsg("Error with tokens", true);
        }
    } else if (response) {
        updateMsg("All URLs deleted");
        emit('close')
    }
}
</script>

<template>
    <div class="mx-auto mt-4 text-white font-extralight md:text-2xl text-lg">
        Delete All URLs
    </div>

    <div class="mx-auto mt-4 text-white font-extralight text-lg">
        Are you sure you want to delete all your URLs?
    </div>

    <button @click="$emit('close')" class = "rounded px-4 py-1 mr-4 border border-black bg-red-800/50 font-light text-white mt-8"> 
        Cancel
    </button>
    <button @click="deleteAllURLs()" class = "rounded px-4 py-1 border border-black bg-transparent font-light text-white mt-8"> 
        Confirm
    </button>
</template>
