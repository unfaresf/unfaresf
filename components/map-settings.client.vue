<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="mapIntegrationFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormGroup label="Base Map Styles URL" name="options.mapStylesUrl" description="URL (including API key) of base map styles." help="Example: https://api.maptiler.com/maps/basic/style.json?key=abc123">
        <UInput v-model="state.options.mapStylesUrl" :disabled="pendingReq" />
      </UFormGroup>

      <UFormGroup label="Tileserver Server Domain" name="options.tileServerDomain" description="Domain where custom tiles can be loaded for routes and stops." help="Example: https://tiles.unfaresf.org">
        <UInput v-model="state.options.tileServerDomain" :disabled="pendingReq" />
      </UFormGroup>

      <UFormGroup v-if="state.options.mapStylesUrl" label="Default Map Position" description="Adjust this map to how the home page map should be on initial load and when no recent broadcasts exist.">
        <MglMap
          :map-style="state.options.mapStylesUrl"
          v-model:zoom="zoom"
          v-model:center="center"
          height="400px"
          width="100%"
        />
      </UFormGroup>

      <div class="flex">
        <UFormGroup label="Enable" name="enable">
          <UToggle v-model="state.enable" :disabled="pendingReq" />
        </UFormGroup>
        <UButton type="submit" class="ml-auto my-4" icon="i-heroicons-pencil-square" :loading="pendingReq">
          Save
        </UButton>
      </div>
    </UForm>
  </UContainer>
</template>

<script setup lang="ts">
import {
  MglMap,
} from "@indoorequal/vue-maplibre-gl";
import { type SelectIntegration, mapIntegrationOptionSchema } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

const mapIntegrationFormSchema = z.object({
  enable: z.boolean(),
  name: mapIntegrationOptionSchema.shape.type,
  options: mapIntegrationOptionSchema,
});
type MapIntegrationFormData = z.infer<typeof mapIntegrationFormSchema>;

const props = defineProps<{
  integration?: MapIntegrationFormData & {id: SelectIntegration['id']},
}>();

const toast = useToast();
const pendingReq = ref(false);
const state = reactive<MapIntegrationFormData>({
  enable: false,
  name: 'map',
  options: {
    type: 'map',
    mapStylesUrl: undefined,
    tileServerDomain: undefined,
    zoom: undefined,
    center: undefined,
  }
});

const zoom = ref<number>();
const center = ref<{lat:number, lng:number}>();

if (props.integration) {
  state.enable = props.integration.enable;
  state.options.mapStylesUrl = props.integration.options?.mapStylesUrl || undefined;
  state.options.tileServerDomain = props.integration.options?.tileServerDomain || undefined;
  zoom.value = props.integration.options?.zoom || undefined;
  center.value = props.integration.options?.center || undefined;
}

async function updateMapOptions(id:number, formData:MapIntegrationFormData) {
  return $fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    body: formData
  });
}

async function createMapOptions(formData:MapIntegrationFormData) {
  return $fetch(`/api/integrations`, {
    method: 'POST',
    body: formData,
  });
}

async function onSubmit(event: FormSubmitEvent<MapIntegrationFormData>) {
  try {
    pendingReq.value = true;
    if (props.integration?.id) {
      await updateMapOptions(props.integration.id, event.data as MapIntegrationFormData);
    } else {
      await createMapOptions(event.data);
    }
    toast.add({
      color: 'green',
      title: 'Updated map settings',
    });
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: 'Error updating map settings',
      description: err.message
    });
  } finally {
    pendingReq.value = false;
  }
}

watch(() => props.integration, (newIntegration) => {
  if (newIntegration) {
    state.enable = newIntegration.enable;
    state.options.mapStylesUrl = newIntegration.options?.mapStylesUrl || undefined;
    state.options.tileServerDomain = newIntegration.options?.tileServerDomain || undefined;
  }
});

watch(center, (newCenter) => {
  state.options.center = newCenter;
});

watch(zoom, (newZoom) => {
  state.options.zoom = newZoom;
});
</script>

<style lang="scss">
@import "maplibre-gl/dist/maplibre-gl.css";
</style>