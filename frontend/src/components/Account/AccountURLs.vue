<script setup lang="ts">
import { ref } from 'vue'
import ShortBlock from './ShortBlock.vue';

const shorts = ref(["abc", "def", "ghi"]);

const emit = defineEmits<{
    (event: 'close'): void
}>();
</script>

<template>
    <div>
        <div class = "lg:w-1/2 md:w-3/4 w-[95%] bg-black/10 my-8 mx-auto border border-black/25 rounded-xl text-center relative">
            <div class = "mx-auto mt-4 text-white font-extralight text-2xl">Your URLs</div>
            <div class = "mx-auto my-2 text-gray-100 font-extralight text cursor-pointer hover:text-green-200"
                @click='$emit("close")'>
                Create a New URL
            </div>
           

            <ul v-for="short in shorts" :key="short" class = "my-4">
                <ShortBlock :short="short" />
            </ul>

            
            

        </div>
    </div>
    
</template>