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
        class = "relative mx-8 p-2 text-white font-light rounded cursor-pointer break-words bg-white/10 border border-black/20 hover:bg-black/10 ">
        {{ `/${props.short}` }}
    </div>

</template>