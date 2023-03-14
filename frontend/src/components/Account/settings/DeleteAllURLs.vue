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
        return res.json();
    });

    if (response.msg === "Invalid token") {
        if (retry && await refresh()) {
            await deleteAllURLs(false);
        } else {
            updateMsg("Error with tokens", true);
        }
    } else if (!response.msg) {
        updateMsg("All URLs deleted");
        emit('close')
    }
}
</script>

<template>
    <div class="mx-auto mt-4 text-white font-extralight md:text-2xl text-lg select-none">
        Delete All URLs
    </div>

    <div class="mt-4 mx-8 text-white font-extralight text-lg select-none">
        Are you sure you want to delete all your URLs?
    </div>

    <button @click="$emit('close')" class = "rounded px-4 py-1 mr-4 bg-red-800/50 font-light text-white mt-8 select-none"> 
        Cancel
    </button>
    <button @click="deleteAllURLs()" class = "rounded px-4 py-1 bg-black/20 font-light text-white mt-8 select-none"> 
        Confirm
    </button>
</template>
