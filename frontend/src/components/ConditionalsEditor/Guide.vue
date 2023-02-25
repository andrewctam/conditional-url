<script setup lang="ts">
import { Variables } from '../../types';
const props = defineProps<{
    variable: typeof Variables[number]
}>()
</script>

<template>
    <div class = "text-xs text-white font-light mt-1">
        <ul v-if="props.variable === 'URL Parameter'">
            <li>URL Parameters Provided in URL</li>
            <li>e.g. conditionalurl.web.app/example?param=1</li>
        </ul>
        <ul v-else-if="props.variable === 'Time Zone'">
            <li>UTC Offset (UTC+8, UTC-5, UTC+0, etc.)</li>
        </ul>
        <ul v-else-if="props.variable === 'Screen Width'">
            <li>Width in pixels</li>
        </ul>
        <ul v-else-if="props.variable === 'Screen Height'">
            <li>Height in pixels</li>
        </ul>
    </div>
</template>