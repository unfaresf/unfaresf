// Push-notification subscription state + actions, shared by the desktop bell
// (components/notifications.vue) and the mobile bottom tab bar
// (composable/useMobileNav.ts, consumed by both layouts).

export function useNotifications() {
  const { public: { vapidPublicKey } } = useRuntimeConfig();
  const { $pwa } = useNuxtApp();
  const toast = useToast();

  const loading = useState<boolean>('notifications:loading', () => false);
  const supported = useState<boolean>('notifications:supported', () => false);
  const permissionGranted = useState<boolean>('notifications:permissionGranted', () => true);
  const subscribed = useState<boolean>('notifications:subscribed', () => false);
  // False until the initial support/permission/subscription check finishes in
  // onMounted, so consumers can show a disabled control while checking instead of
  // hiding it (hiding would reflow the mobile tab bar when the check resolves).
  const ready = useState<boolean>('notifications:ready', () => false);

  const tooltipText = computed(() => {
    if (!permissionGranted.value) return 'Enable new report notifications';
    return subscribed.value ? 'Notifications enabled' : 'Notifications disabled';
  });

  const bellIcon = computed(() => {
    if (!permissionGranted.value) return 'i-heroicons-bell-slash';
    return subscribed.value ? 'i-heroicons-bell' : 'i-heroicons-bell-snooze';
  });

  function isSupported() {
    try {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      if (!('PushManager' in window)) {
        return false;
      }

      if (!('Notification' in window)) {
        return false;
      }
    } catch (err: any) {
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
    } else if (permission === 'denied') {
      permissionGranted.value = false;
    }
    return permission;
  }

  function urlBase64ToUint8Array(s: string) {
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
    if (!$pwa.isRegistered || !$pwa.registration.value) {
      throw new Error('service worker not registered');
    }

    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(String(vapidPublicKey)),
    };

    return $pwa.registration.value.pushManager.subscribe(subscribeOptions);
  }

  async function saveSubscription(sub: PushSubscription) {
    await $fetch('/api/subscriptions', {
      method: 'POST',
      body: {
        details: sub
      }
    });
  }

  async function deleteSubscription(sub: PushSubscription) {
    return $fetch('/api/subscriptions', {
      method: 'DELETE',
      query: {
        endpoint: sub.endpoint
      }
    });
  }

  async function checkForCurrentSubscription(): Promise<PushSubscription | null> {
    if ($pwa.isRegistered) {
      try {
        return $pwa.registration.value?.pushManager.getSubscription() ?? null;
      } catch (err: any) {
        console.warn('error retrieving current subscriptions', err);
      }
    }
    return null;
  }

  async function setupNotifications() {
    loading.value = true;
    await askPermission();
    try {
      const pushSubscription = await subscribeUserToPush();
      await saveSubscription(pushSubscription);
      subscribed.value = true;
      toast.add({
        color: 'success',
        title: 'Notification enabled',
        description: 'Notifications are enabled for this device/browser.'
      });
    } catch (err: any) {
      toast.add({
        color: 'error',
        title: 'Error enabling notifications',
        description: err.message
      });
    } finally {
      loading.value = false;
    }
  }

  async function tearDownNotifications(sub: PushSubscription, { notify = true } = {}) {
    await Promise.allSettled([
      sub.unsubscribe(),
      deleteSubscription(sub),
    ]);
    subscribed.value = false;
    if (notify) {
      toast.add({
        color: 'success',
        title: 'Notification disabled',
        description: 'Notifications are disabled for this device/browser.'
      });
    }
  }

  async function toggleNotifications() {
    const sub = await checkForCurrentSubscription();
    if (sub) {
      await tearDownNotifications(sub);
    } else {
      await setupNotifications();
    }
  }

  // Toggle for a single control (desktop bell + mobile Alerts tab): enable if
  // permission has not been granted yet, otherwise flip the subscription.
  function toggle() {
    return permissionGranted.value ? toggleNotifications() : setupNotifications();
  }

  // Re-fetch and tear down the current subscription (used by logout). Resets the
  // shared `subscribed` flag so every bell reflects the disabled state after the
  // session is cleared. Silent: the user is being redirected to sign-in, so a
  // "Notification disabled" toast would appear there and read as unrelated.
  async function disableNotifications() {
    const sub = await checkForCurrentSubscription();
    if (sub) {
      await tearDownNotifications(sub, { notify: false });
    }
  }

  onMounted(async () => {
    supported.value = isSupported();
    permissionGranted.value = Notification.permission !== 'denied';
    subscribed.value = !!(await checkForCurrentSubscription());
    ready.value = true;
  });

  return {
    loading,
    supported,
    permissionGranted,
    subscribed,
    ready,
    tooltipText,
    bellIcon,
    toggle,
    toggleNotifications,
    setupNotifications,
    disableNotifications,
  };
}
