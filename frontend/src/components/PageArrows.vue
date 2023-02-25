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
        <span v-if="props.hasPrev" @click="$emit('prev')" class = "text-white hover:text-red-200 cursor-pointer font-light select-none">
            ←
        </span>

        <span v-if="props.pageCount > 0" class = "text-white font-light mx-2">
            {{`Page ${props.page + 1} of ${props.pageCount}`}}
        </span>
        
        <span v-if="hasNext" @click="$emit('next')" class = "text-white hover:text-green-200 cursor-pointer font-light select-none">
            →
        </span>
    </div>
</template>