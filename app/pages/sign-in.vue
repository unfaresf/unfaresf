<template>
  <div class="flex justify-center">
    <UCard class="mt-10 w-full max-w-sm">
      <UAuthForm
        icon="i-heroicons-finger-print"
        title="Sign in"
        description="Use your passkey to sign in to UnfareSF."
        :providers="providers"
      />
    </UCard>
  </div>
</template>

<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

const { fetch } = useUserSession()
const { authenticate } = useWebAuthn()
const toast = useToast()

useHead({
  title: 'UnfareSF - Sign In'
});

const logging = ref(false);

// Passkey is our only auth method, so we model it as AuthForm's single
// "provider". AuthForm only renders its form/submit button when `fields` are
// present; a field-less passkey flow uses the providers slot instead.
const providers = computed<ButtonProps[]>(() => [{
  label: 'Sign in',
  icon: 'i-heroicons-finger-print',
  color: 'primary',
  variant: 'solid',
  loading: logging.value,
  onClick: signIn,
}]);

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
        color: 'error',
        title: err.data?.message || err.message,
      })
    })
  logging.value = false
}
</script>
