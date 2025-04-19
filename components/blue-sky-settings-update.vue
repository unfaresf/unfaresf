<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="bskyIntegrationFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
      <UFormGroup label="Account Name" name="identifier" description="The account name for which you want mentions." help="Example: unfaresf">
        <UInput v-model="state.options.identifier" :disabled="pendingReq" />
      </UFormGroup>

      <UFormGroup label="App Aassword" name="appPassword" description="Password generated in your Blue Sky account for integrating with third party apps." help="Generate password at: https://bsky.app/settings/app-passwords">
        <UInput type="password" v-model="state.options.appPassword" :disabled="pendingReq" />
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
    identifier: undefined,
    appPassword: undefined,
  }
});
if (props.integration) {
  state.enable = props.integration.enable;
  state.options.identifier = props.integration.options?.identifier || undefined;
  state.options.appPassword = props.integration.options?.appPassword || undefined;
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
      color: 'green',
      title: 'Updated Blue Sky settings',
    });
  } catch (err:any) {
    toast.add({
      color: 'red',
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
    state.options.identifier = newIntegration.options?.identifier || undefined;
    state.options.appPassword = newIntegration.options?.appPassword || undefined;
  }
});
</script>