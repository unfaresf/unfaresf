<template>
  <h1 class="text-xl my-4">Settings</h1>
  <UCard>
    <template #header>
      <h2 class="text-lg">Users</h2>
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
        <user-update :user="row"></user-update>
      </template>
      <template #expand-action="{ isExpanded, toggle }">
        <UButton @click="toggle" :icon="isExpanded ? 'i-heroicons-bars-arrow-up-16-solid' : 'i-heroicons-bars-arrow-down-16-solid'" />
      </template>
      <template #roles-data="{ row }">
        <span>{{ row.roles.join(', ') }}</span>
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
</template>

<script lang="ts" setup>
import { UButton, UCard } from '#components';
import { type GetUser } from "../db/schema";

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
  result: GetUser[]
}

const { data: users, status:usersStatus } = await useLazyFetch<Awaited<Promise<UsersGetResp>>>("/api/users", {
  query: { page: page, limit: limit },
  watch: [page],
  onResponseError({ response }) {
    toast.add({
      color: 'red',
      title: response.statusText
    });
  }
});
</script>