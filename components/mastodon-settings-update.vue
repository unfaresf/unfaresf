<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="mastodonIntegrationFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormField label="Account Name" name="accountName" description="The account name for which you want mentions." help="Example: unfaresf">
        <UInput v-model="state.options.accountName" :disabled="pendingReq" />
      </UFormField>

      <UFormField label="URL" name="url" description="The domain of your server." help="Example: https://mastodon.social/ or https://sfba.social">
        <UInput v-model="state.options.url" :disabled="pendingReq" />
      </UFormField>

      <UFormField label="Token" name="token" Description="The access token for the applcation in your account." help="Tokens are at `/settings/applications` at your server's URL.">
        <UInput v-model="state.options.token" type="password" :disabled="pendingReq" />
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
import { type SelectIntegration, mastodonIntegrationOptionSchema } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

const mastodonIntegrationFormSchema = z.object({
  enable: z.boolean(),
  name: mastodonIntegrationOptionSchema.shape.type,
  options: mastodonIntegrationOptionSchema,
});

type MastodonIntegrationFormData = z.infer<typeof mastodonIntegrationFormSchema>;

const props = defineProps<{
  integration?: MastodonIntegrationFormData & {id: SelectIntegration['id']},
}>();

const toast = useToast();
const pendingReq = ref(false);
const state = reactive<MastodonIntegrationFormData>({
  enable: false,
  name: 'mastodon',
  options: {
    type: 'mastodon',
    token: undefined,
    url: undefined,
    accountName: undefined,
  }
});
if (props.integration) {
  state.enable = props.integration.enable;
  state.options.token = props.integration.options?.token || undefined;
  state.options.url = props.integration.options?.url || undefined;
  state.options.accountName = props.integration.options?.accountName || undefined;
}

async function updateMastodonOptions(id:number, formData: MastodonIntegrationFormData) {
  return $fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    body: formData,
  });
}

async function createMastodonOptions(formData: MastodonIntegrationFormData) {
  return $fetch(`/api/integrations`, {
    method: 'POST',
    body: formData,
  });
}

async function onSubmit(event: FormSubmitEvent<MastodonIntegrationFormData>) {
  try {
    pendingReq.value = true;
    if (props.integration) {
      await updateMastodonOptions(props.integration.id, event.data);
    } else {
      await createMastodonOptions(event.data);
    }
    toast.add({
      color: 'success',
      title: 'Updated mastodon settings',
    });
  } catch (err:any) {
    toast.add({
      color: 'error',
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
    state.options.token = newIntegration.options?.token || undefined;
    state.options.url = newIntegration.options?.url || undefined;
    state.options.accountName = newIntegration.options?.accountName || undefined;
  }
});
</script>