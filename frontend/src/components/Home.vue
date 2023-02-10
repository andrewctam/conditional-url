<script setup lang='ts'>
import ConditionalsBuilder from './ConditionalsBuilder/ConditionalsBuilder.vue'
import AccountPopup from './Account/AccountPopup.vue'
import { ref } from 'vue'
import type { Ref } from 'vue'
import { AccountAction } from '../types'

const accountAction: Ref<AccountAction> = ref(AccountAction.None)

const toggleAccountPopup = (type: AccountAction) => {
    if (accountAction.value !== type) {
        accountAction.value = type
    } else {
        accountAction.value = AccountAction.None
    }
}


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

        <p class = "font-light text-gray-200 mt-1 select-none relative">
            Track analytics and modify your conditions later with a free account:
            <span class = "cursor-pointer font-semibold relative" :class="accountAction === AccountAction.SignIn ? 'text-red-200' : 'text-blue-200'">
                <span @click="toggleAccountPopup(AccountAction.SignIn)">Sign In</span>
                <AccountPopup 
                    v-if="accountAction === AccountAction.SignIn" 
                    :accountAction="AccountAction.SignIn" 
                    @close="accountAction = AccountAction.None"/>
            </span>
            or
            <span class = "cursor-pointer font-semibold relative" :class="accountAction === AccountAction.SignUp ? 'text-red-200' : 'text-blue-200'">
                <span @click="toggleAccountPopup(AccountAction.SignUp)">Sign Up</span>
                <AccountPopup 
                    v-if="accountAction === AccountAction.SignUp" 
                    :accountAction="AccountAction.SignUp" 
                    @close="accountAction = AccountAction.None"/>
            </span>
        </p>
    </div>

    <ConditionalsBuilder />

    

    

    
</template>

