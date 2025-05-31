<template>
  <div class="grid grid-cols-4 gap-0 mt-0">
    <div class="col-span-1 hidden lg:block p-4">
      <UForm class="flex flex-col gap-2 max-w-prose" ref="form" @submit="onSubmit" :state="formState" :schema="reportSchema">
        <SelectRoute :geo="geoLocation" @on-change="(newRoute:RouteResponse) => formState.route = newRoute" />
        <SelectStop :route-id="formState.route?.routeId" :geo="geoLocation" @on-change="(newStop:StopPostResponse) => formState.stop = newStop" />
        <UFormField label="Inspectors onboard" name="passenger" help="Enable if inspectors are currently onboard.">
          <USwitch v-model="formState.passenger" />
        </UFormField>

        <div class="flex mt-4">
          <ClientOnly>
            <geolocate @on-geolocate="(newGeolocation) => geoLocation = newGeolocation">
              <template #help>
                <span>Use your location to narrow the route and stop search to those near you. May be helpful for those who report often. You can always disable this. We do not store your location.</span>
              </template>
            </geolocate>
          </ClientOnly>
          <UButton type="submit" label="Submit" class="ml-auto" @click="submitReport()"  :disabled="submitting"/>
        </div>
      </UForm>
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
        :route="formState.route ?? null"
        :stop-id="formState.stop?.stopId ?? null"
        show-broadcasts
      />
      <div class="flex lg:hidden flex-col items-center h-lvh overflow-y-scroll overscroll-y-contain z-10 snap-y snap-mandatory scrollbar-none">
        <div class="basis-[calc(35dvh)] grow-0 shrink-0 snap-start"></div>
        <div class="basis-[calc(50dvh)] grow-0 shrink-0 snap-start"></div>
        <div
          class="relative w-full bg-neutral-100 dark:bg-neutral-900 z-20 p-4 pb-48 shadow-[0px_0px_25px_-10px_rgba(0,0,0,0.75)] rounded-t-xl before:w-8 before:h-1 before:bg-neutral-200 before:dark:bg-neutral-100 before:rounded before:mx-auto before:block before:-mt-2"
          >
          <UButton
            class="shadow-lg absolute -top-16 right-8 lg:hidden rounded-full"
            size="xl"
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
import { z } from "zod";
import type { FormSubmitEvent, Form } from '#ui/types';
import { type RouteResponse, routeSchema } from "../components/select/route.vue";
import { type StopPostResponse, stopPostResponseSchema } from "../components/select/stop.vue";
import type { MapOptions, SelectIntegration, Prettify } from '../db/schema';
import { formatDistanceToNow } from 'date-fns';

const toast = useToast();
const initialFormState = { passenger: false };
const formState = ref<Partial<ReportPostSchema>>(initialFormState);
const submitting = ref(false);
const form = ref<Form<ReportPostSchema>>();
const geoLocation = ref<GeolocationPosition>();
const { public: {shiftLength} } = useRuntimeConfig();

definePageMeta({
  layout: 'full-screen'
});

useHead({
  title: 'UnfareSF - Report'
});

const reportSchema = z.object({
  route: routeSchema,
  stop: stopPostResponseSchema,
  passenger: z.boolean(),
}).required();
type ReportPostSchema = z.output<typeof reportSchema>;

async function onSubmit(event: FormSubmitEvent<ReportPostSchema>) {
  submitting.value = true;
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: event.data
    });
    toast.add({
      color: 'success',
      title: 'Report successful'
    });
    await navigateTo('/thank-you');
  } catch(err:any) {
    toast.add({
      color: 'error',
      title: 'Error submitting report',
      description: err.message
    });
  } finally {
    submitting.value = false;
  }
}

function getDateMinusNHours(n:number) {
  const now = new Date();
  now.setHours(now.getHours() - n);
  return now;
}

type mapInt = Prettify<Omit<SelectIntegration, 'options'> & {options: MapOptions}> | null;
const { data:mapIntegration } = await useFetch<mapInt>('/api/integrations/map');

const shiftStartTime = getDateMinusNHours(shiftLength);
const { data:broadcasts, status:broadcastsStatus } = await useLazyFetch('/api/broadcasts', {
  server: false,
  query: {
    from: shiftStartTime.toISOString()
  }
});

async function submitReport() {
  await form.value?.submit();
}
</script>