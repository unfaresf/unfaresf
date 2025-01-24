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
    mastodonToken: process.env.MASTODON_TOKEN,
    mastodonUrl: process.env.MASTODON_URL,
    mastodonDryRun: process.env.MASTODON_DRY_RUN == 'true',
    gtfsDbFilePath: process.env.GTFS_DB_FILE_PATH,
    dbFileName: process.env.DB_FILE_NAME,
    public: {
      logLevel: Number(process.env.LOG_LEVEL) || 3,
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
  ],
  compatibilityDate: "2024-12-25",
  devServer: {
    https: true,
    url: "https://localhost:3000"
  },
  auth: {
    webAuthn: true
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