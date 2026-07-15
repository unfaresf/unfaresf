<!-- The style classes and exactActiveClass on links is because nuxt-ui <ULink> prefetch is broken -->
<template>
  <UContainer class="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
    <header class="hidden lg:block">
      <AuthState>
          <template #default="{ loggedIn }">
            <div v-if="loggedIn" class="flex">
              <ul class="w-full flex items-center justify-end border-b border-default">
                <li><NuxtLink to="/" icon="i-heroicons-home" exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"><UIcon name="i-heroicons-home" class="w-5 h-5 mr-1"/>{{user?.userName  || ''}}</NuxtLink></li>
                <li><NuxtLink to="/reports" icon="i-heroicons-home" exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"><UIcon name="i-heroicons-document-magnifying-glass" class="w-5 h-5 mr-1"/>Reports</NuxtLink></li>
                <ClientOnly>
                  <li><notifications></notifications></li>
                  <template #fallback>
                    <!-- this will be rendered on server side -->
                    <li><UButton color="neutral" class="m-2" icon="i-heroicons-bell-slash" disabled /></li>
                  </template>
                </ClientOnly>
                <UDropdownMenu :items="authedDropdown" :content="{ side: 'bottom', align: 'end' }">
                  <UButton color="neutral" variant="outline" icon="i-heroicons-bars-3" class="m-2" />
                </UDropdownMenu>
              </ul>
            </div>
            <ul v-else class="w-full flex items-center justify-end border-b border-default">
              <li><NuxtLink to="/" icon="i-heroicons-document" exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"><UIcon name="i-heroicons-document" class="w-5 h-5 mr-1"/>Reports</NuxtLink></li>
              <li><NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle' exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"><UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1"/>Sign In</NuxtLink></li>
            </ul>
          </template>
          <template #placeholder>
            <ul class="w-full flex items-center justify-end border-b border-default">
              <li><NuxtLink to="/" icon="i-heroicons-document" exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"><UIcon name="i-heroicons-document" class="w-5 h-5 mr-1"/>Reports</NuxtLink></li>
              <li><NuxtLink to="/sign-in" icon='i-heroicons-arrow-right-end-on-rectangle' exactActiveClass="!border-primary-500 text-highlighted dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white" class="flex px-2.5 py-3.5 font-medium text-sm text-neutral-500 box-border border-b-2 border-transparent hover:bg-neutral-50 hover:text-neutral-900 dark:hover:bg-neutral-800/50 dark:text-neutral-400 dark:hover:text-white"><UIcon name="i-heroicons-arrow-right-end-on-rectangle" class="w-5 h-5 mr-1"/>Sign In</NuxtLink></li>
            </ul>
          </template>
      </AuthState>
    </header>
    <slot />
    <footer>
      <div class="py-2"></div>
    </footer>
    <!-- Mobile bottom tab bar -->
    <nav aria-label="Primary" class="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-default bg-default pb-[env(safe-area-inset-bottom)]">
      <AuthState>
        <template #default="{ loggedIn }">
          <UNavigationMenu :items="loggedIn ? authedBarItems : loggedOutBarItems" class="w-full" :ui="barUi" />
        </template>
        <template #placeholder>
          <UNavigationMenu :items="placeholderBarItems" class="w-full" :ui="barUi" />
        </template>
      </AuthState>
    </nav>
  </UContainer>
</template>

<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui';
import { useMobileNav } from '~/composable/useMobileNav';

const { barUi, authedDropdown, authedBarItems, loggedOutBarItems, user } = useMobileNav();

// SSR placeholder for the mobile bar — mirrors this layout's logged-out desktop
// placeholder. The bar's authed/logged-out items come from useMobileNav.
const placeholderBarItems: NavigationMenuItem[] = loggedOutBarItems;
</script>