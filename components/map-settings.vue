<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="mapIntegrationsFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormGroup label="Base Map Styles URL" name="options.mapStylesUrl" description="URL (including API key) of base map styles." help="Example: https://api.maptiler.com/maps/basic/style.json?key=abc123">
        <UInput v-model="state.options.mapStylesUrl" :disabled="pendingReq" />
      </UFormGroup>

      <UFormGroup label="Tileserver Server Domain" name="options.tileServerDomain" description="Domain where custom tiles can be loaded for routes and stops." help="Example: https://tiles.unfaresf.org">
        <UInput v-model="state.options.tileServerDomain" :disabled="pendingReq" />
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
import type { SelectIntegration, InsertIntegration, MapOption, Prettify } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import z from 'zod';

const mapIntegrationsFormSchema = z.object({
  enable: z.boolean(),
  options: z.object({
    mapStylesUrl: z.string().url().or(z.literal('')),
    tileServerDomain: z.string().url().or(z.literal('')),
  }),
});
type updateMapIntegration = Prettify<Omit<SelectIntegration, 'options'> & {name: 'map', options?: MapOption}>;

const props = defineProps<{
  integration?: updateMapIntegration,
}>();

const toast = useToast();
const pendingReq = ref(false);
const state = reactive({
  id: props.integration?.id ?? -1,
  enable: props.integration?.enable ?? false,
  name: 'map',
  options: {
    mapStylesUrl: props.integration?.options?.mapStylesUrl ?? '',
    tileServerDomain: props.integration?.options?.tileServerDomain ?? '',
  }
});

async function updateIntegrationsOptions(id:number, integration:updateMapIntegration) {
  const body = {...integration};
  body.name = 'map';
  if (integration.options && integration.options.mapStylesUrl === '') {
    delete body.options?.mapStylesUrl;
  }
  if (integration.options && integration.options.tileServerDomain === '') {
    delete body.options?.tileServerDomain;
  }
  return $fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    body,
  });
}

async function createIntegrationsOptions(integration:InsertIntegration) {
  const body = {...integration};
  body.name = 'map';
  return $fetch(`/api/integrations`, {
    method: 'POST',
    body: body,
  });
}

async function onSubmit(event: FormSubmitEvent<InsertIntegration|updateMapIntegration>) {
  try {
    pendingReq.value = true;
    if (props.integration?.id) {
      await updateIntegrationsOptions(props.integration.id, event.data as updateMapIntegration);
    } else {
      await createIntegrationsOptions(event.data);
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
    state.id = newIntegration.id;
    state.enable = newIntegration.enable;
    state.options.mapStylesUrl = newIntegration.options?.mapStylesUrl || '';
    state.options.tileServerDomain = newIntegration.options?.tileServerDomain || '';
  }
});
</script>