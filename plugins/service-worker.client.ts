export default defineNuxtPlugin({
  name: 'pwa',
  parallel: true,
  async setup () {
    const isRegistered = ref(false);
    const registration = ref<ServiceWorkerRegistration|null>(null);
    const registrationError = ref(null);

    try  {
      registration.value = await registerServiceWorker();
      isRegistered.value = true;
    } catch (error:any) {
      registrationError.value = error;
    }

    return {
      provide: {
        pwa: {
          isRegistered,
          registrationError,
          registration,
        }
      }
    }

  }
});

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    let registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    }
    return registration;
  }
  return null;
}