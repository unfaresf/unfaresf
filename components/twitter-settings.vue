<template>
    <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
      <UForm :schema="twitterOptionsFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
  
        <UFormGroup label="Bearer Token" name="bearer-token" Description="The bearer access token for the Twitter API." help="Bearer tokens are generated in the Twitter developer console.">
          <UInput v-model="state.bearerToken" type="password" :disabled="pendingReq" />
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
  import { type SelectIntegration, type TwitterOptions, type Prettify } from '../db/schema';
  import type { FormSubmitEvent } from '#ui/types';
  import { z } from 'zod';
  
  const twitterOptionsFormSchema = z.object({
    enable: z.boolean(),
    bearerToken: z.string().optional(),
  });
  
  type IntegrationFormData = Prettify<{enable: boolean} & TwitterOptions>;
  
  const props = defineProps<{
    integration?: Prettify<Omit<SelectIntegration, 'options'> & { options: TwitterOptions|null}>,
  }>();
  
  const toast = useToast();
  const pendingReq = ref(false);
  const state = reactive<IntegrationFormData>({
    type: 'twitter',
    enable: false,
    bearerToken: undefined,
  });
  if (props.integration) {
    state.enable = props.integration.enable;
    state.bearerToken = props.integration.options?.bearerToken || undefined;
  }
  
  async function updateTwitterOptions(id:number, options:IntegrationFormData) {
    return $fetch(`/api/integrations/${id}`, {
      method: 'PUT',
      body: options,
    });
  }
  
  async function createTwitterOptions(options:IntegrationFormData) {
    return $fetch(`/api/integrations`, {
      method: 'POST',
      body: options,
    });
  }
  
  async function onSubmit(event: FormSubmitEvent<IntegrationFormData>) {
    try {
      pendingReq.value = true;
      if (props.integration) {
        await updateTwitterOptions(props.integration.id, event.data);
      } else {
        await createTwitterOptions(event.data);
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
      state.bearerToken = newIntegration.options?.bearerToken || undefined;
    }
  });
  </script>