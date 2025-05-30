<template>
  <div v-if="props.report" class="flex border-b last:border-none last:pb-0 py-4 first:pt-0">
    <UAvatar
      src="unfaresf-logo.svg"
      alt="Avatar"
      class="mt-2"
    />
    <div class="mx-2">
      <p class="capitalize">{{ props.report.source }}</p>
      <UTooltip :text="formatDate(props.report.createdAt, 'PPpp')">
        <ULink :to="getRouteFromReportId(props.report.id)" class="text-sm italic" prefetch>{{ formatDistanceToNow(props.report.createdAt) }} ago</ULink>
      </UTooltip>
      <ReportSummary :report="props.report" class="mt-2"></ReportSummary>
    </div>
    <div v-if="report && !props.report.reviewedAt" class="flex flex-col ml-auto">
      <UButton class="mb-auto cursor-pointer" :id="'report-card-dismiss-'+props.report.id" color="error" variant="ghost" size="md" icon="i-heroicons-x-circle" aria-label="Dismiss report" :disabled="requestPending" @click="dismiss(props.report)" />
      <UButton class="mt-auto cursor-pointer" :id="'report-card-approve-'+props.report.id" color="primary" variant="soft" size="md" icon="i-heroicons-check-circle" aria-label="Approve report" :disabled="requestPending" @click="onApprove(props.report)" />
    </div>
  </div>
  <div v-else>
    <USkeleton class="h-12 w-12" :ui="{ rounded: 'rounded-full' }" />
    <div class="space-y-2">
      <USkeleton class="h-4 w-[250px]" />
      <USkeleton class="h-4 w-[200px]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDistanceToNow, format as formatDate } from 'date-fns';
import type { SelectReport } from '../db/schema';
import { PostModal } from '#components';

const props = defineProps<{
  report: SelectReport|null,
}>();

const emit = defineEmits<{
  change: [SelectReport|undefined],
}>();

const requestPending = ref(false);
const overlay = useOverlay();
const toast = useToast();

function getRouteFromReportId(reportId: number):string{
  return `/reports/${reportId}`;
}

async function onApprove(report: SelectReport) {
  const modal = overlay.create(PostModal, {
    props: {
      report: report,
    },
  });

  const instance = modal.open();

  const result = await instance.result;
  emit('change', result);
}


async function dismiss(report:SelectReport) {
  requestPending.value = true;
  try {
    await $fetch(`/api/reports/${report.id}`, {
      method: 'PUT',
      body: {
        approved: false
      }
    });
    emit('change', report);
  } catch (err:any) {
    toast.add({
      color: 'error',
      title: 'Error dismissing reprt',
      description: err.data?.message || err.message,
    });
  } finally {
    requestPending.value = false;
  }
}

</script>