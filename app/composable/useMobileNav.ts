import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import { useNotifications } from '~/composable/useNotifications';

// Shared state for the mobile bottom tab bar, consumed by both layouts
// (`app/layouts/default.vue` and `app/layouts/full-screen.vue`). Extracted because
// the bar is driven by `UNavigationMenu` `children`/`onSelect` (no nested
// interactive elements), so the old "edit in place, don't share" rationale no
// longer applies. The only per-layout difference is the SSR placeholder item set,
// which each layout keeps locally and passes to the bar's `#placeholder` branch.
export function useMobileNav() {
  const { clear, user } = useUserSession();
  const { supported, subscribed, ready, bellIcon, toggle, disableNotifications } = useNotifications();

  async function logout() {
    try {
      await disableNotifications();
    } catch (err) {
      console.debug('error disabling notifications during logout', err);
    }

    await clear();
    return navigateTo('/sign-in');
  }

  const authedDropdown = computed<DropdownMenuItem[]>(() => {
    const isAdmin = user.value ? user.value.roles.includes('Admin') : false;
    return [
      { label: 'Invite', icon: 'i-heroicons-envelope-open', to: '/invite', disabled: !isAdmin },
      { label: 'Settings', icon: 'i-heroicons-adjustments-horizontal', to: '/settings', disabled: !isAdmin },
      { label: 'Logout', icon: 'i-heroicons-arrow-right-start-on-rectangle', onSelect: () => { logout().catch((e) => console.error(e)); } },
    ];
  });

  // One UNavigationMenu owns the whole bar so every tab is sized and aligned by the
  // framework. `item: flex-1` makes the four tabs equal width; the link is stacked
  // icon-over-label and centered. Alerts toggles push via onSelect; Menu opens its
  // items as a native submenu (children).
  const barUi = {
    root: 'py-0 [&>div]:w-full',
    list: 'w-full',
    item: 'flex-1 py-0',
    link: 'w-full flex-col items-center justify-center gap-1 px-1',
    linkLeadingIcon: 'size-5',
    linkLabel: 'text-[10px]/3 font-normal text-center',
    linkTrailingIcon: 'hidden',
    // The submenu (Menu tab's children) otherwise opens below the trigger, which is
    // off-screen for a bottom bar — flip its viewport above the bar.
    viewportWrapper: 'top-auto bottom-full',
    childList: 'grid-cols-1',
    childLink: 'justify-center',
  };

  const authedBarItems = computed<NavigationMenuItem[]>(() => [
    { label: user.value?.userName || 'Home', icon: 'i-heroicons-home', to: '/', exact: true },
    { label: 'Reports', icon: 'i-heroicons-document-magnifying-glass', to: '/reports' },
    {
      label: 'Alerts',
      icon: bellIcon.value,
      // Always render the Alerts tab so the bar never reflows. It stays disabled
      // until the async support/subscription check resolves — and on browsers
      // without push support, where tapping would throw on
      // `Notification.requestPermission` — mirroring the desktop bell's disabled
      // fallback. Once `ready` (and supported) it enables and shows the real state.
      disabled: !ready.value || !supported.value,
      // Expose the on/off state to assistive tech — the icon swap is invisible to
      // screen readers. `aria-label` is forwarded by `pickLinkProps` (it picks
      // `aria-*` keys), so this reaches the rendered link element.
      'aria-label': subscribed.value ? 'Alerts, notifications on' : 'Alerts, notifications off',
      onSelect: () => { toggle().catch((e) => console.error(e)); },
    },
    { label: 'Menu', icon: 'i-heroicons-bars-3', children: authedDropdown.value },
  ]);

  const loggedOutBarItems: NavigationMenuItem[] = [
    { label: 'Reports', icon: 'i-heroicons-document', to: '/' },
    { label: 'Sign In', icon: 'i-heroicons-arrow-right-end-on-rectangle', to: '/sign-in' },
  ];

  return {
    barUi,
    authedDropdown,
    authedBarItems,
    loggedOutBarItems,
    user,
  };
}
