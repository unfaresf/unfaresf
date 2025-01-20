<template>
  <span v-if="props.report.passenger">Fare inspectors on <strong>{{ props.report.route?.routeShortName }}</strong> headed <strong>{{ getDirection(props.report) }}</strong> from <strong>{{ props.report.stop?.stopName }}</strong></span>
  <span v-else>Fare inspectors at <strong>{{ props.report.stop?.stopName }}</strong> for the <strong>{{ getDirection(props.report) }}</strong> bound <strong>{{ props.report.route?.routeShortName }}</strong></span>
</template>

<script setup lang="ts">
import type { SelectReport } from '../db/schema';

function getDirection(report:SelectReport): string {
  if (report.route?.direction) {
    return report.route.direction;
  } else if (report.direction?.direction) { // remove this case after removing col from DB
    return  report.direction.direction;
  }
  return '';
}

const props = defineProps<{
  report: SelectReport,
}>();
</script>