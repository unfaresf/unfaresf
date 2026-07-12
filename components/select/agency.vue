<template>
  <UFormField
    ref="agency-select"
    label="Agency"
    name="agency"
    description="Agency name, such as Muni or BART"
    required
  >
    <USelectMenu
      class="mt-2"
      v-if="agencyOptions"
      v-model="agency"
      @update:open="(open: boolean) => open && onOpen()"
      :loading="loading"
      :items="(agencyOptions as any)"
      by="agencyId"
      placeholder="Pick transit agency"
      label-key="agencyLabel"
      :filter-fields="['agencyLabel']"
      trailing
      :content="{ side: isMobile ? 'top' : 'bottom' }"
    >
      <template #empty> Loading agencies... </template>
    </USelectMenu>
  </UFormField>
</template>

<script lang="ts">
import { z } from "zod";
import { useAgencyAltNames } from "~/composable/config";
import { useScrollOnOpen } from "~/composable/scroll";

export const agencySchema = z.object({
  agencyId: z.string(),
  agencyName: z.string(),
});
export type Agency = z.infer<typeof agencySchema>;
</script>

<script setup lang="ts">
const loading = ref(false);
const { isMobile } = useDevice();
const agencySelect = useTemplateRef('agency-select');

let onOpen = () => {};
onMounted(() => {
  if (agencySelect.value) {
    onOpen = useScrollOnOpen(agencySelect.value.$el);
  }
});

const agency = defineModel<Agency>();
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
