<template>
  <div v-if="props.report" ref="summary-ref">
    <span>{{ plainTextSummary }}</span>
  </div>
  <div v-else class="space-y-2">
    <USkeleton class="h-4" />
  </div>
</template>

<script setup lang="ts">
import { type PartialReport, getPlainTextSummary } from '../shared/utils/report-plain-text-summary';
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
