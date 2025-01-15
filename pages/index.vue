<template>
  <UContainer>
    <UCard class="mt-10">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>What service (Muni, BART, etc...), what line, where are they now and which way are they heading.</p>
      </template>
      <UForm class="flex flex-col gap-2 max-w-prose"  @submit="submit" :state="formState" :schema="reportSchema">
        <UFormGroup label="Route" name="route" help="Route name, e.g. 38 Geary or Bart Green line" required>
          <UInput v-model="formState.route" autocomplete="false" placeholder="22 Fillmore" />
        </UFormGroup>
        <UFormGroup label="Stop" name="stop" help="Current stop, e.g. Geary Blvd & 36th Ave or 16th & Mission" required>
          <UInput v-model="formState.stop" autocomplete="false" placeholder="Geary Blvd & 45th Ave " />
        </UFormGroup>
        <UFormGroup label="Direction" name="direction" help="Cardinal direction of inspectors, e.g. west or south" required>
          <USelect v-model="formState.direction" :options="['North', 'South', 'East', 'West']" />
        </UFormGroup>
        <UFormGroup label="Passenger" name="passenger" help="Are inspectors currently in the transit vehical?" required>
          <UToggle v-model="formState.passenger" />
        </UFormGroup>
        <UButton type="submit" label="Report Sighting" class="ml-auto" :disabled="submitting"/>
      </UForm>
    </UCard>
  </UContainer>
</template>

<script lang="ts" setup>
import { z } from "zod";
import type { FormSubmitEvent } from '#ui/types'

const toast = useToast();
const initialFormState = {
  route: undefined,
  stop: undefined,
  direction: undefined,
  passenger: false,
};
const formState = reactive({...initialFormState});
const submitting = ref(false);

const reportSchema = z.object({
  route: z.string().trim().nonempty("Must include route name").max(512),
  stop: z.string().trim().nonempty("Must include stop location").max(512),
  direction: z.enum(["North", "South", "East", "West"]),
  passenger: z.boolean(),
}).required();

type reportPostSchema = z.output<typeof reportSchema>

async function submit(event: FormSubmitEvent<reportPostSchema>) {
  submitting.value = true;
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: event.data
    });
    Object.assign(formState, initialFormState);
    toast.add({
      color: 'green',
      title: 'Report successful'
    })
  } catch (err: any) {
    toast.add({
      color: 'red',
      title: err.data?.message || err.message,
    });
  } finally {
    submitting.value = false;
  }
}
</script>