<template>
  <UContainer>
    <UCard class="mt-10">
      <div class="flex">
        <form
          class="flex flex-col gap-2"
          @submit.prevent="signIn"
        >
          <UFormGroup
            label="User Name"
            required
          >
            <UInput
              v-model="signInUserName"
            />
          </UFormGroup>
          <UButton
            type="submit"
            color="black"
            label="Sign in"
          />
        </form>
      </div>
    </UCard>
  </UContainer>
</template>

<script lang="ts" setup>
const { fetch } = useUserSession()
const { authenticate } = useWebAuthn()
const toast = useToast()

const logging = ref(false);
const signInUserName = ref('');

async function signIn() {
  if (logging.value) return
  logging.value = true
  await authenticate(signInUserName.value)
    .then(fetch)
    .then(async () => {
      await navigateTo('/');
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