import {createWebHistory, createRouter} from 'vue-router';

import Home from "./components/Home.vue";
import Redirect from "./components/Redirect.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            name: "Home",
            component: Home,
        },
        {
            path: "/:short",
            name: "Redirect",
            component: Redirect,
        },
    ],
});

export default router;
