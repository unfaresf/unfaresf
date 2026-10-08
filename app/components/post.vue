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
      <ReportForm v-if="!props.report?.reviewedAt" v-model="reviewFormState" class="mb-4" />
    </div>

    <div class="p-2 rounded bg-neutral-100 text-neutral-600 text-sm">
      <ReportSummary :summary="summary" />
    </div>

    <template v-if="!props.report?.reviewedAt" #footer>
      <div class="flex flex-col flex-grow md:flex-row md:flex-grow-0 gap-y-3">
        <UButton
          color="success"
          class="justify-center md:order-4 md:ml-3"
          :disabled="pending || !canPost"
          @click="postSummary"
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
import { reportSchema, type ReportPostSchema } from "./report-form.vue";
import { isAuthStatus } from "~/composable/apiErrorToast";

// What the reviewer fills in for an external-source (e.g. Mastodon) report.
// Starts with passenger off, like the report page, so the stop select shows.
const reviewFormState = ref<Partial<ReportPostSchema>>({ passenger: false });

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
const sourceInternal = props.report.source === "internal";
// An external-source report's message is scraped free text, shown above for
// the reviewer only. Its broadcast is built from the review form instead, so
// it gets the same structured template as internal reports.
const summary = computed(() => {
  if (sourceInternal) return getPlainTextSummary(props.report);
  const { route, stop, passenger } = reviewFormState.value;
  return getPlainTextSummary({
    createdAt: props.report.createdAt,
    source: props.report.source,
    message: null,
    route: route ?? null,
    stop: stop ?? null,
    passenger: passenger ?? null,
  });
});
const canPost = computed(
  () => sourceInternal || reportSchema.safeParse(reviewFormState.value).success
);

const toast = useToast();
const pending = ref(false);
// const externalSourceBroadcastSchema = z.object({
//   message: z.string().min(8).max(400).trim(),
//   route: routeSchema.required(),
//   stop: stopSchema.required(),
//   passenger: z.boolean({ coerce: true }),
// });
// type ExternalSourceBroadcastSchema = z.output<
//   typeof externalSourceBroadcastSchema
// >;
const internalSourceBroadcastSchema = z.object({
  message: z.string().min(8).max(400).trim(),
});
type InternalSourceBroadcastSchema = z.output<
  typeof internalSourceBroadcastSchema
>;

async function postSummary() {
  if (!summary.value || !canPost.value) return;
  if (!sourceInternal && !(await saveReviewedReport())) return;
  await postBroadcast(summary.value);
  emit("success");
}

// Store the reviewer's structured details on the report (and mark it reviewed)
// before broadcasting. Resolves false if the broadcast shouldn't go out.
async function saveReviewedReport(): Promise<boolean> {
  const { route, stop, passenger } = reviewFormState.value;
  pending.value = true;
  try {
    const updated = await $fetch(`/api/reports/${props.report.id}`, {
      method: "PUT",
      body: { route, stop, passenger },
    });
    // The update only applies to unreviewed reports; an empty result means
    // someone else already posted or dismissed this one.
    if (!updated.length) {
      toast.add({
        color: "warning",
        title: "Someone beat you to the punch",
        description: "Someone else already reviewed this report.",
      });
      return false;
    }
    return true;
  } catch (err: any) {
    if (isAuthStatus(err)) return false; // 401 handled by the global guard; 403 not ours to toast
    toast.add({
      color: "error",
      title: "Error saving report",
      description: err.data?.message || err.message,
    });
    return false;
  } finally {
    pending.value = false;
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
