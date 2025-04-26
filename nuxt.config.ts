// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "nuxt-auth-utils",
    "nuxt-cron",
    "nuxt-rate-limit",
    "nuxt-authorization",
    "@nuxtjs/device",
    "@nuxt/icon",
  ],
  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      title: 'UnfareSF',
      meta: [
        { name: 'theme-color', content: '#FFFFFF', media: '(prefers-color-scheme: light)'},
        { name: 'theme-color', content: '#000000', media: '(prefers-color-scheme: dark)'},
        { name: "apple-mobile-web-app-capable", content:"yes"},
        { name: "mobile-web-app-capable", content:"yes"},
      ],
      link: [
        {rel:"manifest", href:"manifest.webmanifest"},
        {rel:"icon", href:"/favicon.ico", sizes:"48x48"},
        {rel:"icon", href:"/unfaresf-logo.svg", sizes:"any", type:"image/svg+xml"},
        {rel:"apple-touch-icon", href:"/apple-touch-icon.png"},
        {rel:"apple-touch-icon-precomposed", href:"/apple-touch-icon-precomposed.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/11__iPad_Pro_M4_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/iPhone_11__iPhone_XR_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_11_Pro_Max__iPhone_XS_Max_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/4__iPhone_SE__iPod_touch_5th_generation_and_later_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/10.9__iPad_Air_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_16_Pro_Max_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/4__iPhone_SE__iPod_touch_5th_generation_and_later_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/10.2__iPad_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/11__iPad_Pro__10.5__iPad_Pro_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/12.9__iPad_Pro_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_16_Pro_Max_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_16_Pro_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/11__iPad_Pro_M4_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/13__iPad_Pro_M4_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/11__iPad_Pro__10.5__iPad_Pro_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/10.2__iPad_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_16_Pro_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/8.3__iPad_Mini_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/12.9__iPad_Pro_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/10.9__iPad_Air_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", href:"/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/10.5__iPad_Air_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/10.5__iPad_Air_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", href:"/8.3__iPad_Mini_landscape.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_11_Pro_Max__iPhone_XS_Max_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", href:"/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/iPhone_11__iPhone_XR_portrait.png"},
        {rel:"apple-touch-startup-image", media:"screen and (device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", href:"/13__iPad_Pro_M4_portrait.png"},
      ]
    }
  },
  runtimeConfig: {
    signUpKey: process.env.SIGN_UP_KEY,
    mastodonDryRun: process.env.MASTODON_DRY_RUN == 'true',
    bskyDryRun: process.env.BSKY_DRY_RUN == 'true',
    bskyHost: process.env.BSKY_HOST || 'https://localhost:3000',
    gtfsDbFilePath: process.env.GTFS_DB_FILE_PATH,
    dbFileName: process.env.DB_FILE_NAME,
    agencyAltNames: process.env.AGENCY_ALT_NAMES,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    public: {
      logLevel: Number(process.env.LOG_LEVEL) || 3,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    },
    session: {
      name: "unfare-session",
      password: process.env.NUXT_SESSION_PASSWORD || '',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    },
    oauth: {
      bluesky: {
        redirectUris: ['/api/auth/bluesky'],
        scope: ['atproto', 'transition:generic'],
        grantTypes: ['authorization_code', 'refresh_token'],
      }
    },
    webauthn: {
      register: {
        authenticatorSelection: {
          residentKey: 'required'
        }
      }
    }
  },
  icon: {
    clientBundle: {
      scan: true
    },
  },
  devtools: {
    enabled: true,
    timeline: {
      enabled: false
    }
  },
  compatibilityDate: "2024-12-25",
  devServer: {
    https: {
      key: process.env.LOCAL_DEV_TLS_KEY_PATH,
      cert: process.env.LOCAL_DEV_TLS_CERT_PATH,
    }
  },
  auth: {
    webAuthn: true,
    atproto: true,
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