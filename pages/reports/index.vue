<template>
  <div class="grid grid-cols-6 gap-4 mt-4">
    <UCard class="col-span-6 lg:col-span-4 xs:mt-10 md:mt-0">
      <template #header>
        <div class="flex flex-row">
          <div class="basis-3/4">
            <h2 class="text-lg">Reports</h2>
            <p class="text-xs text-gray-500">Recent reports of cop sightings from various platforms.</p>
          </div>
          <div class="basis-1/4 ml-auto">
            <USelect v-model="reviewed" :options="reviewedStatuses" option-attribute="name"/>
          </div>
        </div>
      </template>
      <div v-if="unreviewedReports.result && unreviewedReports.result.length">
        <ReportCard v-for="report in unreviewedReports.result" :report="report" @onApprove="openPostModel" @onDismiss="dismiss"/>
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
    </UCard>
    <UCard class="col-span-6 lg:col-span-2 xs:mt-10 md:mt-0">
      <template #header>
        <h2 class="text-lg">Recent Broadcasts</h2>
        <p class="text-xs text-gray-500">Check recent broadcasts to avoid duplicate messages.</p>
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
import { PostModal } from '#components';
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
const disabledRows = ref(new Set);
const modal = useModal();
const toast = useToast();

async function dismiss(row:SelectReport) {
  try {
    disabledRows.value.add(row.id);
    await $fetch(`/api/reports/${row.id}`, {
      method: 'PUT',
      body: {
        approved: false
      }
    });
    await refreshReports();
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: err.data?.message || err.message,
    });
  } finally {
    disabledRows.value.delete(row.id);
  }
}

async function openPostModel(row:SelectReport) {
  modal.open(PostModal, {
    report: row,
    async onClose() {
      return modal.close();
    },
    async onSuccess() {
      return Promise.all([
        refreshReports(),
        refreshBroadcasts(),
        modal.close(),
      ]);
    },
  });
}

type ReportsGetResp = {
  count: number,
  result: SelectReport[]
}
const { data:unreviewedReports, refresh: refreshReports } = await useLazyFetch<ReportsGetResp>("/api/reports", {
  server: false,
  query: { page: page, limit: limit, reviewed: reviewed },
  default: () => ({count: 0, result: []}),
  watch: [reviewed, page],
  onResponseError({ response }) {
    toast.add({
      color: 'red',
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

watch(broadcasts, newBroadcasts => {
  if (newBroadcasts) {
    broadcasts.value = newBroadcasts;
  }
}, {once: true});
watch(reviewed, () => {
  page.value = 1;
});

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