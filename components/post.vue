<template>
  <UModal>
    <UCard>
      <template #header>
        <h3 class="text-lg">Post</h3>
        <p class="text-xs text-gray-500">What operator, from where, which line, headed which direction.</p>
      </template>

      <p class="p-2 rounded bg-gray-100 text-gray-600 text-sm mb-4">{{ props.report.message }}</p>

      <UForm id="post-form" :schema="postSchema" :state="post" class="space-y-4" @submit="onSubmit">
        <UFormGroup label="Message" name="message" help="Tweet, toot, txt, etc...">
          <UTextarea v-model="post.message" />
        </UFormGroup>
      </UForm>

      <template #footer>
        <UButton color="gray" class="mr-4" @click="onClose">Cancel</UButton>
        <UButton color="green" type="submit" form="post-form">Post</UButton>
      </template>
    </UCard>
  </UModal>
</template>

<script lang="ts" setup>
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types'
import { type UnfareReport } from '../db/schema';

const props = defineProps<{
  report: UnfareReport,
}>();
const emit = defineEmits(['success', 'close'])
const post = reactive({
  message: undefined,
});

const postSchema = z.object({
  message: z.string().min(8).max(400).trim()
});
type Schema = z.output<typeof postSchema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  console.log(event.data);
  emit('success');
}

async function onClose(event: FormSubmitEvent<Schema>) {
  event.preventDefault();
  emit('close');
}
</script>