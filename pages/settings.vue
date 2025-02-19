<template>
  <h1 class="text-xl my-4">Settings</h1>
  <UCard>
    <template #header>
      <h2 class="text-lg text-center">Users</h2>
    </template>
    <UTable
      v-model:expand="usersExpand"
      :loading="usersStatus === 'pending'"
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
    <template #footer>
      <UPagination
        v-if="users && users.count > limit"
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
    <MastodonSettingsUpdate></MastodonSettingsUpdate>
  </UCard>
</template>

<script lang="ts" setup>
import { UButton, UCard, UIcon } from '#components';
import MastodonSettingsUpdate from '~/components/mastodon-settings-update.vue';
import { type GetUser, type Prettify } from "../db/schema";

definePageMeta({
  middleware: ['admin']
});

const limit = ref(10);
const page = ref(1);
const toast = useToast();
const usersExpand = ref({
  openedRows: [],
  row: {}
});

type UsersGetResp = {
  count: number,
  result: Prettify<{hasActiveSubscription:boolean} & GetUser>[]
}

const { data: users, status:usersStatus, refresh } = await useLazyFetch<Awaited<Promise<UsersGetResp>>>("/api/users", {
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
</script>