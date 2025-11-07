export default ({ app }) => {
  app.vuetify = new Vuetify({
    icons: { iconfont: "mdi" }, // ← 기본값이라도 명시적으로
  });
};
