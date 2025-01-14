<template>
  <UModal>
    <UCard>
      <template #header>
        <h3 class="text-lg">Post</h3>
        <p class="text-xs text-gray-500">What operator, from where, which line, headed which direction.</p>
      </template>

      <p class="p-2 rounded bg-gray-100 text-gray-600 text-sm mb-4"><BroadcastSummary :report="props.report"></BroadcastSummary></p>

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
import type { UnfareReport } from '../db/schema';

const emit = defineEmits(['success', 'close']);
const props = defineProps<{
  report: UnfareReport,
}>();
const post = reactive({
  message: undefined,
});
const toast = useToast();
const posting = ref(false);

const postSchema = z.object({
  message: z.string().min(8).max(400).trim()
});
type PostSchema = z.output<typeof postSchema>

async function onSubmit(event: FormSubmitEvent<PostSchema>) {
  posting.value = true;
  try {
    await $fetch("/api/broadcast", {
      method: 'POST',
      body: {
        message: event.data.message
      }
    });
    await $fetch(`/api/reports/${props.report.id}`, {
      method: 'PUT',
      body: {
        approved: true
      }
    });
    post.message = undefined;
    emit('success');
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: err.data?.message || err.message,
    });
  } finally {
    posting.value = false;
  }
}

async function onClose(event: FormSubmitEvent<PostSchema>) {
  event.preventDefault();
  emit('close');
}
</script>