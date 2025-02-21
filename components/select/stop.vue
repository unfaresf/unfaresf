<template>
  <UFormGroup label="Stop" name="stop" description="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission" help="Select a route first" required>
    <USelectMenu
      v-model="stop"
      v-model:query="query"
      :searchable="searchStops"
      :options="stopOptions"
      :loading="loading"
      searchable-placeholder="Search for a transit stops"
      placeholder="Select a stop"
      option-attribute="stopName"
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom'
      }"
      :disabled="disable"
    >
      <template #label>
        <p v-if="stop">{{ stop.stopName }}</p>
      </template>
      <template #option="{ option: stop }" :loading="loading">
        <p>{{ stop.stopName }} - {{ stop.direction }}</p>
      </template>
      <template #empty>
        No stops
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<script lang="ts">
import { z } from "zod";

export const stopPostResponseSchema = z.object({
  stopId: z.string(),
  stopName: z.string(),
  direction: z.string(),
});
export type StopPostResponse = z.infer<typeof stopPostResponseSchema>;
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();
const stopOptions = ref<StopPostResponse[]>([]);
const stop = ref<StopPostResponse>();
const query = ref<string>();
const props = defineProps<{
  routeId: string|undefined,
  geo: GeolocationPosition|undefined,
}>();
const routeId = ref(props.routeId);
const emit = defineEmits<{
  (e: 'onChange', stop: StopPostResponse): void
}>()
const disable = computed(() => !props.routeId);

async function searchStops(q?:string) {
  try {
    loading.value = true;
    return await $fetch<StopPostResponse[]>('/api/gtfs/stops/search', {
      params: {
        q,
        routeId: props.routeId,
        latitude: props.geo?.coords.latitude,
        longitude: props.geo?.coords.longitude,
      }
    });
  } finally {
    loading.value = false;
  }
}

watch(() => props.routeId, async (newRouteId) => {
  if (newRouteId) {
    routeId.value = newRouteId;
    stop.value = undefined;
    query.value = undefined;
    stopOptions.value = await searchStops();
  }
});
watch(stop, (newStop) => {
  if (newStop) {
    emit('onChange', newStop);
  }
});
</script>