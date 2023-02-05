<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
    id: number,
    first: boolean,
    last: boolean
}>()

const emit = defineEmits<{
    (event: 'delete', id: number): void,
    (event: 'updateUrl', id: number, url: string): void
}>()

const msg = computed(() => {
    if (props.first && props.last) {
        return "";
    } else if (props.last) {
        return "Else";
    } else if (props.first) {
        return "If";
    } else
        return "Else If";
})

const onlyOne = computed(() => {
    return props.first && props.last;
})

const handleUpdateUrl = (e: Event) => {
    emit('updateUrl', props.id, (e.target as HTMLInputElement).value);
}

</script>

<template>
    <div class = "bg-gray-200 border border-black/50 m-4 p-2 relative rounded cursor-move">
        <button v-if="!onlyOne" @click = "$emit('delete', props.id)" class = "absolute top-1 right-2 text-xs text-red-400">
            ✖ 
        </button>

        <div class = "flex items-left">
            <span class = "text-lg">{{msg}}</span>

            <span v-if="!onlyOne && !props.last" class = "font-bold cursor-pointer ml-1 text-green-600 my-auto">
                +
            </span>
        </div>

        <div class="flex mt-1">
            <p class = "my-auto mr-2"> Redirect to: </p>
            <input @change="handleUpdateUrl" type = "text" class = "flex-grow text-sm border border-black/40 rounded p-1" placeholder="URL"/>
        </div>
    </div>
    
</template>