<template>
  <div
    v-if="props.report"
    class="flex border-b last:border-none last:pb-0 py-4 first:pt-0"
  >
    <UAvatar src="unfaresf-logo.svg" alt="Avatar" class="mt-2" />
    <div class="mx-2 min-w-0">
      <p class="capitalize">{{ props.report.source }}</p>
      <UTooltip :text="createdAtLabel">
        <ULink
          :to="getRouteFromReportId(props.report.id)"
          class="text-sm italic"
          prefetch
          >{{ formatDistanceToNow(props.report.createdAt) }} ago</ULink
        >
      </UTooltip>
      <ReportSummary :summary="summary" class="mt-2"></ReportSummary>
    </div>
    <div v-if="!props.report.reviewedAt" class="flex flex-col ml-auto">
      <UButton
        class="mb-auto"
        id="report-card-dismiss"
        color="error"
        variant="ghost"
        size="md"
        icon="i-heroicons-x-circle"
        aria-label="Dismiss report"
        :disabled="!report"
        @click="() => { report && emit('onDismiss', report) }"
      />
      <UButton
        v-if="props.report.source === 'internal'"
        class="mt-auto"
        id="report-card-approve"
        color="success"
        variant="soft"
        size="md"
        icon="i-heroicons-check-circle"
        aria-label="Approve report"
        :disabled="!report"
        @click="() => { report && emit('onApprove', report) }"
      />
    </div>
  </div>
  <div v-else>
    <USkeleton class="h-12 w-12 rounded-full" />
    <div class="space-y-2">
      <USkeleton class="h-4 w-62.5" />
      <USkeleton class="h-4 w-50" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDistanceToNow, format as formatDate } from "date-fns";
import { tz } from "@date-fns/tz";
import getPlainTextSummary, {
  REPORT_TIME_ZONE,
} from "#shared/utils/get-plain-text-summary";
import type { SelectReport } from "../../db/schema";

function getRouteFromReportId(reportId: number): string {
  return `/reports/${reportId}`;
}

const props = defineProps<{
  report: SelectReport | null;
}>();

const emit = defineEmits<{
  (e: "onApprove", report: SelectReport): void;
  (e: "onDismiss", report: SelectReport): void;
}>();

const summary = computed(() =>
  props.report ? getPlainTextSummary(props.report) : ""
);

// Pin the tooltip to Bay Area time so it matches the summary below it, and so
// the server-rendered pass agrees with the browser's.
const createdAtLabel = computed(() =>
  props.report
    ? formatDate(props.report.createdAt, "PPpp", { in: tz(REPORT_TIME_ZONE) })
    : ""
);
</script>
