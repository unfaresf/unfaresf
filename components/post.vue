<template>
  <UCard>
    <template #header>
      <h3 class="text-lg">Post</h3>
      <p class="text-xs text-gray-500">What operator, from where, which line, headed which direction.</p>
    </template>
    <div class="p-2 rounded bg-gray-100 text-gray-600 text-sm mb-4">
      <ReportSummary ref="report-summary-ref" :report="props.report"></ReportSummary>
    </div>
    <UForm v-if="!props.report?.reviewedAt" id="post-form" :schema="postSchema" :state="post" class="space-y-4" @submit="onSubmit">
      <UFormGroup label="Message" name="message" help="Tweet, toot, txt, etc...">
        <UTextarea v-model="post.message" autofocus />
      </UFormGroup>
    </UForm>

    <template v-if="!props.report?.reviewedAt" #footer>
      <div class="flex flex-col md:flex-row flex-grow md:flex-grow-0 gap-y-3">
        <UButton color="green" class="justify-center md:order-4 md:ml-3" type="submit" form="post-form">Post</UButton>
        <div class="flex flex-grow items-center md:order-1">
          <UButton color="orange" class="justify-center grow md:flex-grow-0 mr-2" @click="postSummary">Post Summary</UButton>
          <UTooltip text="Tooltip example" :popper="{ placement: 'top' }">
            <UIcon name="i-heroicons:question-mark-circle" class="w-5 h-5" />
            <template #text>
              <span class="italic">Make a post using the text in the gray box.</span>
            </template>
          </UTooltip>
        </div>
        <UButton color="red" class="justify-center md:order-2" :disabled="pending" v-if="report" @click="dismiss(report?.id)">Dismiss</UButton>
      </div>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types'
import type { SelectReport } from '../db/schema';
import { useTemplateRef } from 'vue';

const emit = defineEmits(['success', 'close']);
const props = defineProps<{
  report: SelectReport|null,
}>();
const post = reactive({
  message: undefined,
});
const toast = useToast();
const pending = ref(false);
const reportSummRef = useTemplateRef('report-summary-ref');
const postSchema = z.object({
  message: z.string().min(8).max(400).trim()
});
type PostSchema = z.output<typeof postSchema>

async function postSummary() {
  if (reportSummRef.value?.summary?.innerText) {
    await postMessage(reportSummRef.value?.summary?.innerText);
    emit('success');
  }
}

async function postMessage(msg:string) {
  if (!props.report) return;
  pending.value = true;
  try {
    await $fetch("/api/broadcast", {
      method: 'POST',
      body: {
        message: msg,
        reportId: props.report.id,
      }
    });
    post.message = undefined;
  } catch (err:any) {
    if (err.message === "UNIQUE constraint failed: broadcasts.report_id") {
      toast.add({
        color: 'orange',
        title: 'Someone beat you to the punch',
        description: 'Someone else created a broadcast for this report.',
      });
    } else {
      toast.add({
        color: 'red',
        title: 'Error creating new broadcast',
        description: err.data?.message || err.message,
      });
    }
  } finally {
    pending.value = false;
  }
}

async function dismiss(reportId:number) {
  try {
    pending.value = true;
    await $fetch(`/api/reports/${reportId}`, {
      method: 'PUT',
      body: {
        approved: false
      }
    });
    emit('success');
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: 'Error dismissing reprt',
      description: err.data?.message || err.message,
    });
  } finally {
    pending.value = false;
  }
}

async function onSubmit(event: FormSubmitEvent<PostSchema>) {
  await postMessage(event.data.message);
  emit('success');
}

async function onClose(event: FormSubmitEvent<PostSchema>) {
  event.preventDefault();
  emit('close');
}
</script>