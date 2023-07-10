import {createWebHistory, createRouter} from 'vue-router';

const Home = () => import("./components/Home.vue");
const Redirect = () => import("./components/Redirect.vue");

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
