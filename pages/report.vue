<template>
  <div class="grid grid-cols-8 gap-4 mt-4">
    <UCard class="col-span-8 lg:col-span-5 xs:mt-10 md:mt-0">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>
          Use this form to report fare inspectors on San Francisco Bay Area
          public transit.
        </p>
      </template>
      <ReportForm
        :geolocation="geolocation"
        @on-change="(newFormState:Partial<ReportPostSchema>) => reportFormState = newFormState"
      />
      <div class="flex mt-4">
        <ClientOnly>
          <geolocate
            @on-geolocate="(newGeolocation) => (geolocation = newGeolocation)"
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
          v-if="formValid"
          type="submit"
          label="Submit"
          class="ml-auto"
          @click="() => onSubmit(reportFormState as ReportPostSchema)"
          :disabled="submitting"
        />
      </div>
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import {
  reportSchema,
  type ReportPostSchema,
} from "~/components/report-form.vue";
import { useReportSubmit } from "~/composable/reportSubmit";

useHead({
  title: "UnfareSF - Report",
});

const { submitting, onSubmit } = useReportSubmit();
const reportFormState = ref<Partial<ReportPostSchema>>({ passenger: false });

const formValid = computed(() => {
  return reportSchema.safeParse(reportFormState.value).success;
});

const geolocation = ref<GeolocationPosition>();
</script>
