<script setup lang="ts">
import { ref, inject } from 'vue'
import { updateMsgKey, usernameKey } from '../../../types';

const oldPassword = ref('');
const newPassword = ref('');
const newPasswordConfirm = ref('');

const username = inject(usernameKey);
const updateMsg = inject(updateMsgKey) as (msg: string, err?: boolean) => void
const emit = defineEmits<
    (event: 'close') => void
>();

const changePassword = async () => {
    if (!username || !username.value) {
        return;
    }
    
    if (newPassword.value !== newPasswordConfirm.value) {
        updateMsg('New passwords do not match', true);
        return;
    }

    if (newPassword.value.length < 8) {
        updateMsg('Password must be at least 8 characters long', true);
        return;
    }

    if (oldPassword.value.length < 8) {
        updateMsg("Incorrect old password.", true);
        return;
    }


    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/changePassword`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/changePassword`;
    }

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }, body: JSON.stringify({
            username: username.value,
            oldPassword: oldPassword.value,
            newPassword: newPassword.value,
        })
    }).then((res) => {
        return res.json();
    });

    if (response.msg) {
        updateMsg(response.msg, true );
    } else {
        updateMsg("Password changed successfully!");
        emit('close')
    }
}
</script>

<template>
    <div class="mx-auto mt-4 text-white font-extralight md:text-2xl text-lg">
        Change Password
    </div>

    <form @submit.prevent="changePassword" class="mx-auto mt-4 text-white font-extralight">
        <div class = "mt-4">
            <label class="text-sm font-light text-white">
                Old Password
            </label>
            <div class="mt-1">
                <input v-model="oldPassword" type="password" autocomplete="password" class="sm:text-sm text-black p-1 bg-gray-400 font-light rounded-md w-60">
            </div>
        </div>
        <div class = "mt-4">
            <label class="text-sm font-light text-white">
                New Password
            </label>
            <div class="mt-1">
                <input v-model="newPassword" type="password" class="sm:text-sm text-black p-1 bg-gray-400 font-light rounded-md w-60">
            </div>
        </div>
        <div class = "mt-4">
            <label class="text-sm font-light text-white">
                Confirm New Password
            </label>
            <div class="mt-1">
                <input v-model="newPasswordConfirm" type="password" class="sm:text-sm text-black p-1 bg-gray-400 font-light rounded-md w-60">
            </div>
        </div>
        
        <button @click="$emit('close')" class = "rounded px-4 py-1 mr-4 bg-red-800/50 font-light text-white mt-8"> 
            Cancel
        </button>   

        <button class = "rounded px-4 py-1 bg-green-400/10 font-light text-white mt-8"> 
            Confirm
        </button>
    </form>
</template>