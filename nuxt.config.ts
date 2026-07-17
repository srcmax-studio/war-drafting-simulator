import { resolve } from 'node:path';

const useHdAssets = process.env.AEONFRONT_ASSET_MODE === 'hd';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NUXT_DEVTOOLS === 'true' },
  ssr: false,
  modules: ['nuxt-electron', '@nuxtjs/i18n'],
  css: ['~/css/main.css'],
  runtimeConfig: {
    public: {
      assetExtension: useHdAssets ? 'png' : 'webp',
      assetMode: useHdAssets ? 'hd' : 'web',
      appVersion: process.env.npm_package_version ?? '2.0.0'
    }
  },
  nitro: {
    publicAssets: [{
      baseURL: '/cards',
      dir: resolve('assets/card-images', useHdAssets ? 'hd' : 'webp'),
      maxAge: 60 * 60 * 24 * 30
    }]
  },
  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    langDir: 'locales',
    locales: [
      { code: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    detectBrowserLanguage: false
  },
  electron: {
    build: [{ entry: 'electron/main.ts' }],
    disableDefaultOptions: true
  },
  typescript: { strict: true, typeCheck: false },
  app: {
    head: {
      title: '万世战线 Aeonfront',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'description', content: '群英跨越时代，三线决定天下。' },
        { name: 'theme-color', content: '#111614' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ],
      link: [
        { rel: 'icon', href: '/aeonfront-mark.svg', type: 'image/svg+xml' },
        { rel: 'manifest', href: '/manifest.webmanifest' }
      ]
    }
  }
});
