<template>
  <UModal :ui="{ content: 'items-start' }">
    <template #content>
      <post
        :report="props.report"
        @close="emit('close')"
        @success="emit('close', { success: true })"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SelectReport } from '../../db/schema'

const props = defineProps<{ report: SelectReport }>()
const emit = defineEmits<{ close: [payload?: { success?: boolean }] }>()
</script>
