<template>
  <UCard class="mt-10">
    <div class="flex">
      <form
        class="flex flex-col gap-2"
        @submit.prevent="signIn"
      >
        <UButton
          type="submit"
          color="black"
          label="Sign in"
        />
      </form>
    </div>
  </UCard>
</template>

<script lang="ts" setup>
const { fetch } = useUserSession()
const { authenticate } = useWebAuthn()
const toast = useToast()

useHead({
  title: 'UnfareSF - Sign In'
});

const logging = ref(false);

async function signIn() {
  if (logging.value) return
  logging.value = true
  await authenticate()
    .then(fetch)
    .then(async () => {
      await navigateTo('/reports');
    })
    .catch(err => {
      toast.add({
        color: 'red',
        title: err.data?.message || err.message,
      })
    })
  logging.value = false
}
</script>