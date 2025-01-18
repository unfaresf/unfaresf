<template>
  <UContainer>
    <UCard class="mt-10">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>What service (Muni, BART, etc...), what line, where are they now and which way are they heading.</p>
      </template>
      <UForm class="flex flex-col gap-2 max-w-prose" ref="form" @submit="onSubmit" :state="formState" :schema="reportSchema">
        <SelectRoute @on-change="(newRoute:RoutePost) => formState.route = newRoute" />
        <SelectStop :route-id="formState.route?.routeId" @on-change="(newStop:StopPost) => formState.stop = newStop" />
        <UFormGroup label="Direction" name="direction" help="Cardinal direction of inspectors, e.g. west or south" required>
          <USelectMenu v-model="formState.direction" :options="directionOptions" option-attribute="direction" />
        </UFormGroup>
        <UFormGroup label="Inspectors onboard" name="passenger" help="Enable if inspectors are currently onboard.">
          <UToggle v-model="formState.passenger" />
        </UFormGroup>
        <UButton type="submit" label="Report Sighting" class="ml-auto" :disabled="submitting"/>
      </UForm>
    </UCard>
  </UContainer>
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent, Form} from '#ui/types';
import { type RoutePost, routePostSchema } from "../components/select/route.vue";
import { type StopPost, stopPostSchema } from "../components/select/stop.vue";

const toast = useToast();
const initialFormState = { passenger: false };
const formState = reactive<Partial<ReportPostSchema>>(initialFormState);
const submitting = ref(false);
const directionOptions = ref<DirectionPost[]>([]);
const loadingDirections = ref(false);
const form = ref<Form<ReportPostSchema>>();

const directionPostSchema = z.object({
  routeId: z.string(),
  directionId: z.number().nullable(),
  direction: z.string(),
});
type DirectionPost = z.infer<typeof directionPostSchema>;

const reportSchema = z.object({
  route: routePostSchema,
  stop: stopPostSchema,
  direction: directionPostSchema,
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
      color: 'green',
      title: 'Report successful'
    });
    await navigateTo("/reports");
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

async function getDirections(routeId:string) {
  loadingDirections.value = true;
  try {
    return $fetch<DirectionPost[]>(`/api/gtfs/directions/${routeId}`);
  } finally {
    loadingDirections.value = false;
  }
}

watch(() => formState.route, async newRoute => {
  formState.direction = undefined;
  if (newRoute) {
    const directions = await getDirections(newRoute.routeId);
    directionOptions.value = directions;
  }
});
</script>