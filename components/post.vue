<template>
  <UModal :ui="{strategy:'merge', container:'items-start'}">
    <UCard>
      <template #header>
        <h3 class="text-lg">Post</h3>
        <p class="text-xs text-gray-500">What operator, from where, which line, headed which direction.</p>
      </template>
      <p class="p-2 rounded bg-gray-100 text-gray-600 text-sm mb-4"><ReportSummary ref="report-summary-ref" :report="props.report"></ReportSummary></p>
      <UForm id="post-form" :schema="postSchema" :state="post" class="space-y-4" @submit="onSubmit">
        <UFormGroup label="Message" name="message" help="Tweet, toot, txt, etc...">
          <UTextarea v-model="post.message" autofocus />
        </UFormGroup>
      </UForm>

      <template #footer>
        <div class="flex items-center">
            <UButton color="orange" @click="postSummary">Post Summary</UButton>
            <UTooltip text="Tooltip example" :popper="{ placement: 'top' }" class="p-2">
              <UIcon name="i-heroicons:question-mark-circle" class="w-5 h-5" />
              <template #text>
                <span class="italic">Make a post using the text in the gray box.</span>
              </template>
            </UTooltip>
          <UButton color="gray" class="ml-auto mr-4" @click="onClose">Cancel</UButton>
          <UButton color="green" type="submit" form="post-form">Post</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script lang="ts" setup>
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types'
import type { SelectReport } from '../db/schema';
import { useTemplateRef } from 'vue';
const emit = defineEmits(['success', 'close']);
const props = defineProps<{
  report: SelectReport,
}>();
const post = reactive({
  message: undefined,
});
const toast = useToast();
const posting = ref(false);
const reportSummRef = useTemplateRef('report-summary-ref');
const postSchema = z.object({
  message: z.string().min(8).max(400).trim()
});
type PostSchema = z.output<typeof postSchema>

async function postSummary() {
  if (reportSummRef.value?.summary?.innerText) {
    await postMessage(reportSummRef.value?.summary?.innerText);
  }
}

async function postMessage(msg:string) {
  posting.value = true;
  try {
    await $fetch("/api/broadcast", {
      method: 'POST',
      body: {
        message: msg
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

async function onSubmit(event: FormSubmitEvent<PostSchema>) {
  await postMessage(event.data.message);
}

async function onClose(event: FormSubmitEvent<PostSchema>) {
  event.preventDefault();
  emit('close');
}
</script>