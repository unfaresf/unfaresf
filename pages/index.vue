<template>
  <UContainer>
    <UCard class="mt-10">
      <template #header>
        <h2>New Reports</h2>
      </template>
      <UTable
        :loading="reportsStatus === 'pending'"
        :loading-state="{ icon: 'i-heroicons-arrow-path-20-solid', label: 'Loading...' }"
        :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No reports' }"
        class="w-full"
        :columns="[{ key: 'actions' },{ key: 'message', label: 'Message' }, { key: 'approved', label: 'Approved' },{ key: 'source', label: 'Source' },{ key: 'createdAt', label: 'Created' }]"
        :rows="unreviewedReports.filter(r => !r.reviewedAt)"
      >
        <template #createdAt-data="{ row }">
          <span>{{ formatDistanceToNow(new Date(row.createdAt)) }}</span>
        </template>
        <template #actions-data="{ row }">
          <UButton color="green" variant="soft" icon="i-heroicons-check-circle" @click="openPostModel(row)" class="mr-2" :disabled="disabledRows.has(row.id)" />
          <UButton color="red" variant="ghost" icon="i-heroicons-x-circle" @click="dismiss(row)" :disabled="disabledRows.has(row.id)" />
        </template>
      </UTable>
    </UCard>

    <UCard class="mt-10">
      <template #header>
        <h2>Old Reports</h2>
      </template>
      <UTable
        :loading="reportsStatus === 'pending'"
        :loading-state="{ icon: 'i-heroicons-arrow-path-20-solid', label: 'Loading...' }"
        :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No reports' }"
        class="w-full"
        :columns="[{ key: 'message', label: 'Message' }, { key: 'approved', label: 'Approved' },{ key: 'source', label: 'Source' },{ key: 'createdAt', label: 'Created' }]"
        :rows="unreviewedReports.filter(r => r.reviewedAt)"
      >
        <template #createdAt-data="{ row }">
          <span>{{ formatDistanceToNow(new Date(row.createdAt)) }}</span>
        </template>
      </UTable>
    </UCard>
  </UContainer>
</template>

<script lang="ts" setup>
import { type UnfareReport } from '../db/schema';
import { watch } from 'vue';
import { formatDistanceToNow } from "date-fns";
import { Post } from '#components';

definePageMeta({
  middleware: ['auth']
});

const toast = useToast();
const limit = 20;
const unreviewedPage = ref(0);
const unreviewedReports = ref<UnfareReport[]>([]);
const disabledRows = ref(new Set);
const modal = useModal()

async function dismiss(row:UnfareReport) {
  try {
    disabledRows.value.add(row.id);
    await $fetch(`/api/reports/${row.id}`, {
      method: 'PUT',
      body: {
        approved: false
      }
    });
    await refresh();
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: err.data?.message || err.message,
    });
  } finally {
    disabledRows.value.delete(row.id);
  }
}

async function openPostModel(row:UnfareReport) {
  modal.open(Post, {
    report: row,
    async onClose() {
      return modal.close();
    },
    async onSuccess() {
      return modal.close();
    },
  });
}

const { data:d1, status:reportsStatus, refresh } = await useLazyFetch<UnfareReport[]>("/api/reports", {
  query: { page: unreviewedPage.value, limit: limit }
});
if (d1.value !== null) {
  unreviewedReports.value = d1.value;
}
watch(d1, (dd1) => {
  if (dd1 !== null) {
    unreviewedReports.value = dd1;
  }
});
</script>