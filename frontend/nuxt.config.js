// nuxt.config.js  ← CJS로 고정
module.exports = {
  mode: "universal",

  head: {
    title: process.env.npm_package_name || "",
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        hid: "description",
        name: "description",
        content: process.env.npm_package_description || "",
      },
    ],
    link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
  },

  loading: { color: "#fff" },

  css: [
    "@/assets/css/tailwind.css",
    "vuetify/dist/vuetify.min.css",
    "@mdi/font/css/materialdesignicons.min.css",
  ],

  // Tailwind 모듈 설정(파일명과 일치)
  tailwindcss: {
    configPath: "tailwind.config.js",
    cssPath: "@/assets/css/tailwind.css",
    viewr: false,
  },

  plugins: ["~/plugins/global.js", "~/plugins/fetchHandler.js"],

  // devModules는 과거 옵션이니 제거하고 buildModules만 사용
  buildModules: ["@nuxtjs/tailwindcss", "@nuxtjs/vuetify"],

  vuetify: {
    treeShake: true,
    defaultAssets: false,
    customVariables: ["~/assets/variables.scss"],
  },

  modules: ["@nuxtjs/proxy"],

  proxy: {
    // /cdn/* 으로 들어오면 CDN으로 프록시
    "/cdn/": {
      target: "https://choco-image-server.cdn.ntruss.com",
      changeOrigin: true, // Host 헤더를 타깃으로 교체
      secure: true, // https 인증서 검증
      pathRewrite: { "^/cdn/": "/" }, // /cdn/assets/... -> /assets/...
      // headers: { /* 필요시 추가 헤더 */ }
    },
  },

  build: {
    transpile: ["vuetify"],
  },

  server: { host: "0.0.0.0", port: 3000 },
};
