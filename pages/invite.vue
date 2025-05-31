<template>
  <UCard class="mt-10">
    <p class="mb-4">Click the "Generate Invite" button to get an invite link. Share it privately with the person you want to add. It can only be used once and will expire after 24 hours.</p>
    <UButtonGroup size="xl" orientation="horizontal" class="mb-4">
      <UButton
        @click=getInvite
        label="Generate Invite"
        size="xl"
      />
      <UInput disabled placeholder="example.com" v-model="inviteURL" />
      <UButton icon="i-heroicons-clipboard-document" color="gray" @click="copyToClipboard" :disabled="!inviteURL"/>
    </UButtonGroup>
  </UCard>
</template>

<script lang="ts" setup>
const inviteURL = ref('');

definePageMeta({
  middleware: ['auth']
});

useHead({
  title: 'UnfareSF - Invite'
});

async function getInvite() {
  const res = await $fetch('/api/invite', {
    method: 'POST'
  });
  const currentUrl = useRequestURL();
  inviteURL.value = `${currentUrl.origin}/sign-up?invite-id=${res.id}`;
}

async function copyToClipboard() {
  return navigator.clipboard.writeText(inviteURL.value);
}
</script>