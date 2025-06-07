<template>
  <UFormGroup
    label="Stop"
    name="stop"
    description="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission"
    required
  >
    <USelectMenu
      :key="routeId"
      v-model="stop"
      v-model:query="query"
      :debounce="500"
      :searchable="routeId ? true : onSearch"
      searchable-placeholder="Search for a transit stops"
      :search-attributes="['stopName', 'direction']"
      :options="options"
      :loading="loading"
      placeholder="Select a stop"
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom',
      }"
      :clearSearchOnClose="true"
    >
      <template #label>
        <p v-if="stop">{{ stop.stopName }} - {{ stop.direction }}</p>
      </template>
      <template #option="{ option: stop }" :loading="loading">
        <p>{{ stop.stopName }} - {{ stop.direction }}</p>
      </template>
      <template #empty> No stops </template>
    </USelectMenu>
  </UFormGroup>
</template>

<script lang="ts">
import { z } from "zod";
import type { Route } from "./route.vue";
import type { Agency } from "./agency.vue";

export const stopSchema = z.object({
  stopId: z.string(),
  stopName: z.string(),
  direction: z.string(),
  directionId: z.number(),
});
export type Stop = z.infer<typeof stopSchema>;
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();
const stop = ref<Stop | undefined>(undefined);
const query = ref<string>("");
const props = defineProps<{
  agency: Agency;
  route?: Route;
  geo?: GeolocationPosition;
}>();
const emit = defineEmits<{
  (e: "onChange", stop: Stop | undefined): void;
}>();

const agencyId = computed(() => props.agency.agencyId);
const routeId = computed(() => props.route?.routeId);
const directionId = computed(() => props.route?.directionId);

const options = ref<Stop[]>([]);

const getRouteStops = async ({
  routeId,
  directionId,
}: {
  routeId: string;
  directionId?: number;
}) => {
  return $fetch<Stop[]>("/api/gtfs/stops", {
    params: {
      routeId,
      directionId,
    },
  });
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
  return $fetch<Stop[]>("/api/gtfs/stops/search", {
    params: {
      q: query?.trim() || undefined,
      agencyId,
      latitude: geolocation?.coords.latitude,
      longitude: geolocation?.coords.longitude,
    },
  });
};

const onSearch = async (queryString: string) => {
  if (queryString.length || !options.value.length) {
    loading.value = true;
    const stops = await getAgencyStops({
      query: query.value,
      agencyId: agencyId.value,
      geolocation: props.geo,
    });
    loading.value = false;
    options.value = stops;
    if (queryString === " ") {
      query.value = "";
    }
    return stops;
  } else {
    return options.value;
  }
};

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
    stop.value = undefined;
    if (newRouteId) {
      loading.value = true;
      options.value = await getRouteStops({
        routeId: newRouteId,
        directionId: directionId.value,
      });
      loading.value = false;
    } else {
      // this triggers the search but the white space is trimmed later
      query.value = " ";
    }
  }
});

watch(agencyId, async (newAgencyId, oldAgencyId) => {
  if (newAgencyId !== oldAgencyId) {
    stop.value = undefined;
    // this triggers the search but the white space is trimmed later
    query.value = " ";
  }
});
watch(stop, (newStop, oldStop) => {
  if (newStop !== oldStop) {
    emit("onChange", newStop);
  }
});
</script>
