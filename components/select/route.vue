<template>
  <UFormField
    ref="route-select"
    label="Route"
    name="route"
    description="Route name, e.g. 38 Geary or Bart Green line"
    required
  >
    <USelectMenu
      class="mt-2"
      v-model="route"
      @update:open="(open: boolean) => open && onOpen()"
      :loading="loading"
      :filter-fields="['searchString']"
      :items="(options as any)"
      by="uniqueKey"
      label-key="displayLabel"
      placeholder="Find a route"
      trailing
      :content="{ side: isMobile ? 'top' : 'bottom' }"
    >
      <template #default="{ modelValue }">
        <span v-if="modelValue">
          {{ modelValue.routeShortName }}: {{ modelValue.routeLongName }} -
          {{ modelValue.headsign }}
        </span>
      </template>
      <template #empty> No routes </template>
    </USelectMenu>
  </UFormField>
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
  headsign: z.string(),
});

export type Route = z.infer<typeof routeSchema>;

type RouteWithSearchString = Route & {
  searchString: string;
  uniqueKey: string;
  displayLabel: string;
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
      const { searchString, uniqueKey, displayLabel, ...cleanedRoute } = value as RouteWithSearchString;
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
    searchString: `${route.routeShortName} ${route.routeLongName} ${route.headsign}`,
    uniqueKey: `${route.routeId}-${route.directionId}-${route.headsign}`,
    displayLabel: `${route.routeShortName}: ${route.routeLongName} - ${route.headsign}`,
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
