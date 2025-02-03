<template>
  <NuxtLoadingIndicator />
  <UContainer>
    <header>
      <AuthState>
        <template #default="{ loggedIn }">
          <UHorizontalNavigation v-if="loggedIn" :links="authedLinks" class="border-b border-gray-200 dark:border-gray-800" />
          <UHorizontalNavigation v-else="loggedIn" :links="unauthedLinks" class="border-b border-gray-200 dark:border-gray-800" />
        </template>
        <template #placeholder>
          <UHorizontalNavigation :links="unauthedLinks" class="border-b border-gray-200 dark:border-gray-800" />
        </template>
      </AuthState>
    </header>
    <NuxtPage />
  </UContainer>
  <UModals />
  <UNotifications />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
const { clear, user } = useUserSession();

async function logout() {
  await clear();
  return navigateTo('/sign-in');
}

const unauthedLinks = [[],[
  {
    label: `Sign In`,
    icon: 'i-heroicons-arrow-right-end-on-rectangle',
    to: '/sign-in'
  }
]];
const authedLinks = computed(() => {
  return [[],[
    {
      label: user.value?.userName || '',
      icon: 'i-heroicons-home',
      to: '/reports'
    }, {
      label: 'Report',
      icon: 'i-heroicons-document',
      to: '/'
    }, {
      label: 'Invite',
      icon: 'i-heroicons-envelope-open',
      to: '/invite'
    }, {
      label: 'Settings',
      icon: 'i-heroicons-adjustments-horizontal',
      to: '/settings'
    }, {
      label: `Logout`,
      icon: 'i-heroicons-arrow-right-start-on-rectangle',
      click: logout
    }
  ]];
});
</script>