<template>
  <div class="grid grid-cols-4 gap-0 mt-0">
    <div class="col-span-1 hidden lg:block p-4">
      <ReportForm @on-change="(newFormState:Partial<ReportPostSchema>) => reportFormState = newFormState"/>
      <div class="mt-8">
        <h2 class="text-lg">Recent Sightings</h2>
        <ol v-if="broadcasts && broadcasts.result.length">
          <li v-for="broadcast in broadcasts.result" class="border-gray-200 dark:border-gray-800 w-full border-b border-solid pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
            {{ broadcast.message }}
            <span class="text-xs italic">{{ formatDistanceToNow(broadcast.createdAt) }} ago</span>
          </li>
        </ol>
        <ol v-else>
          <li>No recent sighting</li>
        </ol>
      </div>
    </div>
    <div class="col-span-4 lg:col-span-3 h-full overflow-hidden">
      <routes-map
        v-if="mapIntegration && mapIntegration.enable"
        :config="mapIntegration.options"
        :route="reportFormState.route ?? null"
        :stop-id="reportFormState.stop?.stopId ?? null"
        show-broadcasts
      />
      <div class="flex lg:hidden flex-col items-center h-lvh overflow-y-scroll overscroll-y-contain z-10 snap-y snap-mandatory scrollbar-none">
        <div class="basis-[calc(35dvh)] grow-0 shrink-0 snap-start"></div>
        <div class="basis-[calc(50dvh)] grow-0 shrink-0 snap-start"></div>
        <div
          class="relative w-full bg-gray-100 dark:bg-gray-900 z-20 p-4 pb-48 shadow-[0px_0px_25px_-10px_rgba(0,0,0,0.75)] rounded-t-xl before:w-8 before:h-1 before:bg-gray-200 before:dark:bg-gray-100 before:rounded before:mx-auto before:block before:-mt-2"
          >
          <UButton
            class="shadow-lg absolute -top-16 right-8 lg:hidden"
            size="xl"
            :ui="{ rounded: 'rounded-full' }"
            icon="i-heroicons-pencil-square"
            to="/report"
          />
          <ol v-if="broadcasts && broadcasts.result.length">
            <li v-for="broadcast in broadcasts.result" class="border-gray-200 dark:border-gray-800 w-full border-b border-solid pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0 snap-start scroll-mt-6">
              {{ broadcast.message }}
              <span class="text-xs italic">{{ formatDistanceToNow(broadcast.createdAt) }} ago</span>
            </li>
          </ol>
          <ol v-else class="snap-start scroll-mt-4">
            <li v-if="broadcastsStatus === 'success' || broadcastsStatus === 'error'">No recent sighting</li>
            <li v-else>Loading recent sighting...</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
}
</style>

<script lang="ts" setup>
import type { ReportPostSchema } from '~/components/report-form.vue';
import type { MapOptions, SelectIntegration, Prettify } from '../db/schema';
import { formatDistanceToNow } from 'date-fns';

definePageMeta({
  layout: 'full-screen'
});

useHead({
  title: 'UnfareSF - Report'
});

const { public: {shiftLength} } = useRuntimeConfig();

function getDateMinusNHours(n:number) {
  const now = new Date();
  now.setHours(now.getHours() - n);
  return now;
}

const reportFormState = ref<Partial<ReportPostSchema>>({ passenger: false })

type mapInt = Prettify<Omit<SelectIntegration, 'options'> & {options: MapOptions}> | null;
const { data:mapIntegration } = await useFetch<mapInt>('/api/integrations/map');

const shiftStartTime = getDateMinusNHours(shiftLength);
const { data:broadcasts, status:broadcastsStatus } = await useLazyFetch('/api/broadcasts', {
  server: false,
  query: {
    from: shiftStartTime.toISOString()
  }
});

</script>