<template>
  <div class="grid grid-cols-4 gap-0 mt-0">
    <div class="col-span-1 hidden lg:block p-4">
      <UForm class="flex flex-col gap-2 max-w-prose" ref="form" @submit="onSubmit" :state="formState" :schema="reportSchema">
        <SelectRoute :geo="geoLocation" @on-change="(newRoute:RouteResponse) => formState.route = newRoute" />
        <SelectStop :route-id="formState.route?.routeId" :geo="geoLocation" @on-change="(newStop:StopPostResponse) => formState.stop = newStop" />
        <UFormGroup label="Inspectors onboard" name="passenger" help="Enable if inspectors are currently onboard.">
          <UToggle v-model="formState.passenger" />
        </UFormGroup>

        <div class="flex">
          <ClientOnly>
            <geolocate @on-geolocate="(newGeolocation) => geoLocation = newGeolocation">
              <template #help>
                <span>Use your location to narrow the route and stop search to those near you. May be helpful for those who report often. You can always disable this. We do not store your location.</span>
              </template>
            </geolocate>
          </ClientOnly>
          <UButton type="submit" label="Submit" class="ml-auto" @click="submitReport"  :disabled="submitting"/>
        </div>
      </UForm>
    </div>
    <div class="col-span-4 lg:col-span-3">
      <routes-map
        v-if="mapIntegration && mapIntegration.enable"
        :config="mapIntegration.options"
        :route="formState.route ?? null"
        :stop-id="formState.stop?.stopId ?? null"
        :mapHeight="mapHeight"
        :mapWidth="mapWidth"
        show-broadcasts
      />
    </div>
  </div>
  <UButton
    class="shadow-lg fixed bottom-8 right-8 lg:hidden"
    size="xl"
    :ui="{ rounded: 'rounded-full' }"
    icon="i-heroicons-pencil-square"
    to="/report"
  />
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent, Form } from '#ui/types';
import { type RouteResponse, routeSchema } from "../components/select/route.vue";
import { type StopPostResponse, stopPostResponseSchema } from "../components/select/stop.vue";
import type { MapOption, SelectIntegration, Prettify } from '../db/schema';

const toast = useToast();
const initialFormState = { passenger: false };
const formState = ref<Partial<ReportPostSchema>>(initialFormState);
const submitting = ref(false);
const form = ref<Form<ReportPostSchema>>();
const geoLocation = ref<GeolocationPosition>();

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

const mapHeight = computed(() => {
  return 'calc(100vh - 51px)';
});
const mapWidth = computed(() => {
  return '100%';
});
async function onSubmit(event: FormSubmitEvent<ReportPostSchema>) {
  submitting.value = true;
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: event.data
    });
    toast.add({
      color: 'green',
      title: 'Report successful'
    });
    await navigateTo('/thank-you');
  } catch(err:any) {
    toast.add({
      color: 'red',
      title: 'Error submitting report',
      description: err.message
    });
  } finally {
    submitting.value = false;
  }
}
type mapInt = Prettify<Omit<SelectIntegration, 'options'> & {options: MapOption}> | null;
const {data} = await useFetch('/api/integrations/map');
const mapIntegration = data.value as mapInt;

async function submitReport() {
  await form.value?.submit();
}
</script>