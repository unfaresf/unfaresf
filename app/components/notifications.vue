<template>
  <div v-if="supported">
    <UTooltip :text="tooltipText">
      <UButton
        :loading="loading"
        :color="permissionGranted ? 'neutral' : 'primary'"
        :variant="permissionGranted ? 'outline' : 'solid'"
        class="m-2"
        :icon="bellIcon"
        @click="toggle"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import { useNotifications } from '~/composable/useNotifications';

const {
  loading,
  supported,
  permissionGranted,
  tooltipText,
  bellIcon,
  toggle,
} = useNotifications();
</script>
