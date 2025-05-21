<template>
  <div class="grid grid-cols-8 gap-4 mt-4">
    <UCard class="col-span-8 lg:col-span-5 xs:mt-10 md:mt-0">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>Use this form to report fare inspectors on San Francisco Bay Area public transit.</p>
      </template>
      <UForm class="flex flex-col gap-2 max-w-prose" ref="form" @submit="onSubmit" :state="formState" :schema="reportSchema">
        <SelectRoute :geo="geoLocation" @on-change="(newRoute:RouteResponse) => formState.route = newRoute" />
        <SelectStop :route-id="formState.route?.routeId" :geo="geoLocation" @on-change="(newStop:StopPostResponse) => formState.stop = newStop" />
        <UFormField label="Inspectors onboard" name="passenger" help="Enable if inspectors are currently onboard.">
          <USwitch v-model="formState.passenger" />
        </UFormField>
      </UForm>
      <template #footer>
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
      </template>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent, Form } from '#ui/types';
import { type RouteResponse, routeSchema } from "../components/select/route.vue";
import { type StopPostResponse, stopPostResponseSchema } from "../components/select/stop.vue";

const toast = useToast();
const initialFormState = { passenger: false };
const formState = ref<Partial<ReportPostSchema>>(initialFormState);
const submitting = ref(false);
const form = ref<Form<ReportPostSchema>>();
const geoLocation = ref<GeolocationPosition>();

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

async function submitReport() {
  await form.value?.submit();
}
</script>