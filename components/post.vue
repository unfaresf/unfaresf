<template>
  <UCard>
    <template #header>
      <h3 class="text-lg">Post</h3>
      <p class="text-xs text-gray-500">
        What operator, from where, which line, headed which direction.
      </p>
    </template>

    <UForm
      v-if="!sourceInternal"
      :state="formState"
      class="space-y-4"
      id="external-source-broadcast-form"
    >
      <div class="p-2 rounded bg-gray-100 text-gray-600 text-sm mb-4">
        <span>{{ props.report.message }}</span>
      </div>
      <ReportForm :showButtons="false" />
    </UForm>

    <div class="p-2 rounded bg-gray-100 text-gray-600 text-sm mt-4">
      <ReportSummary ref="report-summary-ref" :report="formState" />
    </div>

    <template v-if="!props.report?.reviewedAt" #footer>
      <div class="flex flex-col md:flex-row flex-grow md:flex-grow-0 gap-y-3">
        <UButton
          color="green"
          class="justify-center md:order-4 md:ml-3 self-end"
          @click="postInternalSourceSummary"
          form="internal-source-broadcast-form"
          id="broadcast-form-submit-btn"
          >Post</UButton
        >
        <UButton
          id="post-dismiss-button"
          color="red"
          class="justify-center md:order-2"
          :disabled="pending"
          v-if="report"
          @click="dismiss(report?.id)"
          >Dismiss</UButton
        >
      </div>
    </template>
  </UCard>
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";
import type { SelectReport } from "../db/schema";
import { useTemplateRef } from "vue";
import type { ReportPostSchema } from "~/components/report-form.vue";
import { routeSchema } from "../components/select/route.vue";
import { stopSchema } from "../components/select/stop.vue";
import { getPlainTextSummary } from "./report-summary.vue";

const emit = defineEmits<{
  success: [];
  close: [];
}>();
const props = defineProps<{
  report: SelectReport;
}>();

const internalSourceBroadcast = reactive<
  Partial<InternalSourceBroadcastSchema>
>({
  message: undefined,
});

const formState = ref({ ...props.report });

const toast = useToast();
const pending = ref(false);
const reportSummRef = useTemplateRef("report-summary-ref");
const externalSourceBroadcastSchema = z.object({
  message: z.string().min(8).max(400).trim(),
  route: routeSchema.required(),
  stop: stopSchema.required(),
  passenger: z.boolean({ coerce: true }),
});
const sourceInternal = props.report.source === "internal";
type ExternalSourceBroadcastSchema = z.output<
  typeof externalSourceBroadcastSchema
>;
const internalSourceBroadcastSchema = z.object({
  message: z.string().min(8).max(400).trim(),
});
type InternalSourceBroadcastSchema = z.output<
  typeof internalSourceBroadcastSchema
>;

async function postInternalSourceSummary() {
  if (reportSummRef.value?.summary?.innerText) {
    await postBroadcast(reportSummRef.value?.summary?.innerText);
    emit("success");
  }
}

async function postBroadcast(msg: string) {
  if (!props.report) return;
  pending.value = true;
  try {
    await $fetch("/api/broadcasts", {
      method: "POST",
      body: {
        message: msg,
        reportId: props.report.id,
      },
    });
    internalSourceBroadcast.message = undefined;
  } catch (err: any) {
    if (err.statusCode === 409) {
      toast.add({
        color: "orange",
        title: "Someone beat you to the punch",
        description: "Someone else created a broadcast for this report.",
      });
    } else {
      toast.add({
        color: "red",
        title: "Error creating new broadcast",
        description: err.data?.message || err.message,
      });
    }
  } finally {
    pending.value = false;
  }
}

async function dismiss(reportId: number) {
  try {
    pending.value = true;
    await $fetch(`/api/reports/${reportId}`, {
      method: "PUT",
      body: {
        approved: false,
      },
    });
    emit("success");
  } catch (err: any) {
    toast.add({
      color: "red",
      title: "Error dismissing reprt",
      description: err.data?.message || err.message,
    });
  } finally {
    pending.value = false;
  }
}
</script>
