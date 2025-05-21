<template>
  <UFormField label="Route" name="route" description="Route name, e.g. 38 Geary or Bart Green line" required>
    <USelectMenu
      v-model="route"
      v-model:search-term="routeQuery"
      :loading="loading"
      :searchableLazy="true"
      :items="routes"
      searchable-placeholder="Search for a transit route"
      placeholder="Find a route"
      ignore-filter
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom'
      }"
      class="w-full"
      @update:modelValue="newRoute => emit('onChange', newRoute)"
    >
      <template #default="{ modelValue:selectedRoute }">
        <p v-if="selectedRoute">{{ selectedRoute.routeShortName }} <span class="lowercase">{{ selectedRoute.routeLongName }}</span> - {{ selectedRoute.direction }}</p>
      </template>

      <template #item="{ item: optionalRoute }">
        <p><span class="font-bold">{{ optionalRoute.routeShortName }} <span class="lowercase">{{ optionalRoute.routeLongName }}</span></span> - {{ optionalRoute.direction }} <span class="italic lowercase">{{ optionalRoute.agencyName }}</span></p>
      </template>

      <template #empty>
        No routes
      </template>
    </USelectMenu>
  </UFormField>
</template>

<script lang="ts">
import { z } from "zod";
import { refDebounced } from '@vueuse/core'

export const routeSchema = z.object({
  routeId: z.string(),
  routeShortName: z.string(),
  routeLongName: z.string(),
  agencyId: z.string(),
  agencyName: z.string(),
  direction: z.string(),
});

export type RouteResponse = z.infer<typeof routeSchema>;
</script>

<script setup lang="ts">
const { isMobile } = useDevice();
const routeQuery = ref("");
const route = ref<RouteResponse>();
const props = defineProps<{
  geo?: GeolocationPosition,
}>();
const emit = defineEmits<{
  (e: 'onChange', route: RouteResponse): void
}>()
const searchTermDebounced = refDebounced(routeQuery, 200);

const { data: routes, status } = await useFetch<RouteResponse[]>('/api/gtfs/routes/search', {
  params: {
    q: searchTermDebounced,
    latitude: props.geo?.coords.latitude,
    longitude: props.geo?.coords.longitude,
   },
  lazy: true,
  default: () => []
});
const loading = computed(() => status.value === 'pending');
</script>