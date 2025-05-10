<template>
    <UFormGroup label="Agency" name="agency" description="Agency name, such as Muni or BART" required>
      <USelectMenu
        v-if="agencyOptions"
        v-model="selectedAgency"
        :loading="loading"
        :options="agencyOptions"
        searchable
        placeholder="Pick transit agency"
        option-attribute="agencyName"
        trailing
        :popper="{
          placement: isMobile ? 'top' : 'bottom'
        }"
      >
        <template #empty>
          Loading agencies
        </template>
      </USelectMenu>
    </UFormGroup>
  </template>

<script lang="ts">
import type { InferSelectModel } from "drizzle-orm";
import type { agency } from "~/db/gtfs-migrations/schema";
export type Agency = Pick<InferSelectModel<typeof agency>, 'agencyId' | 'agencyName'>;
</script>

<script setup lang="ts">
const loading = ref(false);
const selectedAgency = ref<Agency | undefined>();
const { isMobile } = useDevice();
const emit = defineEmits<{
  (e: 'onChange', selectedAgency: Agency | undefined): void
}>()

const { data: agencyOptions } = await useFetch('/api/gtfs/agencies')


</script>