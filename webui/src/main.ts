import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import EncodeView from "./views/EncodeView.vue";
import DecodeView from "./views/DecodeView.vue";
import { i18n } from "./i18n";
import "./style.css";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/encode" },
    { path: "/encode", component: EncodeView },
    { path: "/decode", component: DecodeView },
  ],
});

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount("#app");
