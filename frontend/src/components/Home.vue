<script setup lang='ts'>
import URLBuilder from './URLBuilder.vue'
import AccountPopup from './Account/AccountPopup.vue'
import ViewURLs from './Account/ViewURLs.vue'
import { ref, provide, onBeforeMount } from 'vue'
import type { Ref } from 'vue'
import { AccountAction, usernameKey, accessTokenKey, refreshTokensKey, updateMsgKey } from '../types'
import jwt_decode from 'jwt-decode'
import AccountSettings from './Account/settings/AccountSettings.vue'
import NavText from './NavText.vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const accountAction: Ref<AccountAction> = ref(AccountAction.CreateURL);

const username = ref('');
const accessToken = ref('');

const refreshingTokens = ref(false);
//clicking on a nav text again rerenders the component
const rerenderKey = ref(0);

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
        error.value = false;
    }
}


const toggleAccountAction = (action: AccountAction) => {
    if (accountAction.value === action) {
        accountAction.value = AccountAction.CreateURL;
    } else {
        accountAction.value = action;
    }
}

const openAccountAction = (action: AccountAction) => {
    if (accountAction.value === action)
        rerenderKey.value++;
    else
        accountAction.value = action;

    switch(action) {
        case AccountAction.CreateURL:
            router.push({ query: {  }});
            break;
        case AccountAction.ViewURLs:
            router.push({ query: { action: 'viewurls' }});
            break;
        case AccountAction.Settings:
            router.push({ query: { action: 'settings' }});
            break;
    }
}

const updateUser = (user: string, access: string, refresh: string) => {
    username.value = user;
    accessToken.value = access;

    if (user === "")
        localStorage.removeItem('username');
    else 
        localStorage.setItem('username', user);

    if (access === "")
        localStorage.removeItem('accessToken');
    else 
        localStorage.setItem('accessToken', access);

    if (refresh === "")
        localStorage.removeItem('refreshToken');
    else 
        localStorage.setItem('refreshToken', refresh);

    if (accountAction.value === AccountAction.SignIn || accountAction.value === AccountAction.SignUp)
        accountAction.value = AccountAction.CreateURL;

    if (user === "" || access === "" || refresh === "") {
        accountAction.value = AccountAction.CreateURL;
    }
}


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

    refreshingTokens.value = true
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
        return res.json();
    })

    refreshingTokens.value = false

    if (response.msg) {
        updateUser('', '', '')
        console.log("Failed to refresh tokens");
        return false;
    } else {
        updateUser(username, response.accessToken, response.refreshToken)
        console.log("Successfully refreshed tokens");
        return true;
    }
}


onBeforeMount(async () => {
    const user = localStorage.getItem('username');
    const access = localStorage.getItem('accessToken');
    
    if (user !== null && access !== null) {
        try {
            const payload = jwt_decode(access as string) as { [key: string]: any }

            if (payload.username === user && payload.exp >= Date.now() / 1000) {
                username.value = user;
                accessToken.value = access;
            } else {
                throw new Error("Token will expire soon");
            }

        } catch (e) {
            await refreshTokens();
        }
    }


    const action = route.query.action as string | undefined;
    if (action) {
        switch(action) {
            case 'settings':
                accountAction.value = AccountAction.Settings;
                break;
            case 'viewurls':
                accountAction.value = AccountAction.ViewURLs;
                break;
            default:
                accountAction.value = AccountAction.CreateURL;
                break;
        }
    }

    const view = route.query.view as string | undefined;
    if (view) {
        accountAction.value = AccountAction.ViewURLs;
    }

})

provide(usernameKey, username);
provide(accessTokenKey, accessToken);
provide(refreshTokensKey, refreshTokens);
provide(updateMsgKey, updateMsg);

</script>

<template>
    <div v-if = "msg" 
        class = "fixed top-4 left-4 px-4 py-1 border border-black/25 z-50 rounded text-black text-center font-light"
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
            <div class="text-lg">
                Welcome <span class="select-text">{{username}}</span>!
            </div>
            
            <div class="flex flex-wrap justify-center">
                <NavText 
                    text="Create URL"
                    :active="accountAction === AccountAction.CreateURL"
                    @setActive="openAccountAction(AccountAction.CreateURL)" />

                <span class="font-bold mx-1">•</span>

                <NavText
                    text="Your URLs"
                    :active="accountAction === AccountAction.ViewURLs"
                    @setActive="openAccountAction(AccountAction.ViewURLs)" />

                <span class="font-bold mx-1">•</span>

                <NavText
                    text="Account Settings"
                    :active="accountAction === AccountAction.Settings"
                    @setActive="openAccountAction(AccountAction.Settings)" />

                <span class="font-bold mx-1">•</span>

                <span class = "cursor-pointer font-semibold m-0 relative text-blue-100 hover:text-red-200" @click="updateUser('', '', '')">
                    Sign Out
                </span>
            </div>
        </div>

        <div v-else-if="refreshingTokens">
            <span class = "font-light text-gray-200 mt-2 select-none">
                Logging in...
            </span>
        </div>
        
        <div v-else>
            <p class = "font-light text-gray-200 mt-2 select-none">
                Create a shortened URL that conditionally redirects visitors to different URLs
            </p>

            <div class = "font-light text-gray-200 mt-1 select-none relative">
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
            </div>

        </div>
    </div>
    

    <ViewURLs 
        v-if="accountAction === AccountAction.ViewURLs" 
        @close="accountAction=AccountAction.CreateURL"
        :key="rerenderKey"/>
        
    <AccountSettings
        v-else-if="accountAction === AccountAction.Settings" 
        @signout="updateUser('', '', '')"
        :key="rerenderKey + 1"/>

    <URLBuilder v-else 
        :key="rerenderKey + 2" />

    
</template>

