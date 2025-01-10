<template>
  <UContainer>
    <UCard class="mt-10">
      <template #header>
        <h2 class="text-xl mb-4">Report Sighting</h2>
        <p>What service (Muni, BART, etc...), what line, where are they now and which way are they heading.</p>
      </template>
      <form class="flex flex-col gap-2" @submit.prevent="submit" autocomplete="off">
        <UFormGroup label="Message" required>
          <UInput v-model="message" autocomplete="false" placeholder="Muni, on the 38 headed west from Laguna"/>
        </UFormGroup>
        <UButton type="submit" label="Report Sighting" class="ml-auto" :disabled="disabled"/>
      </form>
    </UCard>
  </UContainer>
</template>

<script lang="ts" setup>
const toast = useToast();
const message = ref('');
const disabled = computed(() => message.value.length === 0);

async function submit() {
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: {
        message: message.value
      }
    });
    message.value = '';
    toast.add({
      color: 'green',
      title: 'Report successful'
    })
  } catch (err: any) {
    toast.add({
      color: 'red',
      title: err.data?.message || err.message,
    })
  }
}
</script>