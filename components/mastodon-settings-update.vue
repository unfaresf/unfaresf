<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="integrationsFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormGroup label="Account Name" name="accountName" description="The account name for which you want mentions." help="Example: unfaresf">
        <UInput v-model="state.accountName" :disabled="pendingReq" />
      </UFormGroup>

      <UFormGroup label="URL" name="url" description="The domain of your server." help="Example: https://mastodon.social/ or https://sfba.social">
        <UInput v-model="state.url" :disabled="pendingReq" />
      </UFormGroup>

      <UFormGroup label="Token" name="token" Description="The access token for the applcation in your account." help="Tokens are at `/settings/applications` at your server's URL.">
        <UInput v-model="state.token" type="password" :disabled="pendingReq" />
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

const props = defineProps<{
  integration?: Prettify<Omit<SelectIntegration, 'options'> & {name: 'mastodon', options: MastodonOption|null}>,
}>();

const toast = useToast();
const pendingReq = ref(false);
const state = reactive<IntegrationFormData>({
  enable: false,
  token: undefined,
  url: undefined,
  accountName: undefined,
});
if (props.integration) {
  state.enable = props.integration.enable;
  state.token = props.integration.options?.token || undefined;
  state.url = props.integration.options?.url || undefined;
  state.accountName = props.integration.options?.accountName || undefined;
}

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
    pendingReq.value = true;
    if (props.integration) {
      await updateMastodonOptions(props.integration.id, event.data);
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
    pendingReq.value = false;
  }
}

watch(() => props.integration, (newIntegration) => {
  if (newIntegration) {
    state.enable = newIntegration.enable;
    state.token = newIntegration.options?.token || undefined;
    state.url = newIntegration.options?.url || undefined;
    state.accountName = newIntegration.options?.accountName || undefined;
  }
});
</script>