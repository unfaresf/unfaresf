<template>
  <div v-if="supported">
    <UTooltip v-if="!permissionGranted" text="Enable new report notifications">
      <UButton color="lime" class="m-2" icon="i-heroicons-bell" @click="setupNotifications" />
    </UTooltip>
    <UTooltip v-else  :text="notificationsEnabled ? 'Silence new report notifications': 'Enable new report notifications'">
      <UButton color="white" class="m-2" :icon="notificationsEnabled ? 'i-heroicons-bell-snooze' : 'i-heroicons-bell-alert'" @click="toggleNotifications" />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
const {public: {vapidPublicKey}} = useRuntimeConfig();
const { $pwa } = useNuxtApp();

const supported = ref<boolean>(isSupported());
const permissionGranted = ref<boolean>(isNotificationPermissionGranted());
const notificationsEnabled = ref<boolean>(false);

function isSupported() {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    if (!('PushManager' in window)) {
      return false;
    }

    if (!("Notification" in window)) {
      return false;
    }
  } catch (err:any) {
    return false;
  }
  return true;
}

function isNotificationPermissionGranted() {
  return Notification.permission === "granted";
}

async function askPermission() {
  // The API recently changed from taking a callback to returning a Promise. The
  // problem with this, is that we can't tell what version of the API is
  // implemented by the current browser, so you have to implement both and handle both.
  const permission = await new Promise<NotificationPermission>(function (resolve, reject) {
    const permissionResult = Notification.requestPermission(function (result) {
      resolve(result);
    });

    if (permissionResult) {
      permissionResult.then(resolve, reject);
    }
  });
  if (permission === 'granted') {
    permissionGranted.value = true;
  }
}

function urlBase64ToUint8Array(s:string) {
  const padding = '='.repeat((4 - s.length % 4) % 4);
  const base64 = (s + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeUserToPush() {
  const registration = $pwa?.getSWRegistration();
  if (!registration) {
    console.warn(`SW registration missing`);
    return;
  }

  const subscribeOptions = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(String(vapidPublicKey)),
  };
  return registration.pushManager.subscribe(subscribeOptions);
}

async function setupNotifications() {
  await askPermission();
  const pushSubscription = await subscribeUserToPush();
}

async function toggleNotifications() {
  notificationsEnabled.value = !notificationsEnabled.value;
}
</script>