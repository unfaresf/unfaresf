<template>
  <span v-if="props.report.passenger">Fare inspectors on <strong>{{ props.report.route?.routeShortName }}</strong> headed <strong>{{ props.report.direction?.direction }}</strong> from <strong>{{ props.report.stop?.stopName }}</strong></span>
  <span v-else>Fare inspectors at <strong>{{ props.report.stop?.stopName }}</strong> for the <strong>{{ props.report.direction?.direction }}</strong> bound <strong>{{ props.report.route?.routeShortName }}</strong></span>
</template>

<script setup lang="ts">
import type { SelectReport } from '../db/schema';

const props = defineProps<{
  report: SelectReport,
}>();
</script>