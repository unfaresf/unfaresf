<template>
  <UFormField
    ref="stop-select"
    label="Stop"
    name="stop"
    description="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission"
    required
  >
    <USelectMenu
      class="mt-2"
      :key="routeId"
      v-model="stop"
      v-model:search-term="query"
      @update:open="(open: boolean) => open && onOpen()"
      :ignore-filter="!routeId"
      :filter-fields="['stopName', 'direction']"
      :search-input="{ placeholder: 'Search for a transit stops' }"
      :items="(options as any)"
      by="stopId"
      label-key="displayLabel"
      :loading="loading"
      placeholder="Select a stop"
      trailing
      :content="{
        side: isMobile ? 'top' : 'bottom',
      }"
    >
      <template #default="{ modelValue }">
        <span v-if="modelValue">{{ modelValue.stopName }} - {{ modelValue.direction }}</span>
      </template>
      <template #empty> No stops </template>
    </USelectMenu>
  </UFormField>
</template>

<script lang="ts">
import { z } from "zod";
import type { Route } from "./route.vue";
import type { Agency } from "./agency.vue";
import { useScrollOnOpen } from "~/composable/scroll";

export const stopSchema = z.object({
  stopId: z.string(),
  stopName: z.string(),
  direction: z.string(),
  directionId: z.number(),
});
export type Stop = z.infer<typeof stopSchema>;
</script>

<script setup lang="ts">
import { watchDebounced } from "@vueuse/core";

type StopOption = Stop & { displayLabel: string };
const withLabel = (s: Stop): StopOption => ({
  ...s,
  displayLabel: `${s.stopName} - ${s.direction}`,
});

const loading = ref(false);
const { isMobile } = useDevice();
const model = defineModel<Stop>();
// The SelectMenu items carry a `displayLabel` used by `label-key`; strip it back
// off the selected value so the model (and the submitted report body) stays a
// clean Stop, mirroring the v2 behavior.
const stop = computed<Stop | StopOption | undefined>({
  get: () => model.value,
  set: (value) => {
    if (value) {
      const { displayLabel, ...cleaned } = value as StopOption;
      model.value = cleaned as Stop;
    } else {
      model.value = undefined;
    }
  },
});
const query = ref<string>("");
const props = defineProps<{
  agency: Agency;
  route?: Route;
  geo?: GeolocationPosition;
}>();

const stopSelect = useTemplateRef('stop-select');

let onOpen = () => {};
onMounted(() => {
  if (stopSelect.value) {
    onOpen = useScrollOnOpen(stopSelect.value.$el);
  }
});

const agencyId = computed(() => props.agency.agencyId);
const routeId = computed(() => props.route?.routeId);
const directionId = computed(() => props.route?.directionId);

const options = ref<StopOption[]>([]);

const getRouteStops = async ({
  routeId,
  directionId,
}: {
  routeId: string;
  directionId?: number;
}) => {
  const stops = await $fetch<Stop[]>("/api/gtfs/stops", {
    params: {
      routeId,
      directionId,
    },
  });
  return stops.map(withLabel);
};

const getAgencyStops = async ({
  agencyId,
  query,
  geolocation,
}: {
  agencyId: string;
  query?: string;
  geolocation?: GeolocationPosition;
}) => {
  const stops = await $fetch<Stop[]>("/api/gtfs/stops/search", {
    params: {
      q: query?.trim() || undefined,
      agencyId,
      latitude: geolocation?.coords.latitude,
      longitude: geolocation?.coords.longitude,
    },
  });
  return stops.map(withLabel);
};

// With no route selected, stops are searched agency-wide on the server as the
// user types (debounced, `:ignore-filter` on). With a route selected, stops come
// from the route and the SelectMenu filters them client-side.
async function searchAgencyStops() {
  loading.value = true;
  options.value = await getAgencyStops({
    query: query.value,
    agencyId: agencyId.value,
    geolocation: props.geo,
  });
  loading.value = false;
}

watchDebounced(
  query,
  () => {
    if (!routeId.value) searchAgencyStops();
  },
  { debounce: 500 }
);

onMounted(async () => {
  loading.value = true;
  options.value = routeId.value
    ? await getRouteStops({
        routeId: routeId.value,
        directionId: directionId.value,
      })
    : [];
  loading.value = false;
});

watch(routeId, async (newRouteId, oldRouteId) => {
  if (newRouteId !== oldRouteId) {
    model.value = undefined;
    if (newRouteId) {
      loading.value = true;
      options.value = await getRouteStops({
        routeId: newRouteId,
        directionId: directionId.value,
      });
      loading.value = false;
    } else {
      await searchAgencyStops();
    }
  }
});

watch(agencyId, async (newAgencyId, oldAgencyId) => {
  if (newAgencyId !== oldAgencyId) {
    model.value = undefined;
    if (!routeId.value) await searchAgencyStops();
  }
});
</script>
