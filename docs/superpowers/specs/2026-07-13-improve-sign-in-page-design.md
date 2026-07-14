# Improve the sign-in page with Nuxt UI AuthForm

Issue: [#221](https://github.com/unfaresf/unfaresf/issues/221) — "improve login/sign up page"

## Problem

The [sign-in page](https://unfaresf.org/sign-in) is a bare `UCard` containing a single
"Sign in" button. It looks unfinished. The issue asks us to investigate Nuxt UI's
[AuthForm](https://ui.nuxt.com/docs/components/auth-form) component. Auth remains
passkey-only; there is no plan to add other methods.

## Scope

Sign-in page only (`app/pages/sign-in.vue`). The sign-up page is left as-is. No layout,
config, or test changes.

## Design

Replace the bare card + button in `app/pages/sign-in.vue` with a centered `UAuthForm`
wrapped in a `UCard`, keeping the existing default layout (nav header stays).

```vue
<template>
  <div class="flex justify-center">
    <UCard class="mt-10 w-full max-w-sm">
      <UAuthForm
        icon="i-heroicons-finger-print"
        title="Sign in"
        description="Use your passkey to sign in to UnfareSF."
        :submit="{ label: 'Sign in' }"
        :loading="logging"
        @submit="signIn"
      />
    </UCard>
  </div>
</template>
```

- **No `fields`.** Passkeys are discoverable (resident-key), so sign-in needs no
  username. AuthForm renders icon + title + description + submit button — exactly the
  polished panel the issue wants.
- **Script logic is unchanged.** `signIn()` still calls
  `authenticate() → fetch() → navigateTo('/reports')` with the same toast error
  handling; it ignores the emitted `FormSubmitEvent`. The existing `logging` ref now
  also drives the submit button's loading spinner via `:loading`.
- **`UCard` wrapper** matches the rest of the app (`invite.vue`, `sign-up.vue`) for
  visual consistency; `max-w-sm` + `flex justify-center` gives the clean login look
  within the current nav layout.

## Constraints preserved

- `submit.label: 'Sign in'` keeps the accessible button name so the e2e test
  `test/e2e/public.public.spec.ts` — "sign-in page shows a passkey sign-in control"
  (`getByRole('button', { name: /sign in/i })`) still passes.
- No change to the WebAuthn `authenticate()` flow, so `global-setup.ts` and the authed
  e2e specs are unaffected.

## Verification

1. `npm run test:e2e` (or at minimum the public sign-in test) stays green.
2. Manual browser check of `/sign-in` rendering in light and dark mode, and that
   clicking "Sign in" still triggers the passkey ceremony.
