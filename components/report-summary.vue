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
    return `${formattedDate}: Fare inspectors on ${
      report.route?.routeShortName || "ROUTE"
    } headed ${report.route?.direction || "DIRECTION"} from ${
      report.stop?.stopName || "STOP"
    }`;
  } else {
    return `${formattedDate}: Fare inspectors at ${
      report.stop?.stopName || "STOP"
    } ${report.stop?.direction || "DIRECTION"}`;
  }
}
</script>

<script setup lang="ts">
import { formatDate } from "date-fns/format";
import type { SelectReport } from "../db/schema";
import { useTemplateRef } from "vue";

const props = defineProps<{
  report: PartialReport | null;
}>();

const plainTextSummary = computed(() => {
  return props.report ? getPlainTextSummary(props.report) : "";
});

const summary = useTemplateRef("summary-ref");

defineExpose({
  summary,
});
</script>
