<script setup lang="ts">
import { Condition } from '../types';

const props = defineProps<{
    id: number,
    condition: Condition,
}>();

const emit = defineEmits<{
    (event: 'delete', id: number): void
}>();
</script>

<template>
    <span @click="$emit('delete', props.id)" class = "cursor-pointer my-auto p-0 m-0 text-red-400 hover:text-red-600">× </span>
    <span class="bg-black/10 py-[2px] px-3 rounded-lg text-white font-light text-sm">{{ `${props.condition.variable} ${(props.condition.param)??""} ${props.condition.operator} ${props.condition.value}`}}</span>
</template>

