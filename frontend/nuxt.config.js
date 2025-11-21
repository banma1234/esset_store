// nuxt.config.js
module.exports = {
  // mode: "universal", // <- 제거 (더 이상 필요 없음)

  head: {
    /* 그대로 */
  },

  loading: { color: "#fff" },

  css: [
    "@/assets/css/tailwind.css",
    "vuetify/dist/vuetify.min.css",
    "@mdi/font/css/materialdesignicons.min.css",
  ],

  tailwindcss: {
    configPath: "tailwind.config.js",
    cssPath: "@/assets/css/tailwind.css",
    // viewr: false, // <- 오타/불필요 옵션 제거
  },

  plugins: ["~/plugins/global.js", "~/plugins/fetchHandler.js"],

  buildModules: ["@nuxtjs/tailwindcss", "@nuxtjs/vuetify"],

  vuetify: {
    treeShake: true,
    defaultAssets: false,
    customVariables: ["~/assets/variables.scss"],
  },

  modules: [],

  build: { transpile: ["vuetify"] },

  server: { host: "0.0.0.0", port: 3000 },

  publicRuntimeConfig: {
    apiBase: process.env.BROWSER_API_BASE || "/api/v1",
  },
};
