<template>
  <UFormGroup label="Stop" name="stop" help="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission" required>
    <USelectMenu
      v-model="stop"
      v-model:query="query"
      searchable
      :options="stopOptions"
      :loading="loading"
      searchable-placeholder="Search for a transit stops"
      placeholder="Select a stop"
      option-attribute="stopName"
      by="stopId"
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom'
      }"
    >
      <template #label>
        <p v-if="stop">{{ stop.stopName }}</p>
      </template>
      <template #option="{ option: stop }" :loading="loading">
        <p>{{ stop.stopName }}</p>
      </template>
      <template #empty>
        No stops
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<script lang="ts">
import { z } from "zod";

export const stopPostSchema = z.object({
  stopId: z.string(),
  stopCode: z.string(),
  stopName: z.string(),
  stopLat: z.string({coerce: true}),
  stopLon: z.string({coerce: true}),
});
export type StopPost = z.infer<typeof stopPostSchema>;
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();
const stopOptions = ref<StopPost[]>([]);
const stop = ref<StopPost>();
const query = ref<string>();
const props = defineProps<{
  routeId: string|undefined,
}>();
const routeId = ref(props.routeId);
const emit = defineEmits<{
  (e: 'onChange', stop: StopPost): void
}>()

async function searchStops(q?:string) {
  // if (!props.routeId) return [];
  try {
    loading.value = true
    return $fetch<StopPost[]>('/api/gtfs/stops/search', {
      params: {
        q,
        routeId: props.routeId
      }
    });
  } finally {
    loading.value = false;
  }
}

watch(() => props.routeId, async (newRouteId) => {
  if (newRouteId) {
    loading.value = true;
    routeId.value = newRouteId;
    stop.value = undefined;
    query.value = undefined;
    try {
      stopOptions.value = await searchStops();
    } finally {
      loading.value = false;
    }
  }
});
watch(stop, (newStop) => {
  if (newStop) {
    emit('onChange', newStop);
  }
});
</script>