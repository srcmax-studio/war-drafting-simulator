// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['nuxt-electron'],
  css: [
    '@/css/main.css'
  ],
  plugins: [
      '@/plugins/toast',
  ],
  electron: {
    build: [
      {
        entry: 'electron/main.ts'
      },
    ],
    disableDefaultOptions: true,
  },
  ssr: false,
})
