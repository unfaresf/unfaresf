<template>
  <UCard>
    <template #header>
      <h3 class="text-lg">Post</h3>
      <p class="text-xs text-neutral-500">What operator, from where, which line, headed which direction.</p>
    </template>

    <div class="p-2 rounded bg-neutral-100 text-neutral-600 text-sm mb-4">
      <ReportSummary ref="report-summary-ref" :report="props.report" />
    </div>

    <UForm v-if="sourceInternal" class="space-y-4" id="internal-source-broadcast-form" :schema="internalSourceBroadcastSchema" :state="internalSourceBroadcast" @submit="onSubmitInternalSource">
      <UFormField label="Message" name="message" help="Tweet, toot, txt, etc...">
        <UTextarea v-model="internalSourceBroadcast.message" class="w-full" autofocus />
      </UFormField>
    </UForm>

    <UForm v-else class="space-y-4" id="external-source-broadcast-form" :schema="externalSourceBroadcastSchema" :state="externalSourceBroadcast" @submit="onSubmitExternalSource">
      <SelectRoute @on-change="(newRoute:RouteResponse) => externalSourceBroadcast.route = newRoute" />

      <SelectStop :route-id="externalSourceBroadcast.route?.routeId" @on-change="(newStop:StopPostResponse) => externalSourceBroadcast.stop = newStop" />

      <UFormField label="Inspectors onboard" name="passenger" help="Enable if inspectors are currently onboard.">
        <USwitch v-model="externalSourceBroadcast.passenger" />
      </UFormField>

      <UFormField label="Message" name="message" help="Tweet, toot, txt, etc...">
        <UTextarea v-model="externalSourceBroadcast.message" />
      </UFormField>
    </UForm>

    <template v-if="!props.report?.reviewedAt" #footer>
      <div class="flex flex-col md:flex-row grow md:grow-0 gap-y-3">
        <UButton color="primary" class="justify-center md:order-4 md:ml-3 cursor-pointer" type="submit" form="external-source-broadcast-form">Post</UButton>
        <div class="flex grow items-center md:order-1">
          <UButton id="post-post-button" color="warning" class="justify-center grow md:grow-0 mr-2 cursor-pointer" @click="postInternalSourceSummary" :disabled="!sourceInternal">Post Summary</UButton>
          <UPopover mode="hover" :open-delay="300" :close-delay="200" :content="{ side: 'top' }">
            <UIcon name="i-heroicons:question-mark-circle" class="w-5 h-5" />
            <template #content>
              <span class="italic p-2">Post using the text at the top of this popup.</span>
            </template>
          </UPopover>
        </div>
        <UButton v-if="report" id="post-dismiss-button" color="error" class="justify-center md:order-2 cursor-pointer" :disabled="pending" @click="dismiss(report)">Dismiss</UButton>
      </div>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types'
import type { SelectReport } from '../db/schema';
import { useTemplateRef } from 'vue';
import { type RouteResponse, routeSchema } from "../components/select/route.vue";
import { type StopPostResponse, stopPostResponseSchema } from "../components/select/stop.vue";
import { getPlainTextSummary } from './report-summary.vue';

const emit = defineEmits<{
  posted: [SelectReport],
  dismissed: [SelectReport]
}>();

const props = defineProps<{
  report: SelectReport,
}>();

const internalSourceBroadcast:Partial<InternalSourceBroadcastSchema> = reactive({
  message: undefined,
});

const externalSourceBroadcast = computed(():Partial<ExternalSourceBroadcastSchema> => {
  const msg = props.report.message || getPlainTextSummary({
    createdAt: props.report.createdAt,
    route:{
      ...props.report.route,
      routeShortName: externalSourceBroadcast.value.route?.routeShortName,
      direction: externalSourceBroadcast.value.route?.direction
    },
    stop: {
      stopName: externalSourceBroadcast.value.stop?.stopName,
    },
    passenger: externalSourceBroadcast.value.passenger ?? null,
    message: props.report.message ?? null,
  });
  return {
    ...externalSourceBroadcast,
    message: msg,
  }
});

const toast = useToast();
const pending = ref(false);
const reportSummRef = useTemplateRef('report-summary-ref');
const externalSourceBroadcastSchema = z.object({
  message: z.string().min(8).max(400).trim(),
  route: routeSchema.required(),
  stop: stopPostResponseSchema.required(),
  passenger: z.boolean({coerce: true}),
});
const sourceInternal = props.report.source === 'internal';
type ExternalSourceBroadcastSchema = z.output<typeof externalSourceBroadcastSchema>
const internalSourceBroadcastSchema = z.object({
  message: z.string().min(8).max(400).trim(),
});
type InternalSourceBroadcastSchema = z.output<typeof internalSourceBroadcastSchema>

async function postInternalSourceSummary() {
  if (reportSummRef.value?.summary?.innerText) {
    await postBroadcast(reportSummRef.value?.summary?.innerText);
    emit('posted', props.report);
  }
}

async function postBroadcast(msg:string) {
  if (!props.report) return;
  pending.value = true;
  try {
    await $fetch("/api/broadcasts", {
      method: 'POST',
      body: {
        message: msg,
        reportId: props.report.id,
      }
    });
    internalSourceBroadcast.message = undefined;
  } catch (err:any) {
    if (err.message === "UNIQUE constraint failed: broadcasts.report_id") {
      toast.add({
        color: 'warning',
        title: 'Someone beat you to the punch',
        description: 'Someone else created a broadcast for this report.',
      });
    } else {
      toast.add({
        color: 'error',
        title: 'Error creating new broadcast',
        description: err.data?.message || err.message,
      });
    }
  } finally {
    pending.value = false;
  }
}

async function postExternalSourceBroadcast(broadcast:ExternalSourceBroadcastSchema) {
  pending.value = true;
  try {
    await $fetch(`/api/reports/${props.report.id}`, {
      method: 'PUT',
      body: {
        route: broadcast.route,
        stop: broadcast.stop,
        passenger: broadcast.passenger
      }
    });
    await postBroadcast(broadcast.message);
  } finally {
    pending.value = false;
  }
}

async function dismiss(report:SelectReport) {
  pending.value = true;
  try {
    await $fetch(`/api/reports/${report.id}`, {
      method: 'PUT',
      body: {
        approved: false
      }
    });
    emit('dismissed', report);
  } catch (err:any) {
    toast.add({
      color: 'error',
      title: 'Error dismissing reprt',
      description: err.data?.message || err.message,
    });
  } finally {
    pending.value = false;
  }
}

async function onSubmitInternalSource(event: FormSubmitEvent<InternalSourceBroadcastSchema>) {
  await postBroadcast(event.data.message);
  emit('posted', props.report);
}

async function onSubmitExternalSource(event: FormSubmitEvent<ExternalSourceBroadcastSchema>) {
  await postExternalSourceBroadcast(event.data);
  emit('posted', props.report);
}
</script>