<template>
  <UFormGroup
    label="Agency"
    name="agency"
    description="Agency name, such as Muni or BART"
    required
  >
    <USelectMenu
      v-if="agencyOptions"
      v-model="agency"
      :loading="loading"
      :options="agencyOptions"
      searchable
      placeholder="Pick transit agency"
      option-attribute="agencyLabel"
      trailing
      :popper="{
        placement: isMobile ? 'top' : 'bottom',
      }"
    >
      <template #empty> Loading agencies... </template>
    </USelectMenu>
  </UFormGroup>
</template>

<script lang="ts">
import { z } from "zod";
import { useAgencyAltNames } from "~/composable/config";

export const agencySchema = z.object({
  agencyId: z.string(),
  agencyName: z.string(),
});
export type Agency = z.infer<typeof agencySchema>;
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();

const props = defineProps<{
  modelValue?: Agency;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: Agency): void;
}>();

const agency = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (value) {
      emit("update:modelValue", value);
    }
  },
});
const agencyAltNames = useAgencyAltNames();

const { data: agencyOptions } = await useFetch("/api/gtfs/agencies", {
  transform: (data) =>
    data
      .map((agency) => ({
        ...agency,
        agencyLabel:
          agency.agencyId in agencyAltNames
            ? agencyAltNames[agency.agencyId]!
            : agency.agencyName,
      }))
      .sort((a, b) =>
        a.agencyLabel > b.agencyLabel
          ? 1
          : b.agencyLabel > a.agencyLabel
          ? -1
          : 0
      ),
});
</script>
