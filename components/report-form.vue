<template>
  <h2 class="text-lg">New Report</h2>
  <UForm
    class="flex flex-col gap-2 max-w-prose"
    ref="form"
    @submit="onSubmit"
    :state="formState"
    :schema="reportSchema"
  >
    <SelectAgency
      @on-change="(newAgency:Agency) => formState.agency = newAgency"
    />
    <UFormGroup
      v-if="formState.agency"
      label="Inspectors onboard"
      description="Are fare inspectors currently onboard a transit vehicle?"
      name="passenger"
    >
      <URadioGroup
        v-model="formState.passenger"
        :options="[
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]"
      />
    </UFormGroup>
    <SelectRoute
      v-if="formState.agency && formState.passenger"
      :agency="formState.agency"
      @on-change="(newRoute:Route | undefined) => formState.route = newRoute"
    />
    <SelectStop
      v-if="
        formState.agency && (formState.passenger === false || formState.route)
      "
      :agency="formState.agency"
      :route="formState.route"
      :geo="geoLocation"
      @on-change="(newStop:Stop | undefined) => formState.stop = newStop"
    />

    <div class="flex">
      <ClientOnly>
        <geolocate
          @on-geolocate="(newGeolocation) => (geoLocation = newGeolocation)"
        >
          <template #help>
            <span
              >Use your location to narrow the route and stop search to those
              near you. May be helpful for those who report often. You can
              always disable this. We do not store your location.</span
            >
          </template>
        </geolocate>
      </ClientOnly>
      <UButton
        type="submit"
        label="Submit"
        class="ml-auto"
        @click="submitReport"
        :disabled="submitting"
      />
    </div>
  </UForm>
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent, Form } from "#ui/types";
import { type Route, routeSchema } from "../components/select/route.vue";
import { type Stop, stopSchema } from "../components/select/stop.vue";
import { agencySchema, type Agency } from "./select/agency.vue";

const toast = useToast();
const submitting = ref(false);
const form = ref<Form<ReportPostSchema>>();
const geoLocation = ref<GeolocationPosition>();

const formState = reactive<Partial<ReportPostSchema>>({ passenger: undefined });

const emit = defineEmits<{
  (e: "onChange", route: Partial<ReportPostSchema>): void;
}>();

watch(formState, (newFormState) => {
  if (newFormState) {
    emit("onChange", newFormState);
  }
});

watch(
  () => formState.passenger,
  (newPassenger, oldPassenger) => {
    if (newPassenger !== oldPassenger) {
      formState.route = undefined;
      formState.stop = undefined;
    }
  }
);

const reportSchema = z.object({
  agency: agencySchema,
  route: routeSchema.optional(),
  stop: stopSchema,
  passenger: z.boolean(),
});
export type ReportPostSchema = z.infer<typeof reportSchema>;

async function onSubmit(event: FormSubmitEvent<ReportPostSchema>) {
  submitting.value = true;
  try {
    await $fetch("/api/reports", {
      method: "POST",
      body: event.data,
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

async function submitReport() {
  await form.value?.submit();
}
</script>
