<template>
  <post :report="report" @close="onClose" @success="onSuccess" />
</template>

<script lang="ts" setup>
import type { SelectReport } from '../../db/schema';

definePageMeta({
  middleware: ['auth']
});

const route = useRoute();

const { data: report } = await useLazyFetch<SelectReport>(`/api/reports/${route.params.id}`);
watch(report, newReport => {
  if (newReport) {
    report.value = newReport;
  }
}, {once: true});

async function onClose() {
  await navigateTo('/reports');
}
async function onSuccess() {
  await navigateTo('/reports');
}
</script>