<script setup lang="ts">
import { ref } from 'vue'
import ChangePassword from './ChangePassword.vue';
import DeleteAccount from './DeleteAccount.vue';
import DeleteAllURLs from './DeleteAllURLs.vue';
import LeftArrow from '../../Icons/LeftArrow.vue';

const enum Setting {
    None,
    ChangePassword,
    DeleteAllURLs,
    DeleteAccount
}

const selected = ref(Setting.None);

const emit = defineEmits<
    (event: 'signout') => void
>();

</script>

<template>
    <div class="xl:w-1/2 lg:w-2/3 md:w-5/6 w-[95%] bg-black/10 my-8 pb-10 mx-auto border border-black/25 rounded-xl text-center relative select-none">
        <span v-if="selected !== Setting.None" @click='selected = Setting.None' class="absolute top-1 left-2 text-xl text-white hover:text-red-200 cursor-pointer">
            <LeftArrow />
        </span>

        <ChangePassword v-if="selected === Setting.ChangePassword"  @close="selected=Setting.None" />
        <DeleteAllURLs v-else-if="selected === Setting.DeleteAllURLs" @close="selected=Setting.None" />
        <DeleteAccount v-else-if="selected === Setting.DeleteAccount" @close="selected=Setting.None" @signout="$emit('signout')" />

        <div v-else="">
            <div class="mx-auto my-4 text-white font-extralight md:text-2xl text-lg">
                Account Settings
            </div>

            <div @click = 'selected=Setting.ChangePassword'
                class = "w-fit min-w-[200px] mx-auto mt-2 relative bg-white/10 border border-black/20 hover:bg-black/10 p-2 text-white font-light rounded-xl cursor-pointer">
                Change Password
            </div>

            <div @click='selected=Setting.DeleteAllURLs'
                class = "w-fit min-w-[200px] mx-auto mt-2 relative bg-white/10 border border-black/20 hover:bg-black/10 p-2 text-white font-light rounded-xl cursor-pointer">
                Delete All URLs
            </div>

            <div @click = 'selected=Setting.DeleteAccount'
                class = "w-fit min-w-[200px] mx-auto mt-2 relative bg-white/10 border border-black/20 hover:bg-black/10 p-2 text-white font-light rounded-xl cursor-pointer">
                Delete Account
            </div>

        </div>
    </div>
</template>