<template>
  <UFormGroup
    ref="route-select"
    label="Route"
    name="route"
    description="Route name, e.g. 38 Geary or Bart Green line"
    required
  >
    <USelectMenu
      class="mt-2"
      v-model="route"
      v-on:open="onOpen"
      :loading="loading"
      searchable
      :search-attributes="['searchString']"
      :options="options"
      by="uniqueKey"
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
import { useScrollOnOpen } from "~/composable/scroll";

export const routeSchema = z.object({
  routeId: z.string(),
  routeShortName: z.string(),
  routeLongName: z.string(),
  direction: z.string(),
  directionId: z.number(),
});

export type Route = z.infer<typeof routeSchema>;

type RouteWithSearchString = Route & {
  searchString: string;
  uniqueKey: string;
};
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();

const props = defineProps<{
  agency: Agency;
}>();

const model = defineModel<Route>();

const options = ref<RouteWithSearchString[]>([]);

const route = computed({
  get: () => model.value,
  set: (value: Route | RouteWithSearchString | undefined) => {
    if (value) {
      // Remove searchString and uniqueKey before updating model
      const { searchString, uniqueKey, ...cleanedRoute } = value as RouteWithSearchString;
      model.value = cleanedRoute as Route;
    } else {
      model.value = undefined;
    }
  },
});

const routeSelect = useTemplateRef('route-select');

let onOpen = () => {};
onMounted(() => {
  if (routeSelect.value) {
    onOpen = useScrollOnOpen(routeSelect.value.$el);
  }
});

const agencyId = computed(() => props.agency.agencyId);

const getAgencyRoutes = async ({ agencyId }: { agencyId: string }) => {
  const routes = await $fetch<Route[]>("/api/gtfs/routes", {
    params: {
      agencyId,
    },
  });
  return routes.map((route) => ({
    ...route,
    searchString: `${route.routeShortName} ${route.routeLongName} ${route.direction}`,
    uniqueKey: `${route.routeId}-${route.directionId}`,
  }));
};

onMounted(async () => {
  loading.value = true;
  options.value = await getAgencyRoutes({ agencyId: agencyId.value });
  loading.value = false;
});

watch(agencyId, async (newAgencyId, oldAgencyId) => {
  if (newAgencyId !== oldAgencyId) {
    model.value = undefined;
    loading.value = true;
    options.value = await getAgencyRoutes({ agencyId: agencyId.value });
    loading.value = false;
  }
});
</script>
