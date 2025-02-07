<template>
  <div v-if="props.report" ref="summary-ref">
    <span v-if="props.report.message">{{ props.report.message }}</span>
    <span v-else-if="props.report.passenger">Fare inspectors on <strong>{{ props.report.route?.routeShortName }}</strong> headed <strong>{{ getDirection(props.report) }}</strong> from <strong>{{ props.report.stop?.stopName }}</strong></span>
    <span v-else>Fare inspectors at <strong>{{ props.report.stop?.stopName }}</strong> for the <strong>{{ getDirection(props.report) }}</strong> bound <strong>{{ props.report.route?.routeShortName }}</strong></span>
  </div>
  <div v-else class="space-y-2">
    <USkeleton class="h-4 w-[250px]" />
    <USkeleton class="h-4 w-[200px]" />
    </div>
</template>

<script setup lang="ts">
import type { SelectReport } from '../db/schema';
import { useTemplateRef } from 'vue';

const props = defineProps<{
  report: SelectReport|null,
}>();

const summary = useTemplateRef('summary-ref');

function getDirection(report:SelectReport): string {
  if (report.route?.direction) {
    return report.route.direction;
  } else if (report.direction?.direction) { // remove this case after removing col from DB
    return  report.direction.direction;
  }
  return '';
}

defineExpose({
  summary
});
</script>