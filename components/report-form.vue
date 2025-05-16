<template>
  <UForm class="flex flex-col gap-2 max-w-prose" ref="form" @submit="onSubmit" :state="formState" :schema="reportSchema">
    <SelectAgency @on-change="(newAgency:Agency) => formState.agency = newAgency"/>
    <SelectRoute v-if="formState.agency" :agency="formState.agency" @on-change="(newRoute:Route | undefined) => formState.route = newRoute" />
    <SelectStop  v-if="formState.agency" :route-id="formState.route?.routeId" :geo="geoLocation" @on-change="(newStop:StopPostResponse) => formState.stop = newStop" />
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
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent, Form } from '#ui/types';
import { type Route, routeSchema } from "../components/select/route.vue";
import { type StopPostResponse, stopPostResponseSchema } from "../components/select/stop.vue";
import { agencySchema, type Agency } from "./select/agency.vue";

const toast = useToast();
const submitting = ref(false);
const form = ref<Form<ReportPostSchema>>();
const geoLocation = ref<GeolocationPosition>();

const formState = reactive<Partial<ReportPostSchema>>({passenger: false})

const emit = defineEmits<{
  (e: 'onChange', route: Partial<ReportPostSchema>): void
}>()

watch(formState, (newFormState) => {
  if (newFormState) {
    emit('onChange', newFormState);
  }
});

const reportSchema = z.object({
  agency: agencySchema,
  route: routeSchema,
  stop: stopPostResponseSchema,
  passenger: z.boolean(),
}).required();
export type ReportPostSchema = z.infer<typeof reportSchema>;

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

async function submitReport() {
  await form.value?.submit();
}
</script>