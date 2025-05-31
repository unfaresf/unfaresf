<template>
  <UContainer :ui="{base: 'mx-auto', padding: 'py-4', constrained: 'max-w-lg'}">
    <UForm :schema="userUpdateSchema" :state="state" class="space-y-4 flex flex-col" @submit="onSubmit">
      <div class="w-full md:w-1/3">
        <UFormField label="Username" name="username">
          <UInput disabled v-model="state.userName" class="w-full" />
        </UFormField>

        <UFormField label="Roles" name="roles">
          <USelectMenu v-model="state.roles" :items="roles" multiple class="w-full" />
        </UFormField>
      </div>

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
import { type GetUser, Roles, type Prettify } from '../db/schema';
import type { FormSubmitEvent } from '#ui/types';
import { z } from 'zod';

const props = defineProps<{
  user: Prettify<Omit<GetUser, 'createdAt'> & { hasActiveSubscription: boolean; createdAt: string; }>,
}>();

const emit = defineEmits<{
  onDeleteUser: [number],
  onChangeRoles: [void],
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
  roles: props.user.roles,
  userName: props.user.userName,
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
    emit('onChangeRoles');
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