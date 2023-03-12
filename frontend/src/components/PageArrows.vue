<script setup lang="ts">
const props = defineProps<{
    hasPrev: boolean,
    hasNext: boolean,
    page: number,
    pageCount: number
}>();


const emits = defineEmits<{
    prev: () => void,
    next: () => void
}>();

</script>

<template>
    <div class="flex justify-center">
        <span @click="() => props.hasPrev ? $emit('prev') : null" class = "font-light select-none mr-1"
            :class= "props.hasPrev ? 'text-white hover:text-red-200 cursor-pointer'
                                   : 'text-gray-200/50'">
            ←
        </span>

        <span v-if="props.pageCount > 0" class = "text-white font-light mx-2">
            {{`Page ${props.page + 1} of ${props.pageCount}`}}
        </span>
        
        <span @click="() => props.hasNext ? $emit('next') : null" class = "font-light select-none ml-1"
            :class= "props.hasNext ? 'text-white hover:text-green-200 cursor-pointer'
                                   : 'text-gray-200/50'">
            →
        </span>
    </div>
</template>