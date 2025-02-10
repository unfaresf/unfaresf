<template>
  <div v-if="supported">
    <UTooltip v-if="permissionGranted" :text="tooltipText">
      <UButton v-if="currentSubscription" :loading="loading" color="white" class="m-2" icon="i-heroicons-bell" @click="toggleNotifications" />
      <UButton v-else :loading="loading" color="white" class="m-2" icon="i-heroicons-bell-snooze" @click="toggleNotifications" />
    </UTooltip>
    <UTooltip v-else text="Enable new report notifications">
      <UButton :loading="loading" color="lime" class="m-2" icon="i-heroicons-bell-slash" @click="setupNotifications" />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
const {public: {vapidPublicKey}} = useRuntimeConfig();
const { $pwa } = useNuxtApp();
const toast = useToast();

const loading = ref(false);
const supported = ref<boolean>(isSupported());
const permissionGranted = ref<boolean>(Notification.permission === "granted");
const currentSubscription = shallowRef<PushSubscription|null>(null);
const tooltipText = computed(() => {
  return currentSubscription.value ? 'Notifications enabled' : 'Notifications disabled'
});
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

async function askPermission() {
  // The API recently changed from taking a callback to returning a Promise. The
  // problem with this, is that we can't tell what version of the API is
  // implemented by the current browser, so you have to implement both and handle both.
  const permission = await new Promise<NotificationPermission>((resolve, reject) => {
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
  return permission;
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

async function toggleNotifications() {
  if (currentSubscription.value) {
    await tearDownNotifications();
  } else {
    await setupNotifications();
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
      title: 'Error disabling notifications',
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

async function checkForCurrentSubscription() {
  const registration = $pwa?.getSWRegistration();
  if (registration && !$pwa?.registrationError) {
    try {
      return registration.pushManager.getSubscription();
    } catch (err:any) {
      console.warn('error retrieving current subscriptions', err);
    }
  }
  return null;
}

onMounted(async () => {
  const x = await checkForCurrentSubscription();
  console.log(x);
  currentSubscription.value = x;
});
</script>