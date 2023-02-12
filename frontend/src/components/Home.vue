<script setup lang='ts'>
import ConditionalsBuilder from './URLBuilder.vue'
import AccountPopup from './Account/AccountPopup.vue'
import AccountURLs from './Account/AccountURLs.vue'
import { ref, provide, onBeforeMount } from 'vue'
import type { Ref } from 'vue'
import { AccountAction } from '../types'

const accountAction: Ref<AccountAction> = ref(AccountAction.None)

const toggleAccountAction = (type: AccountAction) => {
    if (accountAction.value !== type) {
        accountAction.value = type
    } else {
        accountAction.value = AccountAction.None
    }
}
const username = ref('')
provide('username', username)

const accessToken = ref('')
provide('accessToken', accessToken)

const updateUser = (user: string, token: string) => {
    username.value = user
    accessToken.value = token

    if (user === "")
        localStorage.removeItem('username')
    else 
        localStorage.setItem('username', user)

    if (token === "")
        localStorage.removeItem('accessToken')
    else 
        localStorage.setItem('accessToken', token)
    
    accountAction.value = AccountAction.None
}

onBeforeMount(() => {
    const user = localStorage.getItem('username')
    const token = localStorage.getItem('accessToken')

    if (user !== null && token !== null) {
        updateUser(user, token)
    }
})

</script>

<template>
    <div class = "w-fit mt-12 mx-auto text-center px-4">
        <a href = "./">
            <h1 class="text-white text-5xl font-extralight">
                Conditional URL
            </h1>
        </a>

        <p class = "font-light text-gray-200 mt-2 select-none">
            Create a shortened URL that conditionally redirects visitors to different URLs
        </p>


        <p v-if='username !== ""' class = "font-light text-gray-200 mt-1 select-none relative">
            Welcome {{username}}!
            <span class = "cursor-pointer font-semibold relative text-blue-200 hover:text-blue-300">
                <span @click="toggleAccountAction(AccountAction.ViewURLs)">{{ accountAction === AccountAction.ViewURLs ? "Create New URL" : "Your URLs"}}</span>
            </span>
            •
            <span class = "cursor-pointer font-semibold relative text-blue-200 hover:text-red-200">
                <span @click="updateUser('', '')">Sign Out</span>
            </span>
        </p>

        <p v-else class = "font-light text-gray-200 mt-1 select-none relative">
            Track analytics and modify your URLs later with a free account:
            <div class = "relative inline">
                <span @click="toggleAccountAction(AccountAction.SignIn)" class="cursor-pointer font-semibold"
                        :class="accountAction === AccountAction.SignIn ? 'text-red-200 hover:text-red-300' : 'text-blue-200 hover:text-blue-300'">
                    Sign In
                </span>
                <AccountPopup 
                    v-if="accountAction === AccountAction.SignIn" 
                    :accountAction="AccountAction.SignIn" 
                    @close="accountAction = AccountAction.None"
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
                    @close="accountAction = AccountAction.None"
                    @updateUser="updateUser"
                    />
            </div>
        </p>
    </div>
    

    <AccountURLs 
        v-if="accountAction === AccountAction.ViewURLs" 
        @close="accountAction = AccountAction.None" />

    

    <ConditionalsBuilder v-else />

    

    

    
</template>

