import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { i18n } from "./lib/lang";
import { createPinia } from "pinia";
import { config } from "md-editor-v3";
import { useAuthStore } from "./stores/authStore";
import { youtubeEmbedPlugin } from "./lib/markdown/youtubeEmbedPlugin";

import "./styles/reset.css";
import "./styles/colors.css";
import "./styles/base.css";
import "./styles/blog.css";
import "./styles/learning.css";
import "./styles/tailwind.css";

config({
  markdownItPlugins(plugins) {
    return [
      ...plugins,
      { type: "youtubeEmbed", plugin: youtubeEmbedPlugin, options: {} },
    ];
  },
});

const pinia = createPinia();
const app = createApp(App).use(router).use(i18n).use(pinia);

const authStore = useAuthStore(pinia);
authStore.loadConfig();

app.mount("#app");
