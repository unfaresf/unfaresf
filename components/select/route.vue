<template>
  <UFormGroup label="Route" name="route" description="Route name, e.g. 38 Geary or Bart Green line" required>
    <USelectMenu
      v-model="route"
      v-model:query="routeQuery"
      :loading="loading"
      :searchable="search"
      :searchableLazy="true"
      :options="defaultOptions"
      searchable-placeholder="Search for a transit route"
      placeholder="Find a route"
      option-attribute="routeShortName"
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom'
      }"
    >
      <template #label>
        <p v-if="route">{{ route.routeShortName }} <span class="lowercase">{{ route.routeLongName }}</span> - {{ route.direction }}</p>
      </template>
      <template #option="{ option: route }">
        <p><span class="font-bold">{{ route.routeShortName }} <span class="lowercase">{{ route.routeLongName }}</span></span> - {{ route.direction }} <span class="italic lowercase">{{ route.agencyName }}</span></p>
      </template>
      <template #empty>
        No routes
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<script lang="ts">
import { z } from "zod";

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
const loading = ref(false);
const { isMobile } = useDevice();
const route = ref<RouteResponse>();
const routeQuery = ref("");
const defaultOptions = ref([]);
const props = defineProps<{
  geo?: GeolocationPosition,
}>();
const emit = defineEmits<{
  (e: 'onChange', route: RouteResponse): void
}>()

async function search(q:string) {
  try {
    loading.value = true
    return await $fetch<RouteResponse[]>('/api/gtfs/routes/search', {
      params: {
        q,
        latitude: props.geo?.coords.latitude,
        longitude: props.geo?.coords.longitude,
      }
    });
  } catch(err:any) {
    return []
  } finally {
    loading.value = false;
  }
}

watch(() => props.geo, async (newGeo, oldGeo) => {
  defaultOptions.value = await search(routeQuery.value);
}, { once: true });
watch(route, (newRoute) => {
  if (newRoute) {
    emit('onChange', newRoute);
  }
});
</script>