<template>
  <UContainer>
    <UCard class="mt-10">
      <template #header>
        <h2>New Reports</h2>
      </template>
      <UTable
        :loading="newReportsStatus === 'pending'"
        :loading-state="{ icon: 'i-heroicons-arrow-path-20-solid', label: 'Loading...' }"
        :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No reports' }"
        class="w-full"
        :columns="[{ key: 'message', label: 'Message' }, { key: 'approved', label: 'Approved' },{ key: 'source', label: 'Source' },{ key: 'createdAt', label: 'Created' }]"
        :rows="unreviewedReports"
      >
        <template #createdAt-data="{ row }">
          <span>{{ formatDistanceToNow(new Date(row.createdAt)) }}</span>
        </template>
      </UTable>
    </UCard>

    <UCard class="mt-10">
      <template #header>
        <h2>Old Reports</h2>
      </template>
      <UTable
        :loading="oldReportsStatus === 'pending'"
        :loading-state="{ icon: 'i-heroicons-arrow-path-20-solid', label: 'Loading...' }"
        :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No reports' }"
        class="w-full"
        :columns="[{ key: 'message', label: 'Message' }, { key: 'approved', label: 'Approved' },{ key: 'source', label: 'Source' },{ key: 'createdAt', label: 'Created' }]"
        :rows="reviewedReports"
      />
    </UCard>
  </UContainer>
</template>

<script lang="ts" setup>
import { type UnfareReport } from '../db/schema';
import { watch } from 'vue';
import { formatDistanceToNow } from "date-fns";

const limit = 20;
const unreviewedPage = ref(0);
const reviewedPage = ref(0);
const unreviewedReports = ref<UnfareReport[]>([]);
const reviewedReports = ref<UnfareReport[]>([]);

definePageMeta({
  middleware: ['auth']
});

const { data:d1, status:newReportsStatus } = await useLazyFetch<UnfareReport[]>("/api/reports", {
  query: { page: unreviewedPage.value, limit: limit, reviewed: false }
});
if (d1.value !== null) {
  unreviewedReports.value = d1.value;
}
watch(d1, (dd1) => {
  if (dd1 !== null) {
    unreviewedReports.value = dd1;
  }
}, { once: true });

const { data: d2, status:oldReportsStatus } = await useLazyFetch<UnfareReport[]>("/api/reports", {
  query: { page: reviewedPage.value, limit: limit, reviewed: true }
});
if (d2.value !== null) {
  reviewedReports.value = d2.value;
}
watch(d2, (dd2) => {
  if (dd2 !== null) {
    reviewedReports.value = dd2;
  }
}, { once: true });
</script>