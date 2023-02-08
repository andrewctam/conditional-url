<script setup lang="ts">
import { Variables } from '../types';
const props = defineProps<{
    variable: typeof Variables[number];
}>()
</script>

<template>
    <div class = "text-xs text-white font-light mt-1">
        <ul v-if="props.variable === 'URL Parameter'">
            <li>URL Parameters Provided in URL</li>
            <li>e.g. conditional-url.web.app/example?param=1</li>
        </ul>
        <ul v-else-if="props.variable === 'Time Zone'">
            <li>UTC Offset (+8, -5, 0, etc.)</li>
        </ul>
    </div>
</template>