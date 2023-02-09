<script setup lang="ts">

import { onBeforeMount } from 'vue'

onBeforeMount(async () => {    
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
    let offset = -1/60 * Math.max( //account for DST
                        new Date(date.getFullYear(), 0, 1).getTimezoneOffset(),  //time in January
                        new Date(date.getFullYear(), 6, 1).getTimezoneOffset()) //time in July

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

    const url = import.meta.env.VITE_DETERMINE_URL_LAMBDA;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "short": window.location.pathname.slice(1),
            "data": {
                "Language": language,
                "Browser": browser,
                "OS": operatingSystem,
                "Time": `${date.getHours()}:${date.getMinutes()}`,
                'Time Zone': timezone
            }
        })
    }).then(response => response.json())

    console.log(response)
    try {
        const url = new URL(response);
        window.location.href = url.href;
    } catch (e) {
        console.log(e);
    }

    alert(response)
    
})

</script>

<template>
    <div class = "text-center font-extralight mt-4">
        Redirecting...
    </div>


</template>