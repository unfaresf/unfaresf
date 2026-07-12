<template>
  <UCard class="mt-10">
    <div class="flex">
      <form
        class="flex flex-col gap-2"
        @submit.prevent="signUp"
      >
        <UFormField
          label="User Name"
          required
          :error="formError"
        >
          <UInput
            v-model="signUpUserName"
            name="username"
          />
        </UFormField>
        <UButton
          type="submit"
          color="neutral"
          label="Sign up"
        />
      </form>
    </div>
  </UCard>
</template>

<script lang="ts" setup>
const { fetch } = useUserSession()
const { register } = useWebAuthn()
const toast = useToast()
const { query } = useRoute();

useHead({
  title: 'UnfareSF - Sign Up'
});

const logging = ref(false);
const signUpUserName = ref('');
const formError = ref('');

async function signUp() {
  if (logging.value || !signUpUserName.value) return
  logging.value = true

  try {
    await register({
      userName: signUpUserName.value,
      inviteId: query['invite-id']
    });
    await fetch();
    await navigateTo('/');
  } catch (err: any) {
    toast.add({
      color: 'error',
      title: err.data?.message || err.message,
    });
    formError.value = err.data?.message || err.message;
  } finally {
    logging.value = false
  }
}
</script>