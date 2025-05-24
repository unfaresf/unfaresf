<template>
    <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
      <UForm :schema="twitterIntegrationFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">

        <UFormField label="Bearer Token" name="bearer-token" Description="The bearer access token for the Twitter API." help="Bearer tokens are generated in the Twitter developer console.">
          <UInput v-model="state.options.bearerToken" type="password" :disabled="pendingReq" />
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
  import { type SelectIntegration, type TwitterOptions, type Prettify, twitterIntegrationOptionSchema } from '../db/schema';
  import type { FormSubmitEvent } from '#ui/types';
  import { z } from 'zod';

  const twitterIntegrationFormSchema = z.object({
    enable: z.boolean(),
    name: twitterIntegrationOptionSchema.shape.type,
    options: twitterIntegrationOptionSchema,
  });

  type TwitterIntegrationFormData = z.infer<typeof twitterIntegrationFormSchema>;

  const props = defineProps<{
    integration?: TwitterIntegrationFormData & {id: SelectIntegration['id']},
  }>();

  const toast = useToast();
  const pendingReq = ref(false);
  const state = reactive<TwitterIntegrationFormData>({
    enable: false,
    name: 'twitter',
    options: {
      type: 'twitter',
      bearerToken: undefined,
    }
  });
  if (props.integration) {
    state.enable = props.integration.enable;
    state.options.bearerToken = props.integration.options?.bearerToken || undefined;
  }

  async function updateTwitterOptions(id:number, formData: TwitterIntegrationFormData) {
    return $fetch(`/api/integrations/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async function createTwitterOptions(formData: TwitterIntegrationFormData) {
    return $fetch(`/api/integrations`, {
      method: 'POST',
      body: formData,
    });
  }

  async function onSubmit(event: FormSubmitEvent<TwitterIntegrationFormData>) {
    try {
      pendingReq.value = true;
      if (props.integration) {
        await updateTwitterOptions(props.integration.id, event.data);
      } else {
        await createTwitterOptions(event.data);
      }
      toast.add({
        color: 'success',
        title: 'Updated twitter settings',
      });
    } catch (err:any) {
      toast.add({
        color: 'error',
        title: 'Error updating twitter settings',
        description: err.message
      });
    } finally {
      pendingReq.value = false;
    }
  }

  watch(() => props.integration, (newIntegration) => {
    if (newIntegration) {
      state.enable = newIntegration.enable;
      state.options.bearerToken = newIntegration.options?.bearerToken || undefined;
    }
  });
  </script>