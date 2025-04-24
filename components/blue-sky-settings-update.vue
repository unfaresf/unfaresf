<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="bskyOAuthFormSchema" :state="oAuthFormState" class="space-y-4 flex flex-col mb-4" @submit="handleBlueskyAuthClick">
      <UFormGroup label="Account Name" name="handle" description="The account name for which you want mentions." help="Example: unfaresf.bsky.social">
        <UInput v-model="oAuthFormState.handle" :disabled="pendingReq" />
      </UFormGroup>
      <UButton type="submit" color="blue">Sign into Bluesky</UButton>
    </UForm>
    <UForm :schema="bskyIntegrationFormSchema" :state="state" class="space-y-4 flex flex-col" @submit.prevent="onSubmit">
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

function handleBlueskyAuthClick() {
  if (oAuthFormState.handle) {
    navigateTo({
      path: '/api/auth/bluesky',
      query: { handle: oAuthFormState.handle },
    }, {
      external: true,
    });
  }
}
const bskyOAuthFormSchema = z.object({
  handle: z.string().max(253)
});

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
const oAuthFormState = reactive<{handle: string|undefined}>({
  handle: undefined
});
const state = reactive<BskyIntegrationFormData>({
  enable: false,
  name: 'bsky',
  options: {
    type: 'bsky',
  }
});
if (props.integration) {
  state.enable = props.integration.enable;
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
    oAuthFormState.handle = newIntegration.options.user?.did;
  }
});
</script>