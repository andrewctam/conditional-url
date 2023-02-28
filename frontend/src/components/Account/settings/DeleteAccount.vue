<script setup lang="ts">
import { ref, inject } from 'vue'
import { updateMsgKey, usernameKey } from '../../../types';

const enum Action {
    None, Account, Both
}
const username = inject(usernameKey)
const password = ref('');
const action = ref(Action.None);
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void

const emit = defineEmits<{
    (event: 'close'): void,
    (event: 'signout'): void
}>();


const deleteAccount = async () => {
    if (!username || !username.value)
        return;

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/deleteAccount`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/deleteAccount`;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }, body: JSON.stringify({
            username: username.value,
            password: password.value,
            alsoDeleteURLs: action.value === Action.Both
        })
    }).then((res) => {
        return res.json();
    });

    if (response.msg) {
        updateMsg(response.msg, true);
    } else {
        if (action.value === Action.Both)
            updateMsg("Account and URLs deleted");
        else if (action.value === Action.Account)
            updateMsg("Account deleted");

        emit('signout');
    }
}
</script>

<template>
    <div class="mx-auto mt-4 text-white font-extralight md:text-2xl text-lg">
        Delete Account
    </div>

    <button @click="$emit('close')" class = "rounded px-4 py-1 mr-4 border border-black bg-red-800/50 font-light text-white mt-8"> 
        Cancel
    </button>
    <button @click="action=Action.Account" class = "rounded px-4 py-1 mr-4 border border-black font-light disabled:text-gray-400 text-white mt-8"
                :class="action===Action.Account ? 'bg-black/50' : 'bg-transparent'"> 
        Delete Account
    </button>
    <button @click="action=Action.Both" class = "rounded px-4 py-1 border border-black font-light disabled:text-gray-400 text-white mt-8"
                :class="action===Action.Both ? 'bg-black/50' : 'bg-transparent'"> 
        Delete Account and All URLs
    </button>

    <div v-if="action === Action.Account" class="text-red-400 mt-4 w-3/4 mx-auto font-light bg-black/10 rounded p-4">
        After deleting your account, you will no longer be able to edit your URLs or view analytics, even if you create a new account with the same username
    </div>

    <div v-if="action!==Action.None" class = "mt-12 border border-black w-fit mx-auto p-3 bg-black/20 rounded text-center">
       
        <label class="text-sm font-light text-white">
            Confirm Password
        </label>
        <div class="mt-1">
            <input v-model="password" type="password" autocomplete="password" class="sm:text-sm text-black p-1 bg-gray-400 font-light rounded-md w-60">
        </div>

        <button @click="deleteAccount" :disabled="password.length === 0" class = " rounded px-4 py-1 border border-black bg-green-100/10 font-light disabled:text-gray-400 text-white mt-4"> 
            Finalize
        </button>
    </div>
</template>
