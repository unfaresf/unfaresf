<template>
  <div v-if="supported">
    <UTooltip v-if="!permissionGranted" text="Enable new report notifications">
      <UButton :loading="loading" color="lime" class="m-2" icon="i-heroicons-bell" @click="setupNotifications" />
    </UTooltip>
    <UTooltip v-else  :text="currentSubscription ? 'Silence notifications': 'Enable new report notifications'">
      <UButton :loading="loading" color="white" class="m-2" :icon="currentSubscription ? 'i-heroicons-bell-snooze' : 'i-heroicons-bell-alert'" @click="toggleNotifications" />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
const {public: {vapidPublicKey}} = useRuntimeConfig();
const { $pwa } = useNuxtApp();
const toast = useToast();

const loading = ref(false);
const supported = ref<boolean>(isSupported());
const permissionGranted = ref<boolean>(isNotificationPermissionGranted());
const currentSubscription = ref<PushSubscription|null>(null);

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
    throw new Error('service worker not registered');
  }

  const subscribeOptions = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(String(vapidPublicKey)),
  };
  return registration.pushManager.subscribe(subscribeOptions);
}

async function saveSubscription(sub:PushSubscription) {
  await $fetch('/api/subscriptions', {
    method: 'POST',
    body: {
      details: sub
    }
  });
}

async function deleteSubscription(sub:PushSubscription) {
  return $fetch('/api/subscriptions', {
    method: 'DELETE',
    query: {
      endpoint: sub.endpoint
    }
  });
}

async function getCurrentSubscription():Promise<PushSubscription|null> {
  const registration = $pwa?.getSWRegistration();
  if (!registration) {
    throw new Error('service worker not registered');
  }
  return registration.pushManager.getSubscription();
}

async function toggleNotifications() {
  if (currentSubscription.value) {
    await tearDownNotifications()
  } else {
    setupNotifications();
  }
}

async function setupNotifications() {
  loading.value = true;
  await askPermission();
  try {
    const pushSubscription = await subscribeUserToPush();
    await saveSubscription(pushSubscription);
    currentSubscription.value = pushSubscription;
    toast.add({
      color: 'green',
      title: 'Notification enabled',
      description: 'Notifications are enabled for this device/browser.'
    });
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: 'Error deleting user',
      description: err.message
    });
  } finally {
    loading.value = false;
  }
}

async function tearDownNotifications() {
  if (currentSubscription.value) {
    await Promise.allSettled([
      await currentSubscription.value?.unsubscribe(),
      await deleteSubscription(currentSubscription.value),
    ]);
    currentSubscription.value = null;
    toast.add({
      color: 'green',
      title: 'Notification disabled',
      description: 'Notifications are disabled for this device/browser.'
    });
  }
}

currentSubscription.value = await getCurrentSubscription();
</script>