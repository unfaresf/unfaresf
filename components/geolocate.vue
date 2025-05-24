<template>
<div v-if="!permissionGranted" class="flex">
  <UButton class="mr-2" color="neutral" variant="subtle" label="Geolocate" :loadingAuto="true" @click="fetchLocation()" />
  <UPopover mode="hover" :open-delay="300" :close-delay="200" :content="{ side: 'top' }">
    <UButton color="neutral" variant="ghost" icon="i-heroicons-question-mark-circle" />
    <template #content>
      <div class="p-4 max-w-md">
        <p class="text-sm"><slot name="help">Use your location to improve your experience. You can always disable this. We do not store your location.</slot></p>
      </div>
    </template>
  </UPopover>
</div>
</template>

<script setup lang="ts">
const geoLocation = ref<GeolocationPosition>();
const permissionGranted = ref(false);

const emit = defineEmits<{
  (e: 'onGeolocate', route: GeolocationPosition): void,
  (e: 'onError', route: GeolocationPositionError): void
}>();

async function fetchLocation():Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        permissionGranted.value = true;
        geoLocation.value = position;
        emit('onGeolocate', position);
        resolve(position);
      },
      (error) => {
        emit('onError', error);
        reject(error);
      }
    );
  });
}

const geolocationPermissionStatus = await navigator.permissions.query({ name: "geolocation" });
if (geolocationPermissionStatus.state === "granted") {
  permissionGranted.value = true;
  await fetchLocation();
}
</script>
