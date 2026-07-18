<!-- The style classes and exactActiveClass on links is because nuxt-ui <ULink> prefetch is broken -->
<template>
  <header class="hidden lg:block">
    <AuthState>
      <template #default="{ loggedIn }">
        <div v-if="loggedIn" class="w-full border-b border-default">
          <UContainer>
            <ul class="flex items-center justify-end">
              <li>
                <NuxtLink to="/" icon="i-heroicons-home"
                  exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-home" class="w-5 h-5 mr-1" />{{ user?.userName || '' }}
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/reports" icon="i-heroicons-home"
                  exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document-magnifying-glass" class="w-5 h-5 mr-1" />Reports
                </NuxtLink>
              </li>
              <ClientOnly>
                <li>
                  <notifications></notifications>
                </li>
                <template #fallback>
                  <!-- this will be rendered on server side -->
                  <li>
                    <UButton color="neutral" class="m-2" icon="i-heroicons-bell-slash" disabled />
                  </li>
                </template>
              </ClientOnly>
              <UDropdownMenu :items="authedDropdown" :content="{ side: 'bottom', align: 'end' }">
                <UButton color="neutral" variant="outline" icon="i-heroicons-bars-3" class="m-2" />
              </UDropdownMenu>
            </ul>
          </UContainer>
        </div>
        <div v-else class="w-full border-b border-default">
          <UContainer>
            <ul class="flex items-center justify-end">
              <li>
                <NuxtLink to="/" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document" class="w-5 h-5 mr-1" />Reports
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle'
                  exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1" />Sign In
                </NuxtLink>
              </li>
            </ul>
          </UContainer>
        </div>
      </template>
      <template #placeholder>
        <div class="w-full border-b border-default">
          <UContainer>
            <ul class="flex items-center justify-end">
              <li>
                <NuxtLink to="/" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document" class="w-5 h-5 mr-1" />Reports
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/report" icon="i-heroicons-document"
                  exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-document-plus" class="w-5 h-5 mr-1" />Report
                </NuxtLink>
              </li>
              <li>
                <NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle'
                  exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"
                  class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white">
                  <UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1" />Sign In
                </NuxtLink>
              </li>
            </ul>
          </UContainer>
        </div>
      </template>
    </AuthState>
  </header>
  <slot />
  <!-- Mobile bottom tab bar -->
  <nav aria-label="Primary" class="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-default bg-default pb-[env(safe-area-inset-bottom)]">
    <AuthState>
      <template #default="{ loggedIn }">
        <UNavigationMenu :items="loggedIn ? authedBarItems : loggedOutBarItems" class="w-full" :ui="barUi" highlight />
      </template>
      <template #placeholder>
        <UNavigationMenu :items="placeholderBarItems" class="w-full" :ui="barUi" />
      </template>
    </AuthState>
  </nav>
</template>

<style>
.unfaresf-full-screen {
  height: 100lvh;
  overflow: hidden;
}
</style>

<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui';
import { useMobileNav } from '~/composable/useMobileNav';

const { barUi, authedDropdown, authedBarItems, loggedOutBarItems, user } = useMobileNav();

// is this really the best way to do this?!
useHead({
  htmlAttrs: {
    class: 'unfaresf-full-screen'
  },
  bodyAttrs: {
    class: 'unfaresf-full-screen'
  }
});

// SSR placeholder for the mobile bar — mirrors this layout's desktop placeholder,
// which also includes a Report link.
const placeholderBarItems: NavigationMenuItem[] = [
  { label: 'Reports', icon: 'i-heroicons-document', to: '/' },
  { label: 'Report', icon: 'i-heroicons-document-plus', to: '/report' },
  { label: 'Sign In', icon: 'i-heroicons-arrow-right-end-on-rectangle', to: '/sign-in' },
];
</script>
