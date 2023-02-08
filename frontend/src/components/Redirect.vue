<script setup lang="ts">

import { onBeforeMount, ref } from 'vue'

onBeforeMount(() => {
    console.log(window.navigator)
    
    const userAgent = window.navigator.userAgent;
    let browser = "Other"
    if (userAgent.includes("Chrome")) {
        browser = "Chrome";
    } else if (userAgent.includes("Firefox")) {
        browser = "Firefox";
    } else if (userAgent.includes("Safari")) {
        browser = "Safari";
    } else if (userAgent.includes("Edge")) {
        browser = "Edge";
    } else if (userAgent.includes("Opera")) {
        browser = "Opera";
    }

    let operatingSystem = "Other"
    if (userAgent.includes("Windows")) {
        operatingSystem = "Windows";
    } else if (userAgent.includes("Mac")) {
        operatingSystem = "Mac";
    } else if (userAgent.includes("Linux")) {
        operatingSystem = "Linux";
    } else if (userAgent.includes("Android")) {
        operatingSystem = "Android";
    } else if (userAgent.includes("iPhone") || userAgent.includes("iPad") || userAgent.includes("iPod")) {
        operatingSystem = "iOS";
    }

    const date = new Date();
    let offset = Math.max( //account for DST
                        new Date(date.getFullYear(), 0, 1).getTimezoneOffset(),  //time in January
                        new Date(date.getFullYear(), 6, 1).getTimezoneOffset()) //time in July
    offset = -offset / 60;

    let timezone = offset.toString();
    if (offset > 0)
        timezone = `+${offset}`

    const langCode = window.navigator.language;
    let language = "Other"
    if (langCode.includes("en"))
        language = "English"
    else if (langCode.includes("es"))
        language = "Spanish"
    else if (langCode.includes("fr"))
        language = "French"
    else if (langCode.includes("de"))
        language = "German"
    else if (langCode.includes("it"))
        language = "Italian"
    else if (langCode.includes("pt"))
        language = "Portuguese"
    else if (langCode.includes("ru"))
        language = "Russian"
    else if (langCode.includes("zh"))
        language = "Chinese"
    else if (langCode.includes("ja"))
        language = "Japanese"
    else if (langCode.includes("ko"))
        language = "Korean"
    else if (langCode.includes("hi"))
        language = "Hindi"

    

    

    const data = {
        "short": window.location.pathname.slice(1),
        "Language": language,
        "Browser": browser,
        "OS": operatingSystem,
        "Time": `${date.getHours()}:${date.getMinutes()}`,
        'Time Zone': timezone
    }
    console.log(data)

})

const utc = () => {
    const date = new Date();
   
}


</script>

<template>
    <div class = "text-center font-extralight mt-4">
        Redirecting...
    </div>


</template>