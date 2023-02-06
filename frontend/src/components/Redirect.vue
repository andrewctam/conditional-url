<script setup lang="ts">

import { onMounted, ref } from 'vue'

const short = ref("");

onMounted(() => {
    short.value = window.location.pathname.slice(1);
})

</script>

<template>
    <div>
        <h1>{{short}}</h1>
    </div>
</template>