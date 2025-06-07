import type { ReportPostSchema } from "~/components/report-form.vue";

const toast = useToast();
const submitting = ref(false);

async function onSubmit(report?: ReportPostSchema) {
  submitting.value = true;
  try {
    await $fetch("/api/reports", {
      method: "POST",
      body: report,
    });
    toast.add({
      color: "green",
      title: "Report successful",
    });
    await navigateTo("/thank-you");
  } catch (err: any) {
    toast.add({
      color: "red",
      title: "Error submitting report",
      description: err.message,
    });
  } finally {
    submitting.value = false;
  }
}

export const useReportSubmit = () => ({ submitting, onSubmit });
