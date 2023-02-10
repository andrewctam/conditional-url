<script setup lang="ts">
import { ref, computed } from 'vue';
import { AccountAction } from '../../types';

const props = defineProps<{
    accountAction: AccountAction
}>();


const usernameInput = ref('');
const passwordInput = ref('');
const passwordConfirmInput = ref('');

const type = computed(() => {
    if (props.accountAction === AccountAction.SignIn) {
        return 'Sign In';
    } else if (props.accountAction === AccountAction.SignUp) {
        return 'Sign Up';
    } else {
        return "";
    }
});

const emit = defineEmits<{
    (event: 'close'): void
}>();
</script>

<template>
    <div class = "bg-black/80 border border-white/10 shadow-md rounded-lg sm:rounded-tr-none z-20 pt-6 p-10
                        sm:absolute sm:left-auto sm:right-2 sm:top-6 sm:w-fit sm:h-fit
                        fixed w-[97.5%] left-[1.25%] right-[1.25%] top-[22vh] h-[50vh]">

        <div class='text-center text-2xl text-white font-light'>
            {{ type }}
        </div>

        <button tabindex="-1" @click = "$emit('close')" class = "absolute top-0 right-2 p-3 text-lg text-red-400 hover:text-red-500">
            × 
        </button>

        <form>
            <div class = "mt-6">
                <label class="text-sm font-light text-white">
                    Username
                </label>
                <div class="mt-1">
                    <input v-model="usernameInput" type="text" autocomplete="username" class="sm:text-sm text-black p-1 bg-gray-400 font-light rounded-md w-60">
                </div>
            </div>

            <div class = "mt-4">
                <label class="text-sm font-light text-white">
                    Password
                </label>
                <div class="mt-1">
                    <input v-model="passwordInput" type="password" autocomplete="username" class="sm:text-sm text-black p-1 bg-gray-400 font-light rounded-md w-60">
                </div>
            </div>

            <div v-if="props.accountAction === AccountAction.SignUp" class = "mt-4">
                <label class="text-sm font-light text-white">
                    Repeat Password
                </label>
                <div class="mt-1">
                    <input v-model="passwordConfirmInput" type="password" autocomplete="username" class="sm:text-sm text-black p-1 bg-gray-400 font-light rounded-md w-60">
                </div>
            </div>
            
            <button class = "rounded px-4 py-1 border border-black bg-[#bdecdc] font-light text-black mt-8"> 
                {{ type }}
            </button>
        </form>
    </div>
</template>