<template>
  <UContainer>
    <UCard class="mt-10">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>Use this form to report fare inspectors on San Francisco Bay Area public transit.</p>
      </template>
      <UForm class="flex flex-col gap-2 max-w-prose" ref="form" @submit="onSubmit" :state="formState" :schema="reportSchema">
        <SelectRoute @on-change="(newRoute:RouteRequest) => formState.route = newRoute" />
        <SelectStop :route-id="formState.route?.routeId" @on-change="(newStop:StopPost) => formState.stop = newStop" />
        <UFormGroup label="Inspectors onboard" name="passenger" help="Enable if inspectors are currently onboard.">
          <UToggle v-model="formState.passenger" />
        </UFormGroup>
      </UForm>
      <template #footer>
        <div class="flex">
          <UButton type="submit" label="Report Sighting" class="ml-auto" @click="submitReport"  :disabled="submitting"/>
        </div>
      </template>
    </UCard>
  </UContainer>
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent, Form } from '#ui/types';
import { type RouteRequest, routeSchema } from "../components/select/route.vue";
import { type StopPost, stopPostSchema } from "../components/select/stop.vue";

const toast = useToast();
const initialFormState = { passenger: false };
const formState = reactive<Partial<ReportPostSchema>>(initialFormState);
const submitting = ref(false);
const form = ref<Form<ReportPostSchema>>();

const reportSchema = z.object({
  route: routeSchema,
  stop: stopPostSchema,
  passenger: z.boolean(),
}).required();
type ReportPostSchema = z.output<typeof reportSchema>;

async function onSubmit(event: FormSubmitEvent<ReportPostSchema>) {
  submitting.value = true;
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: event.data
    });
    toast.add({
      color: 'green',
      title: 'Report successful'
    });
    await navigateTo("/reports");
  } catch(err:any) {
    toast.add({
      color: 'red',
      title: 'Error submitting report',
      description: err.message
    });
  } finally {
    submitting.value = false;
  }
}

async function submitReport() {
  await form.value?.submit();
}
</script>