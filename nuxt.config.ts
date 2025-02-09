// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      title: 'UnfareSF',
    }
  },
  runtimeConfig: {
    signUpKey: process.env.SIGN_UP_KEY,
    mastodonDryRun: process.env.MASTODON_DRY_RUN == 'true',
    gtfsDbFilePath: process.env.GTFS_DB_FILE_PATH,
    dbFileName: process.env.DB_FILE_NAME,
    agencyAltNames: process.env.AGENCY_ALT_NAMES,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    public: {
      logLevel: Number(process.env.LOG_LEVEL) || 3,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    }
  },
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "nuxt-auth-utils",
    "nuxt-cron",
    "nuxt-rate-limit",
    "nuxt-authorization",
    "@nuxtjs/device",
    "@vite-pwa/nuxt",
  ],
  compatibilityDate: "2024-12-25",
  devServer: {
    https: true,
    url: "https://localhost:3000"
  },
  auth: {
    webAuthn: true
  },
  pwa: {
    scope: '/',
    srcDir: './service-worker',
    filename: 'sw.ts',
    strategies: 'injectManifest',
    injectRegister: 'script',
    registerType: 'autoUpdate',
    pwaAssets:{
      config: 'pwa-assets.config.ts'
    },
    manifest:{
      name:'Unfare SF',
      short_name:'UnfareSF',
      description:'Fare enforcement alerts in San Francisco to help each other avoid encounters with fare inspectors and cops.',
      display: "standalone",
      theme_color: "#255a91",
      background_color: "#ffffff",
      lang:'en',
      orientation:'portrait'
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    injectManifest: {
      injectionPoint: undefined,
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    client: {
      installPrompt: true
    },
    devOptions: {
      enabled: process.env.VITE_DEV_PWA === 'true'
    },
  },
  nuxtRateLimit: {
    routes: {
      '/api/*': {
        maxRequests: 100,
        intervalSeconds: 60,
      },
      '/api/reports': {
        maxRequests: 20,
        intervalSeconds: 60,
      },
    },
  },
})