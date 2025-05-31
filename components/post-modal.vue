<template>
  <UModal title="Create broadcast from report" description="Modal containing form for creating a new broadcast from a report.">
    <template #content>
      <post :report="props.report" @broadcast="onBroadcast" @dismissed="onDismiss" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SelectReport } from '../db/schema';

const props = defineProps<{
  report: SelectReport,
}>();

const emit = defineEmits<{
  close: [SelectReport|undefined],
}>();

function onBroadcast(report: SelectReport) {
  emit('close', report);
}

function onDismiss(report: SelectReport) {
  emit('close', report);
}

</script>