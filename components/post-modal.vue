<template>
  <UModal :ui="{strategy:'merge', container:'items-start'}">
    <post :report="props.report" @close="emit('close')" @success="emit('success')"></post>
  </UModal>
</template>

<script setup lang="ts">
import type { SelectReport } from '../db/schema';

const props = defineProps<{
  report: SelectReport,
}>();
const emit = defineEmits(['success', 'close']);
</script>