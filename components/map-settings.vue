<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="mapIntegrationFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormField label="Base Map Styles URL" name="options.mapStylesUrl" description="URL (including API key) of base map styles." help="Example: https://api.maptiler.com/maps/basic/style.json?key=abc123">
        <UInput v-model="state.options.mapStylesUrl" :disabled="pendingReq" />
      </UFormField>

      <UFormField label="Tileserver Server Domain" name="options.tileServerDomain" description="Domain where custom tiles can be loaded for routes and stops." help="Example: https://tiles.unfaresf.org">
        <UInput v-model="state.options.tileServerDomain" :disabled="pendingReq" />
      </UFormField>

      <div class="flex">
        <UFormField label="Enable" name="enable">
          <USwitch v-model="state.enable" :disabled="pendingReq" />
        </UFormField>

        <UButton type="submit" class="ml-auto my-4" icon="i-heroicons-pencil-square" :loading="pendingReq">
          Save
        </UButton>
      </div>
    </UForm>
  </UContainer>
</template>

<script setup lang="ts">
import { type SelectIntegration, mapIntegrationOptionSchema } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import {z} from 'zod';

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
  }

});

if (props.integration) {
  state.enable = props.integration.enable;
  state.options.mapStylesUrl = props.integration.options?.mapStylesUrl || undefined;
  state.options.tileServerDomain = props.integration.options?.tileServerDomain || undefined;
}


async function updateMapOptions(id:number, formData:MapIntegrationFormData) {
  return $fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    body: formData,
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
      color: 'success',
      title: 'Updated map settings',
    });
  } catch (err:any) {
    toast.add({
      color: 'error',
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
</script>