<template>
  <UCard class="mt-10">
    <template #header>
      <h1 class="text-2xl">Success</h1>
    </template>
    <p>Thank you for submitting a report. We will review and share it as soon as possible.</p>
    <UButton to="/" class="mt-4">Submit another report</UButton>
  </UCard>
</template>

<script setup lang="ts">
useHead({
  title: 'UnfareSF - Thank you'
});
</script>