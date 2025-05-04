<!-- The style classes and exactActiveClass on links is because nuxt-ui <ULink> prefetch is broken -->
<template>
  <header>
    <AuthState>
      <template #default="{ loggedIn }">
        <div v-if="loggedIn" class="w-full border-b border-gray-200 dark:border-gray-800">
          <UContainer>
            <ul class="flex items-center justify-end">
              <li>
                <NuxtLink to="/" icon="i-heroicons-home"
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-home" class="w-5 h-5 mr-1" />{{ user?.userName || '' }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/reports" icon="i-heroicons-home"
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document-magnifying-glass" class="w-5 h-5 mr-1" />Reports
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/report" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document-plus" class="w-5 h-5 mr-1" />Report
                </NuxtLink>
              </li>
              <ClientOnly>
                <li>
                  <notifications></notifications>
                </li>
                <template #fallback>
                  <!-- this will be rendered on server side -->
                  <li>
                    <UButton color="gray" class="m-2" icon="i-heroicons-bell-slash" disabled />
                  </li>
                </template>
              </ClientOnly>
              <UPopover :popper="{ placement: 'bottom-end' }">
                <UButton color="white" icon="i-heroicons-bars-3" class="m-2" />
                <template #panel="{ close }">
                  <ul class="p-1 bg-white  dark:bg-gray-800  min-w-44">
                    <li v-for="link in authedDropdown" class="flex w-full items-center flex-row-reverse mb-1 last:mb-0">
                      <UButton v-if="link.click" @click="async () => { close(); return link.click(); }" variant="ghost"
                        color="gray" class="w-full justify-between dark:hover:bg-gray-900">
                        <UIcon :name="link.icon" class="ml-2" /><span>{{ link.label }}</span>
                      </UButton>
                      <NuxtLink v-else
                        class="flex px-2 py-1 w-full rounded-md justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-900"
                        active-class="bg-gray-50 dark:bg-gray-900" :to="link.to" @click="close">
                        <UIcon :name="link.icon" class="ml-2" /><span>{{ link.label }}</span>
                      </NuxtLink>
                    </li>
                  </ul>
                </template>
              </UPopover>
            </ul>
          </UContainer>
        </div>
        <div v-else class="w-full border-b border-gray-200 dark:border-gray-800">
          <UContainer>
            <ul class="flex items-center justify-end">
              <li>
                <NuxtLink to="/" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document" class="w-5 h-5 mr-1" />Reports
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/report" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document-plus" class="w-5 h-5 mr-1" />Report
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle'
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1" />Sign In
                </NuxtLink>
              </li>
            </ul>
          </UContainer>
        </div>
      </template>
      <template #placeholder>
        <div class="w-full border-b border-gray-200 dark:border-gray-800">
          <UContainer>
            <ul class="flex items-center justify-end">
              <li>
                <NuxtLink to="/" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document" class="w-5 h-5 mr-1" />Reports
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/report" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document-plus" class="w-5 h-5 mr-1" />Report
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle'
                  exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1" />Sign In
                </NuxtLink>
              </li>
            </ul>
          </UContainer>
        </div>
      </template>
    </AuthState>
  </header>
  <UModals />
  <UContainer>
    <NuxtLoadingIndicator />
    <UNotifications />
  </UContainer>
  <NuxtPage />
</template>

<style>
.unfaresf-full-screen {
  height: 100lvh;
  overflow: hidden;
}
</style>

<script lang="ts" setup>
import { computed } from 'vue';

const { clear, user } = useUserSession();
const { $pwa } = useNuxtApp();

// is this really the best way to do this?!
useHead({
  htmlAttrs: {
    class: 'unfaresf-full-screen'
  },
  bodyAttrs: {
    class: 'unfaresf-full-screen'
  }
});

async function deleteSubscription(sub: PushSubscription) {
  return $fetch('/api/subscriptions', {
    method: 'DELETE',
    query: {
      endpoint: sub.endpoint
    }
  });
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = $pwa.registration;
  if (!registration.value) {
    throw new Error('service worker not registered');
  }
  return registration.value?.pushManager.getSubscription() ?? null;
}

async function disableNotifications() {
  const subscriptions = await getCurrentSubscription();
  if (subscriptions) {
    await Promise.allSettled([
      subscriptions.unsubscribe(),
      deleteSubscription(subscriptions),
    ]);
  }
}

async function logout() {
  try {
    await disableNotifications();
  } catch (err) {
    console.debug('error disabling notifications during logout', err);
  }

  await clear();
  return navigateTo('/sign-in');
}

const authedDropdown = computed(() => {
  return [
    {
      label: 'Invite',
      icon: 'i-heroicons-envelope-open',
      to: '/invite',
      disabled: user.value ? !user.value.roles.includes('Admin') : true,
    }, {
      label: 'Settings',
      icon: 'i-heroicons-adjustments-horizontal',
      to: '/settings',
      disabled: user.value ? !user.value.roles.includes('Admin') : true,
    }, {
      label: `Logout`,
      icon: 'i-heroicons-arrow-right-start-on-rectangle',
      click: logout
    }
  ];
});
</script>
