<script setup lang='ts'>
import ConditionalsBuilder from './URLBuilder.vue'
import AccountPopup from './Account/AccountPopup.vue'
import AccountURLs from './Account/AccountURLs.vue'
import { ref, provide, onBeforeMount } from 'vue'
import type { Ref } from 'vue'
import { AccountAction, usernameKey, accessTokenKey, refreshTokensKey, updateMsgKey } from '../types'
import jwt_decode from 'jwt-decode'
import AccountSettings from './Account/settings/AccountSettings.vue'

const accountAction: Ref<AccountAction> = ref(AccountAction.CreateURL)


const username = ref('')
const accessToken = ref('')

const updateUser = (user: string, access: string, refresh: string ) => {
    username.value = user
    accessToken.value = access

    if (user === "")
        localStorage.removeItem('username')
    else 
        localStorage.setItem('username', user)

    if (access === "")
        localStorage.removeItem('accessToken')
    else 
        localStorage.setItem('accessToken', access)

    if (refresh === "")
        localStorage.removeItem('refreshToken')
    else 
        localStorage.setItem('refreshToken', refresh)

    if (user === "" || access === "" || refresh === "") {
        accountAction.value = AccountAction.CreateURL
    }
}

onBeforeMount(async () => {
    const user = localStorage.getItem('username')
    const access = localStorage.getItem('accessToken')
    
    if (user !== null && access !== null) {
        const payload = jwt_decode(access as string) as { [key: string]: any }

        if (payload.username === user && payload.exp >= Date.now() / 1000) {
            username.value = user
            accessToken.value = access
        } else {
            await refreshTokens();
        }
    }
})

const refreshTokens = async () => {
    const username = localStorage.getItem('username');
    const refreshToken = localStorage.getItem('refreshToken');

    if (username === null || refreshToken === null) {
        updateUser('', '', '')
        return;
    }
    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/refreshTokens`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/refreshTokens`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username,
            refreshToken: refreshToken
        })
    }).then(res => {
        if (res.status === 200) {
            return res.json();
        } else {
            return null;
        }
    })

    if (response !== null) {
        updateUser(username, response.accessToken, response.refreshToken)
        console.log("Successfully refreshed tokens")
        return true
    } else {
        updateUser('', '', '')
        console.log("Failed to refresh tokens")
        return false
    }
}

const msg = ref('')
const error = ref(false)
const errorTimeout = ref<NodeJS.Timeout | null>(null)
const updateMsg = (str: string, err?: boolean) => {
    if (errorTimeout.value !== null) {
        clearTimeout(errorTimeout.value);
    }

    errorTimeout.value = setTimeout(() => {
        msg.value = "";
    }, 2000);

    msg.value = str;

    if (err !== undefined) {
        error.value = err;
    } else {
        error.value = false
    }
}

const toggleAccountAction = (action: AccountAction) => {
    if (accountAction.value === action) {
        accountAction.value = AccountAction.CreateURL
    } else {
        accountAction.value = action
    }
}


provide(usernameKey, username);
provide(accessTokenKey, accessToken)
provide(refreshTokensKey, refreshTokens)
provide(updateMsgKey, updateMsg)

</script>

<template>
    <div v-if = "msg" 
        class = "fixed top-4 left-4 px-4 py-1 border border-black/25 rounded text-black text-center font-light"
        :class="error ? 'bg-red-100' : 'bg-blue-100'">
        {{msg}}
    </div>

    <div class = "w-fit mt-12 mx-auto text-center px-4">
        <a href = "./">
            <h1 class="text-white text-5xl font-extralight">
                Conditional URL
            </h1>
        </a>


        <div v-if='username !== ""' class = "font-light text-gray-200 mt-2 select-none relative">
            <p>Welcome {{username}}!</p>
            <span class = "cursor-pointer font-semibold relative hover:text-blue-300" :class='accountAction === AccountAction.CreateURL ? "text-blue-300" : "text-blue-200"'>
                <span @click="accountAction = AccountAction.CreateURL">{{"Create URL"}}</span>
            </span>
            <span class="font-bold mx-1">•</span>
            <span class = "cursor-pointer font-semibold relative hover:text-blue-300" :class='accountAction === AccountAction.ViewURLs ? "text-blue-300" : "text-blue-200"'>
                <span @click="accountAction = AccountAction.ViewURLs">{{"Your URLs"}}</span>
            </span>
            <span class="font-bold mx-1">•</span>
            <span class = "cursor-pointer font-semibold relative hover:text-blue-300" :class='accountAction === AccountAction.Settings ? "text-blue-300" : "text-blue-200"'>
                <span @click="accountAction = AccountAction.Settings">{{ "Account Settings"}}</span>
            </span>
            <span class="font-bold mx-1">•</span>
            <span class = "cursor-pointer font-semibold relative text-blue-200 hover:text-red-200">
                <span @click="updateUser('', '', '')">Sign Out</span>
            </span>
        </div>

        <div v-else>
            <p class = "font-light text-gray-200 mt-2 select-none">
                Create a shortened URL that conditionally redirects visitors to different URLs
            </p>
            <p class = "font-light text-gray-200 mt-1 select-none relative">
                Track analytics and modify your URLs later with a free account:
                <div class = "relative inline">
                    <span @click="toggleAccountAction(AccountAction.SignIn)" class="cursor-pointer font-semibold"
                            :class="accountAction === AccountAction.SignIn ? 'text-red-200 hover:text-red-300' : 'text-blue-200 hover:text-blue-300'">
                        Sign In
                    </span>
                    <AccountPopup 
                        v-if="accountAction === AccountAction.SignIn" 
                        :accountAction="AccountAction.SignIn" 
                        @close="accountAction = AccountAction.CreateURL"
                        @updateUser="updateUser"
                        />
                </div>
                or
                <div class = "relative inline">
                    <span @click="toggleAccountAction(AccountAction.SignUp)" class="cursor-pointer font-semibold"
                            :class="accountAction === AccountAction.SignUp ? 'text-red-200 hover:text-red-300' : 'text-blue-200 hover:text-blue-300'">
                        Sign Up
                    </span>
                    <AccountPopup 
                        v-if="accountAction === AccountAction.SignUp" 
                        :accountAction="AccountAction.SignUp" 
                        @close="accountAction = AccountAction.CreateURL"
                        @updateUser="updateUser"
                        />
                </div>
            </p>
        </div>
    </div>
    

    <AccountURLs v-if="accountAction === AccountAction.ViewURLs" @close="accountAction=AccountAction.CreateURL"/>
    <AccountSettings v-else-if="accountAction === AccountAction.Settings" @signout="updateUser('', '', '')"/>
    <ConditionalsBuilder v-else />

    
</template>

