<template>
  <UFormGroup
    label="Route"
    name="route"
    description="Route name, e.g. 38 Geary or Bart Green line"
    required
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
const route = ref<Route | undefined>(undefined);
const props = defineProps<{
  agency: Agency;
}>();
const options = ref<Route[]>([]);
const emit = defineEmits<{
  (e: "onChange", route: Route | undefined): void;
}>();

const agencyId = computed(() => props.agency.agencyId);

const getAgencyRoutes = async ({ agencyId }: { agencyId: string }) => {
  return $fetch<Route[]>("/api/gtfs/routes", {
    params: {
      agencyId,
    },
  });
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
  emit("onChange", newRoute);
});
</script>
