<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="userUpdateSchema" :state="state" class="space-y-4 flex flex-col" @submit="onSubmit">
      <UFormField label="Username" name="username">
        <UInput disabled v-model="props.user.userName" />
      </UFormField>

      <UFormField label="Roles" name="roles">
        <USelectMenu v-model="state.roles" :items="roles" multiple>
          <template #label>
            <span v-if="state.roles.length" class="truncate">{{ state.roles.join(', ') }}</span>
            <span v-else>Select roles</span>
          </template>
        </USelectMenu>
      </UFormField>

      <div class="self-end">
        <UButton @click="deleteUser(props.user.id)" color="error" icon="i-heroicons-trash" :disabled="(props.user.id === user?.id) || loading" :loading="loading">
          Delete
        </UButton>
        <UButton type="submit" class="self-end ml-4" icon="i-heroicons-pencil-square" :disabled="(props.user.id === user?.id) || loading" :loading="loading">
          Save
        </UButton>
      </div>
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
const emit = defineEmits<{
  (e: 'onDeleteUser', userId:number): void
}>()

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

async function deleteUser(userId:number) {
  try {
    loading.value = true;
    await $fetch(`/api/users/${userId}`, {
      method: 'delete'
    });
    toast.add({
      color: 'success',
      title: 'User deleted'
    });
    emit('onDeleteUser', userId);
  } catch (err:any) {
    toast.add({
      color: 'error',
      title: 'Error deleting user',
      description: err.message
    });
  }
  finally {
    loading.value = false;
  }
}

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
      color: 'success',
      title: 'Update successful'
    });
  } catch (err:any) {
    toast.add({
      color: 'error',
      title: 'Error updating user',
      description: err.message
    });
  }
  finally {
    loading.value = false;
  }
}
</script>