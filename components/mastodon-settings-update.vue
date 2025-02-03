<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="integrationsFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormGroup label="Account Name" name="accountName" description="The account name for which you want mentions." help="Example: unfaresf">
        <UInput v-model="state.accountName" :disabled="disabled" />
      </UFormGroup>

      <UFormGroup label="URL" name="url" description="The domain of your server." help="Example: https://mastodon.social/ or https://sfba.social">
        <UInput v-model="state.url" :disabled="disabled" />
      </UFormGroup>

      <UFormGroup label="Token" name="token" Description="The access token for the applcation in your account." help="Tokens are at `/settings/applications` at your server's URL.">
        <UInput v-model="state.token" type="password" :disabled="disabled" />
      </UFormGroup>

      <div class="flex">
        <UFormGroup label="Enable" name="enable">
          <UToggle v-model="state.enable" :disabled="disabled" />
        </UFormGroup>

        <UButton type="submit" class="ml-auto my-4" icon="i-heroicons-pencil-square" :loading="loading" :disabled="disabled">
          Save
        </UButton>
      </div>
    </UForm>
  </UContainer>
</template>

<script setup lang="ts">
import { type SelectIntegration, type MastodonOption, type Prettify } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

const integrationsFormSchema = z.object({
  enable: z.boolean(),
  token: z.string().optional(),
  url: z.string().url().optional(),
  accountName: z.string().optional(),
});

type IntegrationFormData = Prettify<{enable: boolean} & MastodonOption>;

const toast = useToast();
const loading = ref(false);
const state = reactive<IntegrationFormData>({
  enable: false,
  token: undefined,
  url: undefined,
  accountName: undefined,
});
const { data: integration, status } = await useLazyFetch<SelectIntegration[]>('/api/integrations', {
  query: {
    name: 'mastodon'
  },
});
if (integration.value && integration.value.length) {
  state.enable = integration.value[0].enable;
  state.token = integration.value[0].options?.token || undefined;
  state.url = integration.value[0].options?.url || undefined;
  state.accountName = integration.value[0].options?.accountName || undefined;
}

const disabled = computed(() => status.value === 'pending');

async function updateMastodonOptions(id:number, options:IntegrationFormData) {
  return $fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    body: options,
  });
}

async function createMastodonOptions(options:IntegrationFormData) {
  return $fetch(`/api/integrations`, {
    method: 'POST',
    body: options,
  });
}

async function onSubmit(event: FormSubmitEvent<IntegrationFormData>) {
  try {
    loading.value = true;
    if (integration.value && integration.value.length) {
      await updateMastodonOptions(integration.value[0].id, event.data);
    } else {
      await createMastodonOptions(event.data);
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
    loading.value = false;
  }
}

watch(integration, (newIntegration) => {
  if (newIntegration && newIntegration?.length) {
    state.enable = newIntegration[0].enable;
    state.token = newIntegration[0].options?.token || undefined;
    state.url = newIntegration[0].options?.url || undefined;
    state.accountName = newIntegration[0].options?.accountName || undefined;
  }
});
</script>