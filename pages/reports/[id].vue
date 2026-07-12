<template>
  <div class="grid grid-cols-6 gap-4 mt-4">
    <div class="col-span-6 lg:col-span-4 xs:mt-10 md:mt-0">
      <post v-if="report" :report="report" @close="onClose" @success="onSuccess" />
    </div>
    <UCard class="col-span-6 lg:col-span-2 xs:mt-10 md:mt-0">
      <template #header>
        <h2 class="text-lg">Recent Broadcasts</h2>
        <p class="text-xs text-neutral-500">Check recent broadcasts to avoid duplicate messages.</p>
      </template>
      <div>
        <ol v-if="broadcasts && broadcasts.result.length">
          <li v-for="broadcast in broadcasts?.result" class="">
            {{ broadcast.message }}
            <span class="text-xs italic">{{ formatDistanceToNow(broadcast.createdAt) }} ago</span>
            <USeparator class="my-2"/>
          </li>
        </ol>
        <div v-else>
          <p>No recent broadcasts.</p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import type { SelectReport } from '../../db/schema';
import { sub, formatDistanceToNow } from 'date-fns';

const route = useRoute();

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: `UnfareSF - Report ${route.params.id}`
});

const { data: report } = await useLazyFetch<SelectReport>(`/api/reports/${route.params.id}`, {
  server: false,
});

const { data: broadcasts } = await useLazyFetch(`/api/broadcasts`, {
  server: false,
  query: {
    from: sub(new Date(), {hours: 12}).toISOString(),
  },
});

async function onClose() {
  await navigateTo('/reports');
}
async function onSuccess() {
  await navigateTo('/reports');
}
</script>