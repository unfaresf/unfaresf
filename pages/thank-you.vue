<template>
  <UCard class="mt-4">
    <template #header>
      <h1 class="text-2xl">Success</h1>
    </template>
    <p>Thank you for submitting a report. We will review and share it as soon as possible.</p>
    <div class="flex">
      <UButton to="/" color="fuchsia" variant="ghost" class="mt-4 mr-2" icon="i-heroicons-arrow-left" :trailing="false">Back to Map</UButton>
      <UButton to="/report" class="mt-4 ml-auto">Make Another Report</UButton>
    </div>

  </UCard>
</template>

<script setup lang="ts">
useHead({
  title: 'UnfareSF - Thank you'
});
</script>