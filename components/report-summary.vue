<template>
  <div v-if="props.report" ref="summary-ref">
    <span v-if="props.report.message">{{ props.report.message }}</span>
    <span v-else>{{ getPlainTextSummary(props.report) }}</span>
  </div>
  <div v-else class="space-y-2">
    <USkeleton class="h-4" />
  </div>
</template>

<script lang="ts">

type PartialReport = Omit<SelectReport, 'route' | 'stop' | 'source' | 'id'| 'uri'| 'reviewedAt'| 'direction'> & {
  route: Partial<SelectReport['route']>
  stop: Partial<SelectReport['stop']>
}

export function getPlainTextSummary(report: PartialReport) {
  if (!report) return '';

  const formattedDate =  formatDate(report.createdAt, 'p')

  if (report.passenger) {
    return `${formattedDate}: Fare inspectors on ${report.route?.routeShortName } headed ${ report.route?.direction } from ${ report.stop?.stopName }`;
  } else {
    const directionString = `${ report.route?.direction }${report.route?.direction?.toLowerCase().includes('bound') ? ' bound' : ''}`
    return `${formattedDate}: Fare inspectors at ${ report.stop?.stopName } for the ${directionString} ${ report.route?.routeShortName }`;
  }
}
</script>

<script setup lang="ts">
import { formatDate } from 'date-fns/format';
import type { SelectReport } from '../db/schema';
import { useTemplateRef } from 'vue';

const props = defineProps<{
  report: SelectReport|null,
}>();

const summary = useTemplateRef('summary-ref');

defineExpose({
  summary
});
</script>