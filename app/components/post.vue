<template>
  <UCard>
    <template #header>
      <h3 class="text-lg">Post</h3>
      <p class="text-xs text-neutral-500">
        What operator, from where, which line, headed which direction.
      </p>
    </template>

    <div v-if="!sourceInternal" class="space-y-4">
      <div class="p-2 rounded bg-neutral-100 text-neutral-600 text-sm mb-4 break-words">
        <span>{{ props.report.message }}</span>
      </div>
      <ReportForm v-if="!props.report?.reviewedAt" v-model="dummyFormState" class="mb-4" />
    </div>

    <div class="p-2 rounded bg-neutral-100 text-neutral-600 text-sm">
      <ReportSummary :summary="summary" />
    </div>

    <template v-if="!props.report?.reviewedAt" #footer>
      <div class="flex flex-col flex-grow md:flex-row md:flex-grow-0 gap-y-3">
        <UButton
          color="success"
          class="justify-center md:order-4 md:ml-3"
          @click="postInternalSourceSummary"
          form="internal-source-broadcast-form"
          id="broadcast-form-submit-btn"
          >Post</UButton
        >
        <UButton
          id="post-dismiss-button"
          color="error"
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
import type { SelectReport } from "../../db/schema";
import getPlainTextSummary from "#shared/utils/get-plain-text-summary";
import type { ReportPostSchema } from "./report-form.vue";
import { isAuthStatus } from "~/composable/apiErrorToast";

const dummyFormState = ref<Partial<ReportPostSchema>>({});

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
const summary = ref(getPlainTextSummary(props.report));

const toast = useToast();
const pending = ref(false);
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
  if (summary.value) {
    await postBroadcast(summary.value);
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
    if (isAuthStatus(err)) return; // 401 handled by the global guard; 403 not ours to toast
    if (err.statusCode === 409) {
      toast.add({
        color: 'warning',
        title: "Someone beat you to the punch",
        description: "Someone else created a broadcast for this report.",
      });
    } else {
      toast.add({
        color: "error",
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
    if (isAuthStatus(err)) return; // 401 handled by the global guard; 403 not ours to toast
    toast.add({
      color: "error",
      title: "Error dismissing reprt",
      description: err.data?.message || err.message,
    });
  } finally {
    pending.value = false;
  }
}
</script>
