<script setup lang="ts">

import { onBeforeMount } from 'vue'
import type { Data } from "../types"

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
    
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const data: Data = {
        "Language": language,
        "Browser": browser,
        "OS": operatingSystem,
        "Time": `${date.getHours()}:${date.getMinutes()}`,
        'Time Zone': timezone,
        "params": JSON.stringify(params)
    }

    let url;
    if (import.meta.env.PROD) {
        url = `${import.meta.env.VITE_PROD_API_URL}/api/determineUrl`;
    } else {
        url = `${import.meta.env.VITE_DEV_API_URL}/api/determineUrl`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "short": window.location.pathname.slice(1),
            "data": JSON.stringify(data)
        })
    }).then(response => response.json())

    console.log(response)
    try {
        if (!response.startsWith("http://") && !response.startsWith("https://"))
            throw new Error("Invalid URL")

        window.location.href = response;
    } catch (e) {
        console.log(e);
        window.location.href = "https://conditionalurl.web.app"
    }
    
})

</script>

<template>
    <div class = "bg-white w-screen h-screen">
    </div>


</template>