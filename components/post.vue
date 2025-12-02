<template>
  <UCard>
    <template #header>
      <h3 class="text-lg">Post</h3>
      <p class="text-xs text-gray-500">
        What operator, from where, which line, headed which direction.
      </p>
    </template>

    <div v-if="!sourceInternal" class="space-y-4">
      <div class="p-2 rounded bg-gray-100 text-gray-600 text-sm mb-4">
        <span>{{ props.report.message }}</span>
      </div>
      <ReportForm v-model="dummyFormState" class="mb-4" />
    </div>

    <div class="p-2 rounded bg-gray-100 text-gray-600 text-sm">
      <ReportSummary ref="report-summary-ref" :report="reportState" />
    </div>

    <template v-if="!props.report?.reviewedAt" #footer>
      <div class="flex flex-col flex-grow md:flex-row md:flex-grow-0 gap-y-3">
        <UButton
          color="green"
          class="justify-center md:order-4 md:ml-3"
          @click="postInternalSourceSummary"
          form="internal-source-broadcast-form"
          id="broadcast-form-submit-btn"
          >Post</UButton
        >
        <UButton
          id="post-dismiss-button"
          color="red"
          class="justify-center md:order-2 md:ml-auto"
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
import type { SelectReport } from "../db/schema";
import { useTemplateRef } from "vue";
import type { ReportPostSchema } from "./report-form.vue";

const dummyFormState = ref<Partial<ReportPostSchema>>({});
// import { routeSchema } from "../components/select/route.vue";
// import { stopSchema } from "../components/select/stop.vue";

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
const reportState = toRef(() => props.report);

const toast = useToast();
const pending = ref(false);
const reportSummRef = useTemplateRef("report-summary-ref");
// const externalSourceBroadcastSchema = z.object({
//   message: z.string().min(8).max(400).trim(),
//   route: routeSchema.required(),
//   stop: stopSchema.required(),
//   passenger: z.boolean({ coerce: true }),
// });
const sourceInternal = props.report.source === "internal";
// type ExternalSourceBroadcastSchema = z.output<
//   typeof externalSourceBroadcastSchema
// >;
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
