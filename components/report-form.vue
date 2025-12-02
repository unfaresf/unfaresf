<template>
  <UForm
    class="flex flex-col gap-4 max-w-prose"
    ref="form"
    :state="formState"
    :schema="reportSchema"
  >
    <SelectAgency v-model="formState.agency" />
    <UFormGroup
      v-if="formState.agency"
      label="Inspectors onboard"
      description="Are fare inspectors currently onboard a transit vehicle?"
      name="passenger"
    >
      <URadioGroup
        class="mt-2"
        v-model="formState.passenger"
        :ui="{ fieldset: 'flex flex-row justify-between gap-4' }"
        :ui-radio="{
          wrapper: 'border border-solid border-gray-700 rounded-md p-2',
        }"
        :options="[
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]"
      />
    </UFormGroup>
    <SelectRoute
      v-if="formState.agency && formState.passenger"
      :agency="formState.agency"
      v-model="formState.route"
    />
    <SelectStop
      v-if="
        formState.agency && (formState.passenger === false || formState.route)
      "
      :agency="formState.agency"
      :route="formState.route"
      :geo="geolocation"
      v-model="formState.stop"
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

defineProps<{ geolocation?: GeolocationPosition }>();

const form = ref<Form<ReportPostSchema>>();
const formState = defineModel<Partial<ReportPostSchema>>({ required: true });

watch(
  () => formState.value.passenger,
  (newPassenger, oldPassenger) => {
    if (newPassenger !== oldPassenger) {
      formState.value.route = undefined;
      formState.value.stop = undefined;
    }
  }
);
</script>
