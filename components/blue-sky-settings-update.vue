<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="bskyIntegrationFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormField label="Account Name" name="handle" description="The account handle to post too." help="Example: unfaresf.bsky.social">
        <UInput v-model="state.options.handle" :disabled="pendingReq" />
      </UFormField>
      <UFormField label="App Password" name="appPassword" description="UnfareSF specific password generated in your Bluesky settings." help="Generate at: https://bsky.app/settings/app-passwords">
        <UInput type="password" v-model="state.options.appPassword" :disabled="pendingReq" />
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
import { type SelectIntegration, bskyIntegrationOptionSchema } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

const bskyIntegrationFormSchema = z.object({
  enable: z.boolean(),
  name: bskyIntegrationOptionSchema.shape.type,
  options: bskyIntegrationOptionSchema,
});

type BskyIntegrationFormData = z.infer<typeof bskyIntegrationFormSchema>;

const props = defineProps<{
  integration?: BskyIntegrationFormData & {id: SelectIntegration['id']},
}>();

const toast = useToast();
const pendingReq = ref(false);
const state = reactive<BskyIntegrationFormData>({
  enable: false,
  name: 'bsky',
  options: {
    type: 'bsky',
  }
});

if (props.integration) {
  state.enable = props.integration.enable;
  state.options = props.integration.options;
}

async function updateBskyOptions(id:number, formData: BskyIntegrationFormData) {
  return $fetch(`/api/integrations/${id}`, {
    method: 'PUT',
    body: formData,
  });
}

async function createBskyOptions(formData: BskyIntegrationFormData) {
  return $fetch(`/api/integrations`, {
    method: 'POST',
    body: formData,
  });
}

async function onSubmit(event: FormSubmitEvent<BskyIntegrationFormData>) {
  try {
    pendingReq.value = true;
    if (props.integration) {
      await updateBskyOptions(props.integration.id, event.data);
    } else {
      await createBskyOptions(event.data);
    }
    toast.add({
      color: 'success',
      title: 'Updated Blue Sky settings',
    });
  } catch (err:any) {
    toast.add({
      color: 'error',
      title: 'Error updating Blue Sky settings',
      description: err.message
    });
  } finally {
    pendingReq.value = false;
  }
}

watch(() => props.integration, (newIntegration) => {
  if (newIntegration) {
    state.enable = newIntegration.enable;
    state.options = newIntegration.options;
  }
});
</script>