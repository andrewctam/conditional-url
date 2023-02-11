<script setup lang="ts">
import { ref, computed } from 'vue';
import { AccountAction } from '../../types';

const props = defineProps<{
    accountAction: AccountAction
}>();

const error = ref("");
const usernameInput = ref('');
const passwordInput = ref('');
const passwordConfirmInput = ref('');

const updateError = (msg: string) => {
    setTimeout(() => {
        error.value = "";
    }, 2000);

    error.value = msg;
}

const type = computed(() => {
    if (props.accountAction === AccountAction.SignIn) {
        return 'Sign In';
    } else if (props.accountAction === AccountAction.SignUp) {
        return 'Sign Up';
    } else {
        return "";
    }
});

const signUp = async () => {
    if (usernameInput.value === "") {
        updateError("Username cannot be empty");
        return;
    }

    if (!/^[a-zA-Z0-9]*$/.test(usernameInput.value)) {
        updateError("Username can only contain letters and numbers");
        return;
    }

    if (passwordInput.value.length < 8) {
        updateError("Password is too short");
        return;
    }
    if (passwordConfirmInput.value.length === 0) {
        updateError("Please confirm your password");
        return;
    }

    if (passwordInput.value !== passwordConfirmInput.value) {
        updateError("Passwords do not match");
        return;
    }

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/signUp`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/signUp`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    }).then((res) => res.json());

    console.log(response);
    
}



const signIn = async () => {
    if (usernameInput.value === "") {
        updateError("Username cannot be empty");
        return;
    }

    if (!/^[a-zA-Z0-9]*$/.test(usernameInput.value) || passwordInput.value.length < 8) {
        updateError("Failed to sign in.");
        return;
    }
    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/signIn`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/signIn`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: usernameInput.value,
            password: passwordInput.value
        })
    }).then((res) => res.json());

    console.log(response);
    
}

const handleSubmit = () => {
    if (props.accountAction === AccountAction.SignIn) {
        signIn();
    } else if (props.accountAction === AccountAction.SignUp) {
        signUp();
    }
}

const emit = defineEmits<{
    (event: 'close'): void
}>();


</script>

<template>
    <div v-if = "error" class = "fixed top-4 left-4 px-4 py-1 bg-red-100 border border-black/25 rounded text-black text-center font-light">
        {{error}}
    </div>

    <div class = "bg-black/80 border border-white/10 shadow-md rounded-lg sm:rounded-tr-none z-20 pt-6 p-10
                        sm:absolute sm:left-auto sm:right-2 sm:top-6 sm:w-fit sm:h-fit
                        fixed w-[97.5%] left-[1.25%] right-[1.25%] top-[22vh] h-[50vh]">

        <div class='text-center text-2xl text-white font-light'>
            {{ type }}
        </div>

        <button tabindex="-1" @click = "$emit('close')" class = "absolute top-0 right-2 p-3 text-lg text-red-400 hover:text-red-500">
            × 
        </button>

        <form @submit.prevent="handleSubmit">
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