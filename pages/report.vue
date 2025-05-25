<template>
  <div class="grid grid-cols-8 gap-4 mt-4">
    <UCard class="col-span-8 lg:col-span-5 xs:mt-10 md:mt-0">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>Use this form to report fare inspectors on San Francisco Bay Area public transit.</p>
      </template>
     <ReportForm />
    </UCard>
  </div>
</template>

<script lang="ts" setup>
useHead({
  title: 'UnfareSF - Report'
});

</script>