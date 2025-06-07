<template>
  <UForm
    class="flex flex-col gap-2 max-w-prose"
    ref="form"
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
  </UForm>
</template>

<script lang="ts">
export const reportSchema = z.object({
  agency: agencySchema,
  route: routeSchema.optional(),
  stop: stopSchema,
  passenger: z.boolean(),
});
export type ReportPostSchema = z.infer<typeof reportSchema>;
</script>

<script lang="ts" setup>
import { z } from "zod";
import type { Form } from "#ui/types";
import { type Route, routeSchema } from "../components/select/route.vue";
import { type Stop, stopSchema } from "../components/select/stop.vue";
import { agencySchema, type Agency } from "./select/agency.vue";

const props = defineProps({
  geoLocation: GeolocationPosition,
});

const form = ref<Form<ReportPostSchema>>();
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
</script>
