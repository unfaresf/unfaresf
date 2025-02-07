<template>
  <UCard class="mt-10">
    <template #header>
      <h3 class="text-lg">Report</h3>
      <p class="text-sm text-gray-500">What operator, from where, which line, headed which direction.</p>
    </template>
    <div class="p-2 max-w-prose rounded bg-gray-100 text-gray-600 text-sm mb-4"><ReportSummary ref="report-summary-ref" :report="report"></ReportSummary></div>

    <UForm id="post-form" :schema="postSchema" :state="post" class="space-y-4" @submit="onSubmit">
      <UFormGroup label="Message" name="message" help="Tweet, toot, txt, etc...">
        <UTextarea v-model="post.message" autofocus />
      </UFormGroup>
    </UForm>

    <template #footer>
      <div class="flex items-center">
        <UButton color="orange" :disabled="pending" @click="postSummary">Post Summary</UButton>
        <UTooltip text="Tooltip example" :popper="{ placement: 'top' }" class="p-2">
          <UIcon name="i-heroicons:question-mark-circle" class="w-5 h-5" />
          <template #text>
            <span class="italic">Make a post using the text in the gray box.</span>
          </template>
        </UTooltip>
        <UButton color="gray" :disabled="pending" class="ml-auto mr-4" to="/reports">Cancel</UButton>
        <UButton color="red" :disabled="pending" class="mr-4" v-if="report" @click="dismiss(report?.id)">Dismiss</UButton>
        <UButton color="green" :disabled="pending" type="submit" form="post-form">Post</UButton>
      </div>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types'
import type { SelectReport } from '../../db/schema';
import { useTemplateRef } from 'vue';

definePageMeta({
  middleware: ['auth']
});

const postSchema = z.object({
  message: z.string().min(8).max(400).trim()
});
type PostSchema = z.output<typeof postSchema>

const post = reactive({
  message: undefined,
});
const pending = ref(false);
const reportSummRef = useTemplateRef('report-summary-ref');
const route = useRoute();
const toast = useToast();

const { data: report } = await useLazyFetch<SelectReport>(`/api/reports/${route.params.id}`);
watch(report, (newPosts) => {
  report.value = newPosts;
}, {once: true});

async function postMessage(msg:string) {
  if (!report.value) return;
  pending.value = true;
  try {
    await $fetch("/api/broadcast", {
      method: 'POST',
      body: {
        message: msg
      }
    });
    await $fetch(`/api/reports/${report.value.id}`, {
      method: 'PUT',
      body: {
        approved: true
      }
    });
    await navigateTo('/reports');
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: err.data?.message || err.message,
    });
  } finally {
    pending.value = false;
  }
}

async function postSummary() {
  if (reportSummRef.value?.summary?.innerText) {
    await postMessage(reportSummRef.value?.summary?.innerText);
  }
}

async function onSubmit(event: FormSubmitEvent<PostSchema>) {
  await postMessage(event.data.message);
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
    await navigateTo('/reports');
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
</script>