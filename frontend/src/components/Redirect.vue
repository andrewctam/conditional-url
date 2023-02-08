<script setup lang="ts">

import { onBeforeMount, ref } from 'vue'

onBeforeMount(() => {
    const short = window.location.pathname.slice(1);
    const data = JSON.stringify({
        "Language": window.navigator.language
    })

})

const utc = () => {
    const date = new Date();
    var jan = new Date(date.getFullYear(), 0, 1);
    var jul = new Date(date.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}


</script>

<template>
    <div>
        Redirecting...
    </div>
</template>