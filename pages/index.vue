<template>
  <UContainer>
    <UCard class="mt-10">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>What service (Muni, BART, etc...), what line, where are they now and which way are they heading.</p>
      </template>
      <UForm class="flex flex-col gap-2 max-w-prose" ref="form" @submit="onSubmit" :state="formState" :schema="reportSchema">
        <UFormGroup label="Route" name="route" help="Route name, e.g. 38 Geary or Bart Green line" required>
          <USelectMenu
            v-model="formState.route"
            :loading="loadingRoutes"
            :searchable="searchRoutes"
            :searchableLazy="true"
            searchable-placeholder="Search for a transit route"
            placeholder="Select a route"
            option-attribute="routeShortName"
            by="routeId"
            trailing
            :popper="{
              placement: isMobile ? 'top' : 'bottom'
            }"
          >
            <template #label>
              <p v-if="formState.route">{{ formState.route.routeShortName }} - <span class="lowercase">{{ formState.route.routeLongName }}</span></p>
            </template>
            <template #option="{ option: route }">
              <p>{{ route.routeShortName }} - <span class="lowercase font-bold">{{ route.routeLongName }}</span> <span class="italic lowercase">{{ route.agencyName }}</span></p>
            </template>
            <template #empty>
              No routes
            </template>
          </USelectMenu>
        </UFormGroup>
        <UFormGroup label="Stop" name="stop" help="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission" required>
          <USelectMenu
            v-model="formState.stop"
            searchable
            :options="stopOptions"
            :loading="loadingStops"
            searchable-placeholder="Search for a transit stops"
            placeholder="Select a stop"
            option-attribute="stopName"
            by="stopId"
            trailing
            :popper="{
              placement: isMobile ? 'top' : 'bottom'
            }"
          >
            <template #label>
              <p v-if="formState.stop">{{ formState.stop.stopName }}</p>
            </template>
            <template #option="{ option: stop }" :loading="loadingDirections">
              <p>{{ stop.stopName }}</p>
            </template>
            <template #empty>
              No stops
            </template>
          </USelectMenu>
        </UFormGroup>
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

const { isMobile } = useDevice();
const toast = useToast();
const initialFormState = { passenger: false };
const formState = reactive<Partial<ReportPostSchema>>(initialFormState);
const submitting = ref(false);
const loadingRoutes = ref(false);
const loadingStops = ref(false);
const loadingDirections = ref(false);
const stopOptions = ref<StopPost[]>([]);
const directionOptions = ref<DirectionPost[]>([]);
const form = ref<Form<ReportPostSchema>>();

const routePostSchema = z.object({
  routeId: z.string(),
  routeShortName: z.string(),
  routeLongName: z.string(),
  agencyId: z.string(),
  agencyName: z.string()
});
type RoutePost = z.infer<typeof routePostSchema>;

const stopPostSchema = z.object({
  stopId: z.string(),
  stopCode: z.string(),
  stopName: z.string(),
  stopLat: z.string({coerce: true}),
  stopLon: z.string({coerce: true}),
});
type StopPost = z.infer<typeof stopPostSchema>;

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

async function searchRoutes(q:string) {
  if (!q.length) return [];
  try {
    loadingRoutes.value = true
    return $fetch<RoutePost[]>('/api/gtfs/routes/search', { params: { q } });
  } catch(err:any) {
    return []
  } finally {
    loadingRoutes.value = false;
  }
}

async function searchStops(q?:string) {
  if (!formState.route?.routeId) return [];
  try {
    loadingStops.value = true
    return $fetch<StopPost[]>('/api/gtfs/stops/search', {
      params: {
        q,
        routeId: formState.route?.routeId
      }
    });
  } finally {
    loadingStops.value = false;
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
  if (newRoute) {
    const [stops, directions] = await Promise.all([
      searchStops(),
      getDirections(newRoute.routeId)
    ]);
    stopOptions.value = stops
    directionOptions.value = directions;
  }
});
</script>