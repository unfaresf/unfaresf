<template>
  <UFormGroup
    label="Route"
    name="route"
    description="Route name, e.g. 38 Geary or Bart Green line"
  >
    <USelectMenu
      v-model="route"
      :loading="loading"
      searchable
      :search-attributes="['routeShortName', 'routeLongName']"
      :options="options"
      placeholder="Find a route"
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom',
      }"
    >
      <template #label>
        <p v-if="route">
          {{ route.routeShortName }}: {{ route.routeLongName }} -
          {{ route.direction }}
        </p>
      </template>
      <template #option="{ option: route }">
        <p>
          {{ route.routeShortName }}: {{ route.routeLongName }} -
          {{ route.direction }}
        </p>
      </template>
      <template #empty> No routes </template>
    </USelectMenu>
  </UFormGroup>
</template>

<script lang="ts">
import { z } from "zod";
import type { Agency } from "./agency.vue";
import { computedAsync } from "@vueuse/core";

export const routeSchema = z.object({
  routeId: z.string(),
  routeShortName: z.string(),
  routeLongName: z.string(),
  direction: z.string(),
  directionId: z.number(),
});

export type Route = z.infer<typeof routeSchema>;
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();
<<<<<<< HEAD
const route = ref<RouteResponse>();
const routeQuery = ref("");
const defaultOptions = ref<RouteResponse[]>([]);
=======
const route = ref<Route | undefined>(undefined);
>>>>>>> 9937810 (make routes respond to agency selection)
const props = defineProps<{
  agency: Agency;
}>();
const emit = defineEmits<{
  (e: "onChange", route: Route | undefined): void;
}>();

const agencyId = computed(() => props.agency.agencyId);

watch(agencyId, (newAgencyId, oldAgencyId) => {
  if (newAgencyId !== oldAgencyId) {
    route.value = undefined;
  }
});

const options = computedAsync(
  async () =>
    await $fetch<Route[]>("/api/gtfs/routes", {
      params: {
        agencyId: agencyId.value,
      },
    }),
  []
);

watch(route, (newRoute) => {
  emit("onChange", newRoute);
});
</script>
