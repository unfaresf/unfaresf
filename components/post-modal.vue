<template>
  <UModal>
    <template #content>
      <post :report="props.report" @posted="onApprove" @dismissed="onDismiss" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SelectReport } from '../db/schema';

const props = defineProps<{
  report: SelectReport,
}>();

const emit = defineEmits<{
  onApprove: [SelectReport],
  onDismiss: [SelectReport]
}>();

function onApprove(report: SelectReport) {
  emit('onApprove', report);
}

function onDismiss(report: SelectReport) {
  emit('onDismiss', report);
}

</script>