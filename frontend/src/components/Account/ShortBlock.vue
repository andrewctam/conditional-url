<script setup lang="ts">

const props = defineProps<{
    short: string,
    i: number
}>()

const emit = defineEmits<{
    (event: 'select'): void
}>();

</script>

<template>
    <div @click = '$emit("select")'
        class = "relative mx-8 p-2 text-white font-light rounded cursor-pointer break-words bg-white/10 border border-black/20 hover:bg-black/10 ">
        {{ `/${props.short}` }}

        <span class="absolute left-1 top-1 text-sm text-gray-100/80">
            {{ i + 1 }}
        </span>
    </div>

</template>