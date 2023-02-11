<script setup lang="ts">

const props = defineProps<{
    short: string
}>()

</script>

<template>
    <div class = "bg-white/5 hover:bg-black/10 text-white border font-light border-black/20 my-4 mx-8 p-3 relative rounded select-none cursor-pointer break-words">
        {{ `/${props.short}` }}
    </div>

</template>