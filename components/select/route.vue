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
};
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();
const route = ref<RouteWithSearchString | undefined>(undefined);
const props = defineProps<{
  agency: Agency;
}>();
const options = ref<RouteWithSearchString[]>([]);
const emit = defineEmits<{
  (e: "onChange", route: Route | undefined): void;
}>();

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
  }));
};

onMounted(async () => {
  loading.value = true;
  options.value = await getAgencyRoutes({ agencyId: agencyId.value });
  loading.value = false;
});

watch(agencyId, async (newAgencyId, oldAgencyId) => {
  if (newAgencyId !== oldAgencyId) {
    route.value = undefined;
    loading.value = true;
    options.value = await getAgencyRoutes({ agencyId: agencyId.value });
    loading.value = false;
  }
});

watch(route, (newRoute) => {
  if (newRoute) {
    const { searchString, ...cleanedRoute } = newRoute;
    emit("onChange", cleanedRoute);
  } else {
    emit("onChange", newRoute);
  }
});
</script>
