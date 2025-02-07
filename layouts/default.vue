<template>
  <NuxtPwaManifest />
  <NuxtLoadingIndicator />
  <UContainer>
    <header>
      <AuthState>
        <template #default="{ loggedIn }">
          <div v-if="loggedIn" class="flex">
            <UHorizontalNavigation :links="authedLinks" class="border-b border-gray-200 dark:border-gray-800" />
            <div class="flex border-b border-gray-200 dark:border-gray-800">
              <ClientOnly>
                <notifications></notifications>
              </ClientOnly>
              <UDropdown :items="authedDropdown">
                <UButton color="white" icon="i-heroicons-bars-3" class="m-2" />
                <template #item="{ item }">
                  <div class="flex w-full items-center flex-row-reverse">
                    <UIcon :name="item.icon" class="ml-2"/>
                    <span class="truncate">{{ item.label }}</span>
                  </div>
                </template>
              </UDropdown>
            </div>
          </div>
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
    },
  ]];
});
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
})
</script>