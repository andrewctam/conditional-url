<script setup lang="ts">

const props = defineProps<{
    short: string
}>()

const emit = defineEmits<{
    (event: 'select'): void
}>();

</script>

<template>
    <div @click = '$emit("select")' 
        class = "bg-white/5 hover:bg-black/10 mx-8 p-2 text-white font-light border border-black/20 rounded cursor-pointer break-words">
        {{ `/${props.short}` }}
    </div>

</template>