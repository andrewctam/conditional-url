<script setup lang="ts">
const props = defineProps<{
    active: boolean,
    text: string
}>();

const emit = defineEmits<{
    (event: 'setActive'): void,
}>()
</script>

<template>
    <span class = "cursor-pointer font-semibold relative hover:text-blue-300" 
         :class='props.active ? "text-blue-300" : "text-blue-100"'
         @click="$emit('setActive')">
        {{ props.text }}
    </span>
</template>