<template>
  <div v-if="props.report" ref="summary-ref">
    <span>{{ plainTextSummary }}</span>
  </div>
  <div v-else class="space-y-2">
    <USkeleton class="h-4" />
  </div>
</template>

<script lang="ts">
type PartialReport = Omit<
  SelectReport,
  "route" | "stop" | "source" | "id" | "uri" | "reviewedAt" | "direction"
> & {
  route: Partial<SelectReport["route"]>;
  stop: Partial<SelectReport["stop"]>;
};

export function getPlainTextSummary(report: PartialReport) {
  if (!report) return "";

  const formattedDate = formatDate(report.createdAt, "p");

  if (report.passenger) {
    return `${formattedDate}: Fare inspectors on ${report.route?.routeShortName} headed ${report.route?.direction} from ${report.stop?.stopName}`;
  } else {
    return `${formattedDate}: Fare inspectors at ${report.stop?.stopName} ${report.stop?.direction}`;
  }
}
</script>

<script setup lang="ts">
import { formatDate } from "date-fns/format";
import type { SelectReport } from "../db/schema";
import { useTemplateRef } from "vue";

const props = defineProps<{
  report: SelectReport | null;
}>();

const plainTextSummary = computed(() => {
  return props.report ? getPlainTextSummary(props.report) : "";
});

const summary = useTemplateRef("summary-ref");

defineExpose({
  summary,
});
</script>
