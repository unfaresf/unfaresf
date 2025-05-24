<template>
  <UFormField label="Stop" name="stop" description="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission" help="Select a route first" required>
    <USelectMenu
      v-model="stop"
      v-model:search-term="stopQuery"
      :items="stops"
      :loading="loading"
      searchable-placeholder="Search for a transit stops"
      placeholder="Select a stop"
      trailing
      ignore-filter
      :content="{
        side: isMobile ? 'top' : 'bottom',
      }"
      :disabled="disable"
      :clearSearchOnClose="true"
      class="w-full"
      @update:modelValue="newStop => emit('onChange', newStop)"
    >
      <template #default="{ modelValue:selectedStop }">
        <p v-if="selectedStop">{{ selectedStop.stopName }}</p>
      </template>

      <template #item="{ item: optionalStop }">
        <p>{{ optionalStop.stopName }} - {{ optionalStop.direction }}</p>
      </template>

      <template #empty>
        No stops
      </template>
    </USelectMenu>
  </UFormField>
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
import { refDebounced } from '@vueuse/core';

const props = defineProps<{
  routeId?: string,
  geo?: GeolocationPosition,
}>();

const emit = defineEmits<{
  (e: 'onChange', stop: StopPostResponse): void
}>();

const { isMobile } = useDevice();
const stop = ref<StopPostResponse>();
const stopQuery = ref<string>('');
const searchTermDebounced = refDebounced(stopQuery, 200);
const disable = computed(() => !props.routeId);
const stopsParams = computed(() => {
  return {
    q: searchTermDebounced.value,
    routeId: props.routeId,
    latitude: props.geo?.coords.latitude,
    longitude: props.geo?.coords.longitude,
  }
});

const { data: stops, status } = await useAsyncData(() => {
  if (props.routeId) {
    return $fetch<StopPostResponse[]>('/api/gtfs/stops/search', {
      params: stopsParams.value,
    });
  } else {
    return Promise.resolve([]);
  }
}, {
  lazy: true,
  immediate: false,
  default: () => [],
  watch: [stopsParams]
});
const loading = computed(() => status.value === 'pending');

watch(() => props.routeId, async (newRouteId) => {
  if (newRouteId) {
    stop.value = undefined;
    // this is a hack because you cant manually set options on a searchable USelectMenu
    // this triggers the search but the white space is trimmed later
    stopQuery.value = '';
  }
});
</script>