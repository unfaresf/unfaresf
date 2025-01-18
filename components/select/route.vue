<template>
  <UFormGroup label="Route" name="route" help="Route name, e.g. 38 Geary or Bart Green line" required>
    <USelectMenu
      v-model="route"
      :loading="loading"
      :searchable="search"
      :searchableLazy="true"
      searchable-placeholder="Search for a transit route"
      placeholder="Select a route"
      option-attribute="routeShortName"
      by="routeId"
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom'
      }"
    >
      <template #label>
        <p v-if="route">{{ route.routeShortName }} - <span class="lowercase">{{ route.routeLongName }}</span></p>
      </template>
      <template #option="{ option: route }">
        <p>{{ route.routeShortName }} - <span class="lowercase font-bold">{{ route.routeLongName }}</span> <span class="italic lowercase">{{ route.agencyName }}</span></p>
      </template>
      <template #empty>
        No routes
      </template>
    </USelectMenu>
  </UFormGroup>
</template>

<script lang="ts">
import { z } from "zod";

export const routePostSchema = z.object({
  routeId: z.string(),
  routeShortName: z.string(),
  routeLongName: z.string(),
  agencyId: z.string(),
  agencyName: z.string()
});
export type RoutePost = z.infer<typeof routePostSchema>;
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();
const route = ref<RoutePost>();
const emit = defineEmits<{
  (e: 'onChange', route: RoutePost): void
}>()

async function search(q:string) {
  if (!q.length) return [];
  try {
    loading.value = true
    return $fetch<RoutePost[]>('/api/gtfs/routes/search', { params: { q } });
  } catch(err:any) {
    return []
  } finally {
    loading.value = false;
  }
}

watch(route, (newRoute) => {
  if (newRoute) {
    emit('onChange', newRoute);
  }
});
</script>