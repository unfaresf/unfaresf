<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="userUpdateSchema" :state="state" class="space-y-4 flex flex-col" @submit="onSubmit">
      <UFormGroup label="Username" name="username">
        <UInput disabled v-model="props.user.userName" />
      </UFormGroup>

      <UFormGroup label="Roles" name="roles">
        <USelectMenu v-model="state.roles" :options="roles" multiple>
          <template #label>
            <span v-if="state.roles.length" class="truncate">{{ state.roles.join(', ') }}</span>
            <span v-else>Select roles</span>
          </template>
        </USelectMenu>
      </UFormGroup>

      <UButton type="submit" class="self-end" icon="i-heroicons-pencil-square" :disabled="(props.user.id === user?.id) || loading" :loading="loading">
        Save
      </UButton>
    </UForm>
  </UContainer>
</template>

<script setup lang="ts">
import { type GetUser, Roles } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

const props = defineProps<{
  user: GetUser,
}>();

const userUpdateSchema = z.object({
  roles: z.string().array(),
});
type userUpdateSchema = z.output<typeof userUpdateSchema>;

const loading = ref(false);
const { user } = useUserSession();
const toast = useToast();
const roles = Object.values(Roles);
const state = ref({
  roles: props.user.roles
});

async function onSubmit(event: FormSubmitEvent<userUpdateSchema>) {
  try {
    loading.value = true;
    await $fetch(`/api/users/${props.user.id}`, {
      method: 'put',
      body: {
        roles: event.data.roles
      }
    });
    toast.add({
      color: 'green',
      title: 'Update successful'
    });
  } catch (err:any) {
    toast.add({
      color: 'red',
      title: 'Error updating user',
      description: err.message
    });
  }
  finally {
    loading.value = false;
  }
}
</script>