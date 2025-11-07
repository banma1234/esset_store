/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'tw-',   // Tailwind 유틸 접두사
  content: [
    './components/**/*.{vue,js}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
  ],
  corePlugins: {
    preflight: false       // Vuetify 기본 스타일과의 리셋 충돌 방지
  },
  theme: { extend: {} },
  plugins: [],
}
