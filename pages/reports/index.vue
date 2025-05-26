<template>
  <div class="grid grid-cols-6 gap-4 mt-4">
    <UCard class="col-span-6 lg:col-span-4 xs:mt-10 md:mt-0">
      <template #header>
        <div class="flex flex-row">
          <div class="basis-3/4">
            <h2 class="text-lg">Reports</h2>
            <p class="text-xs text-neutral-500">Recent reports of cop sightings from various platforms.</p>
          </div>
          <div class="basis-1/4 ml-auto">
            <USelect v-model="reviewed" :items="reviewedStatuses" value-key="value" label-key="name" @change="() => page = 1" class="w-full"/>
          </div>
        </div>
      </template>
      <!-- this client-only is me being lazy about fixing a hydration warning -->
      <client-only>
        <div v-if="unreviewedReports.result.length">
          <ReportCard v-for="report in unreviewedReports.result" :report="report" @change="onChangeToReport" />
        </div>
        <div v-else-if="unreviewedReportsStatus === 'pending'">
          <div class="space-y-2">
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-10/12" />
          </div>
        </div>
        <div v-else>
          <p>No recent reports</p>
        </div>
        <template v-if="unreviewedReports.count > limit" #footer>
          <UPagination
            v-model="page"
            :page-count="limit"
            :total="unreviewedReports.count"
            class="justify-center"
          />
        </template>
      </client-only>
    </UCard>
    <UCard class="col-span-6 lg:col-span-2 xs:mt-10 md:mt-0">
      <template #header>
        <h2 class="text-lg">Recent Broadcasts</h2>
        <p class="text-xs text-neutral-500">Check recent broadcasts to avoid duplicate messages.</p>
      </template>
      <div>
        <ol v-if="broadcasts && broadcasts.result.length">
          <li v-for="broadcast in broadcasts.result" class="border-gray-200 dark:border-gray-800 w-full border-b border-solid pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
            {{ broadcast.message }}
            <span class="text-xs italic">{{ formatDistanceToNow(broadcast.createdAt) }} ago</span>
          </li>
        </ol>
        <ol v-else>
          <li>No recent broadcasts</li>
        </ol>
      </div>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import { type SelectReport } from '../../db/schema';
import ReportCard from '~/components/report-card.vue';
import { sub, formatDistanceToNow } from 'date-fns';
const { $pwa } = useNuxtApp();

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'UnfareSF'
});

const reviewedStatuses = [{
  name: 'Old',
  value: 'true'
}, {
  name: 'New',
  value: 'false'
}];
const reviewed = ref(reviewedStatuses[1].value);
const limit = ref(10);
const page = ref(1);
const toast = useToast();

type ReportsGetResp = {
  count: number,
  result: SelectReport[]
}

const { data: unreviewedReports, refresh: refreshReports, status: unreviewedReportsStatus } = await useLazyFetch<ReportsGetResp>("/api/reports", {
  server: false,
  query: { page: page, limit: limit, reviewed: reviewed },
  default: () => ({count: 0, result: []}),
  watch: [reviewed, page],
  onResponseError({ response }) {
    toast.add({
      color: 'error',
      title: response.statusText
    });
  }
});

const { data: broadcasts, refresh: refreshBroadcasts } = await useLazyFetch(`/api/broadcasts`, {
  server: false,
  query: {
    from: sub(new Date(), {hours: 12}).toISOString(),
  },
});

async function onChangeToReport(report: SelectReport|undefined) {
  if (report) {
    await Promise.all([
      refreshReports(),
      refreshBroadcasts()
    ]);
  }
}

if (import.meta.client) {
  try {
    const registration = $pwa.registration;
    if (registration.value) {
      const notifications = await registration.value.getNotifications({ tag: 'new-report' });
      notifications.forEach(notification => notification.close());
      await navigator.clearAppBadge();
    }
  } catch (err) {
    console.debug('Error attempting to close notifications', err);
  }
}
</script>