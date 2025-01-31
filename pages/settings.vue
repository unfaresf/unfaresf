<template>
  <h1 class="text-xl mb-4">Settings</h1>
  <UCard>
    <template #header>
      <h2 class="text-lg mb-4">Users</h2>
    </template>
    <UTable
      :loading="usersStatus === 'pending'"
      :loading-state="{ icon: 'i-heroicons-arrow-path-20-solid', label: 'Loading...' }"
      :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No users' }"
      class="w-full"
      :columns="[{ key: 'userName', label: 'User' },{ key: 'roles', label: 'Roles' }]"
      :rows="users?.result"
    >
      <template #roles-data="{ row }">
        <span>{{ row.roles.join(', ') }}</span>
      </template>
    </UTable>
  </UCard>
</template>

<script lang="ts" setup>
import { UCard } from '#components';
import { type SelectUser } from "../db/schema";

definePageMeta({
  middleware: ['admin']
});

const limit = ref(10);
const page = ref(1);
const toast = useToast();

type UsersGetResp = {
  count: number,
  result: SelectUser[]
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