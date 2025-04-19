<template>
  <UCard class="mt-6" :ui="{body:{padding:'px-4 py-0 sm:p-6 sm:py-0 '}}">
    <UTable
      v-model:expand="usersExpand"
      :loading="usersStatus === 'pending' || users === null"
      :loading-state="{ icon: 'i-heroicons-arrow-path-20-solid', label: 'Loading...' }"
      :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No users' }"
      :columns="[{ key: 'userName', label: 'User' },{ key: 'roles', label: 'Roles' }]"
      :rows="users?.result"
    >
      <template #expand="{ row }">
        <user-update :user="row" @on-delete-user="onDeleteUser"></user-update>
      </template>
      <template #expand-action="{ isExpanded, toggle }">
        <UButton @click="toggle" :icon="isExpanded ? 'i-heroicons-bars-arrow-up-16-solid' : 'i-heroicons-bars-arrow-down-16-solid'" />
      </template>
      <template #roles-data="{ row }">
        <span>{{ row.roles.join(', ') }}</span>
      </template>
      <template #userName-data="{ row }">
        <div class="flex">
          <span>{{ row.userName }}</span>
          <UIcon v-if="row.hasActiveSubscription" name="i-heroicons-bell" class="w-5 h-5 ml-2" />
        </div>
      </template>
    </UTable>
    <template v-if="users && users.count > limit" #footer>
      <UPagination
        v-model="page"
        :page-count="limit"
        :total="users.count"
        class="justify-center"
      />
    </template>
  </UCard>
  <UCard class="my-8">
    <template #header>
      <h2 class="text-lg text-center">Mastodon</h2>
    </template>
    <MastodonSettingsUpdate v-if="integrationsStatus === 'success'" :integration="mastoInt" />
    <div v-else-if="integrationsStatus === 'error'" class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Error retrieving settings</p>
    </div>
    <div v-else class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4 animate-spin" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Loading...</p>
    </div>
  </UCard>
  <UCard class="my-8">
    <template #header>
      <h2 class="text-lg text-center">Blue Sky</h2>
    </template>
    <BlueSkySettingsUpdate v-if="integrationsStatus === 'success'" :integration="bskyInt" />
    <div v-else-if="integrationsStatus === 'error'" class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Error retrieving settings</p>
    </div>
    <div v-else class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4 animate-spin" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Loading...</p>
    </div>
  </UCard>
  <UCard class="my-8">
    <template #header>
      <h2 class="text-lg text-center">Twitter</h2>
    </template>
    <TwitterSettings v-if="integrationsStatus === 'success'" :integration="twitterInt" />
    <div v-else-if="integrationsStatus === 'error'" class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Error retrieving settings</p>
    </div>
    <div v-else class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4 animate-spin" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Loading...</p>
    </div>
  </UCard>
  <UCard class="my-8">
    <template #header>
      <h2 class="text-lg text-center">Map</h2>
    </template>
    <MapSettings v-if="integrationsStatus === 'success'" :integration="mapInt" />
    <div v-else-if="integrationsStatus === 'error'" class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Error retrieving settings</p>
    </div>
    <div v-else class="flex flex-col items-center justify-center px-6 py-14 sm:px-14">
      <UIcon name="i-heroicons-arrow-path-20-solid" class="w-6 h-6 mx-auto text-gray-400 dark:text-gray-500 mb-4 animate-spin" />
      <p class="text-sm text-center text-gray-900 dark:text-white">Loading...</p>
    </div>
  </UCard>
</template>

<script lang="ts" setup>
import { UButton, UCard, UIcon } from '#components';
import MastodonSettingsUpdate from '~/components/mastodon-settings-update.vue';

definePageMeta({
  middleware: ['admin'],
});

useHead({
  title: 'UnfareSF - Settings'
})

const limit = ref(10);
const page = ref(1);
const toast = useToast();
const usersExpand = ref({
  openedRows: [],
  row: {}
});
const mastoInt = ref();
const mapInt = ref();
const twitterInt = ref();
const bskyInt = ref();

const { data: users, status:usersStatus, refresh } = await useLazyFetch("/api/users", {
  server: false,
  query: { page: page, limit: limit },
  watch: [page],
  onResponseError({ response }) {
    toast.add({
      color: 'red',
      title: response.statusText
    });
  }
});
async function onDeleteUser() {
  await refresh();
}

const { data: integrations, status:integrationsStatus } = await useLazyFetch('/api/integrations', {
  server: false,
  onResponseError({ response }) {
    toast.add({
      color: 'red',
      title: response.statusText
    });
  }
});
watch(integrations, (newIntegrations) => {
  if (newIntegrations) {
    mastoInt.value = newIntegrations.find((integ) => integ.name === 'mastodon');
    mapInt.value = newIntegrations.find((integ) => integ.name === 'map');
    twitterInt.value = newIntegrations.find((integ) => integ.name === 'twitter');
    bskyInt.value = newIntegrations.find((integ) => integ.name === 'bsky');
  }
}, {once: true});
</script>