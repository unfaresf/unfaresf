<!-- The style classes and exactActiveClass on links is because nuxt-ui <ULink> prefetch is broken -->
<template>
  <NuxtLoadingIndicator />
  <UContainer>
    <header>
      <AuthState>
          <template #default="{ loggedIn }">
            <div v-if="loggedIn" class="flex">
              <ul class="w-full flex items-center justify-end border-b border-gray-200 dark:border-gray-800">
                <li><NuxtLink to="/reports" icon="i-heroicons-home" exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"><UIcon name="i-heroicons-home" class="w-5 h-5 mr-1"/>{{user?.userName  || ''}}</NuxtLink></li>
                <li><NuxtLink to="/" icon="i-heroicons-document" exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"><UIcon name="i-heroicons-document" class="w-5 h-5 mr-1"/>Report</NuxtLink></li>
                <ClientOnly>
                  <li><notifications></notifications></li>
                  <template #fallback>
                    <!-- this will be rendered on server side -->
                    <li><UButton color="gray" class="m-2" icon="i-heroicons-bell-slash" disabled /></li>
                  </template>
                </ClientOnly>
                <UDropdown :items="authedDropdown">
                  <li><UButton color="white" icon="i-heroicons-bars-3" class="m-2" /></li>
                  <template #item="{ item }">
                    <div class="flex w-full items-center flex-row-reverse">
                      <UIcon :name="item.icon" class="ml-2"/>
                      <span class="truncate">{{ item.label }}</span>
                    </div>
                  </template>
                </UDropdown>
              </ul>

            </div>
            <ul v-else class="w-full flex items-center justify-end border-b border-gray-200 dark:border-gray-800">
              <li><NuxtLink to="/" icon="i-heroicons-document" exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"><UIcon name="i-heroicons-document" class="w-5 h-5 mr-1"/>Report</NuxtLink></li>
              <li><NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle' exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"><UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1"/>Sign In</NuxtLink></li>
            </ul>
          </template>
          <template #placeholder>
            <ul class="w-full flex items-center justify-end border-b border-gray-200 dark:border-gray-800">
              <li><NuxtLink to="/" icon="i-heroicons-document" exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white"><UIcon name="i-heroicons-document" class="w-5 h-5 mr-1"/>Report</NuxtLink></li>
              <li><NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle' exactActiveClass="!border-primary-500 text-gray-900 dark:text-white dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-gray-500 box-border border-b-2 border-transparent hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800/50 dark:text-gray-400 dark:hover:text-white" ><UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1"/>Sign In</NuxtLink></li>
            </ul>
          </template>
      </AuthState>
    </header>
    <NuxtPage />
    <footer>
      <div class="py-2"></div>
    </footer>
  </UContainer>
  <UModals />
  <UNotifications />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const { clear, user } = useUserSession();
const { $pwa } = useNuxtApp();

async function deleteSubscription(sub:PushSubscription) {
  return $fetch('/api/subscriptions', {
    method: 'DELETE',
    query: {
      endpoint: sub.endpoint
    }
  });
}

async function getCurrentSubscription():Promise<PushSubscription|null> {
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
  await disableNotifications();
  await clear();
  return navigateTo('/sign-in');
}

const authedDropdown = computed(() => {
  return [[
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
  ]];
});
</script>