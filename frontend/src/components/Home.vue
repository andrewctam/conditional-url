<script setup lang='ts'>
import { ref, onMounted } from 'vue'

const url = ref("");

const short = ref("");
const conditions = ref([]);


onMounted( () => {
    let domain = window.location.href;
    //remove http(s)://
    domain = domain.replace(/(^\w+:|^)\/\//, '');
    url.value = domain;
})

const addCondition = () => {

}
</script>

<template>
     <div>
        <div class="h-fit w-fit mx-auto mt-6 rounded-xl">

            <h1 class="text-black text-3xl text-center">
                Conditional URL
            </h1>

            <form class = "p-2 border border-black mt-5">
                <div>
                    <span class = "text-lg mr-1">{{ url }}</span>
                    <input v-model = "short" type = "text" class = "border border-black/50 rounded p-1" placeholder="(optional)"/>
                    
                </div>

                <button>
                    
                </button>

                <div v-for="condition in conditions">
                    {{condition}}
                </div>
            </form>




        </div>

    </div>
</template>

