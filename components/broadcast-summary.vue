<template>
  <span v-if="props.report.passenger">Fare inspectors on <strong>{{ props.report.route }}</strong> headed <strong>{{ props.report.direction }}</strong> from <strong>{{ props.report.stop }}</strong></span>
  <span v-else>Fare inspectors at <strong>{{ props.report.stop }}</strong> for <strong>{{ props.report.direction }}</strong> bound <strong>{{ props.report.route }}</strong></span>
</template>

<script setup lang="ts">
import type { UnfareReport } from '../db/schema';

const props = defineProps<{
  report: UnfareReport,
}>();
</script>