<template>
  <UCard class="mt-10">
    <template #header>
      <div class="flex">
        <h2>New Reports</h2>
        <USelect v-model="reviewed" :options="reviewedStatuses" option-attribute="name" class="ml-auto"/>
      </div>
    </template>
    <UTable
      :loading="reportsStatus === 'pending'"
      :loading-state="{ icon: 'i-heroicons-arrow-path-20-solid', label: 'Loading...' }"
      :empty-state="{ icon: 'i-heroicons-circle-stack-20-solid', label: 'No reports' }"
      class="w-full"
      :columns="[{ key: 'actions' },{ key: 'message', label: 'Message' }, { key: 'source', label: 'Source' },{ key: 'createdAt', label: 'Created' }]"
      :rows="unreviewedReports.result"
    >
      <template #message-data="{ row }">
        <ReportSummary :report="row"></ReportSummary>
      </template>
      <template #createdAt-data="{ row }">
        <span>{{ formatDistanceToNow(new Date(row.createdAt)) }}</span>
      </template>
      <template #actions-data="{ row }">
        <div v-if="!row.reviewedAt">
          <UButton color="green" variant="soft" icon="i-heroicons-check-circle" @click="openPostModel(row)" class="mr-2" :disabled="disabledRows.has(row.id)" />
          <UButton color="red" variant="ghost" icon="i-heroicons-x-circle" @click="dismiss(row)" :disabled="disabledRows.has(row.id)" />
        </div>
      </template>
    </UTable>
    <template #footer>
      <UPagination
        v-if="unreviewedReports.count > limit"
        v-model="page"
        :page-count="limit"
        :total="unreviewedReports.count"
        class="justify-center"
      />
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import { type SelectReport } from '../db/schema';
import { formatDistanceToNow } from "date-fns";
import { Post } from '#components';

definePageMeta({
  middleware: ['auth']
});

const reviewedStatuses = [{
  name: 'Reviewed',
  value: 'true'
}, {
  name: 'Unreviewed',
  value: 'false'
}];
const reviewed = ref(reviewedStatuses[1].value);
const limit = ref(10);
const page = ref(1);
const disabledRows = ref(new Set);
const modal = useModal();
const toast = useToast();

async function dismiss(row:SelectReport) {
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

async function openPostModel(row:SelectReport) {
  modal.open(Post, {
    report: row,
    async onClose() {
      return modal.close();
    },
    async onSuccess() {
      await refresh();
      return modal.close();
    },
  });
}

type ReportsGetResp = {
  count: number,
  result: SelectReport[]
}
const { data:unreviewedReports, status:reportsStatus, refresh } = await useLazyFetch<ReportsGetResp>("/api/reports", {
  query: { page: page, limit: limit, reviewed: reviewed },
  default: () => ({count: 0, result: []}),
  watch: [reviewed, page],
  onResponseError({ response }) {
    toast.add({
      color: 'red',
      title: response.statusText
    });
  }
});
watch(reviewed, () => {
  page.value = 1;
});
</script>