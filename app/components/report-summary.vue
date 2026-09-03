<template>
  <div v-if="props.summary" class="break-words">
    <span>{{ props.summary }}</span>
  </div>
  <div v-else class="space-y-2">
    <USkeleton class="h-4" />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  summary: string;
}>();
</script>
