// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      title: 'Unfare Approver',
    }
  },
  runtimeConfig: {
    signUpKey: process.env.SIGN_UP_KEY,
    mastodonToken: process.env.MASTODON_TOKEN,
    mastodonUrl: process.env.MASTODON_URL,
    mastodonDryRun: process.env.MASTODON_DRY_RUN == 'true',
  },
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "nuxt-auth-utils", "nuxt-cron", "nuxt-rate-limit", "nuxt-authorization"],
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