<template>
  <UFormGroup
    label="Stop"
    name="stop"
    description="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission"
    required
  >
    <USelectMenu
      v-model="stop"
      v-model:query="query"
      searchable
      :options="options"
      :loading="loading"
      searchable-placeholder="Search for a transit stops"
      placeholder="Select a stop"
      option-attribute="stopName"
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
import { computedAsync } from "@vueuse/core";
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
  (e: "onChange", stop: Stop): void;
}>();

const agencyId = computed(() => props.agency.agencyId);
const routeId = computed(() => props.route?.routeId);
const directionId = computed(() => props.route?.directionId);

const options = computedAsync(async () => {
  if (routeId.value) {
    return $fetch<Stop[]>("/api/gtfs/stops", {
      params: {
        routeId: routeId.value,
        directionId: directionId.value,
      },
    });
  } else {
    const {
      data: { value: stops },
    } = await useFetch<Stop[]>("/api/gtfs/stops/search", {
      params: {
        q: query.value.trim() || undefined,
        agencyId,
        latitude: props.geo?.coords.latitude,
        longitude: props.geo?.coords.longitude,
      },
    });
    return stops ?? [];
  }
}, []);

watch(routeId, async (newRouteId, oldRouteId) => {
  if (newRouteId !== oldRouteId) {
    stop.value = undefined;
    // this is a hack because you cant manually set options on a searchable USelectMenu
    // this triggers the search but the white space is trimmed later
    query.value = "";
  }
});

watch(agencyId, async (newAgencyId, oldAgencyId) => {
  if (newAgencyId !== oldAgencyId) {
    stop.value = undefined;
    // this is a hack because you cant manually set options on a searchable USelectMenu
    // this triggers the search but the white space is trimmed later
    query.value = "";
  }
});
watch(stop, (newStop) => {
  if (newStop) {
    emit("onChange", newStop);
  }
});
</script>
