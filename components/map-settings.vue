<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="mapIntegrationsFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormGroup label="Base Map Styles URL" name="options.mapStylesUrl" description="URL (including API key) of base map styles." help="Example: https://api.maptiler.com/maps/basic/style.json?key=abc123">
        <UInput v-model="state.mapStylesUrl" :disabled="pendingReq" />
      </UFormGroup>

      <UFormGroup label="Tileserver Server Domain" name="options.tileServerDomain" description="Domain where custom tiles can be loaded for routes and stops." help="Example: https://tiles.unfaresf.org">
        <UInput v-model="state.tileServerDomain" :disabled="pendingReq" />
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
import type { SelectIntegration, InsertIntegration, MapOptions, Prettify } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import z from 'zod';

const mapIntegrationsFormSchema = z.object({
  enable: z.boolean(),
  options: z.object({
    mapStylesUrl: z.string().url().or(z.literal('')),
    tileServerDomain: z.string().url().or(z.literal('')),
  }),
});
type MapIntegrationFormData = Prettify<{enable: boolean} & MapOptions>;

const props = defineProps<{
  integration?: Prettify<Omit<SelectIntegration, 'options'> & { options: MapOptions}>,
}>();

const toast = useToast();
const pendingReq = ref(false);
const state = reactive<MapIntegrationFormData>({
  enable: false,
    type: 'map',
    mapStylesUrl: undefined,
    tileServerDomain: undefined,

});

if (props.integration) {
  state.enable = props.integration.enable;
  state.mapStylesUrl = props.integration.options?.mapStylesUrl || undefined;
  state.tileServerDomain = props.integration.options?.tileServerDomain || undefined;
}


async function updateMapOptions(id:number, options:MapIntegrationFormData) {
  return $fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    body: options,
  });
}

async function createMapOptions(options:MapIntegrationFormData) {
  return $fetch(`/api/integrations`, {
    method: 'POST',
    body: options,
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
      title: 'Updated mastodon settings',
    });
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: 'Error updating mastodon settings',
      description: err.message
    });
  } finally {
    pendingReq.value = false;
  }
}

watch(() => props.integration, (newIntegration) => {
  if (newIntegration) {
    state.enable = newIntegration.enable;
    state.mapStylesUrl = newIntegration.options?.mapStylesUrl || undefined;
    state.tileServerDomain = newIntegration.options?.tileServerDomain || undefined;
  }
});
</script>