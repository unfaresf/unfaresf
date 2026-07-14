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
        :providers="providers"
      />
    </UCard>
  </div>
</template>
```

```ts
const providers = computed<ButtonProps[]>(() => [{
  label: 'Sign in',
  icon: 'i-heroicons-finger-print',
  color: 'primary',
  variant: 'solid',
  loading: logging.value,
  onClick: signIn,
}]);
```

- **Passkey is modeled as AuthForm's single `provider`, not a form field.** Important
  gotcha discovered during implementation: `AuthForm` only renders its `<UForm>` (and
  thus the submit button / `#submit` slot) when `fields` is non-empty
  (`AuthForm.vue`: `<UForm v-if="props.fields?.length">`). A field-less passkey flow
  therefore can't use `submit`/`@submit` — the button never appears. The `providers`
  slot, by contrast, renders whenever `providers` is non-empty, independent of fields.
  So the passkey CTA is a single provider button whose `onClick` calls `signIn`.
- **No `fields`.** Passkeys are discoverable (resident-key), so sign-in needs no
  username input.
- **Script logic is unchanged.** `signIn()` still calls
  `authenticate() → fetch() → navigateTo('/reports')` with the same toast error
  handling. The existing `logging` ref drives the provider button's loading spinner
  via a `computed` provider list.
- **`UCard` wrapper** matches the rest of the app (`invite.vue`, `sign-up.vue`) for
  visual consistency; `max-w-sm` + `flex justify-center` gives the clean login look
  within the current nav layout.

## Constraints preserved

- The provider `label: 'Sign in'` keeps the accessible button name so the e2e test
  `test/e2e/public.public.spec.ts` — "sign-in page shows a passkey sign-in control"
  (`getByRole('button', { name: /sign in/i })`) still passes.
- No change to the WebAuthn `authenticate()` flow, so `global-setup.ts` and the authed
  e2e specs are unaffected.

## Verification

1. `npm run test:e2e` (or at minimum the public sign-in test) stays green.
2. Manual browser check of `/sign-in` rendering in light and dark mode, and that
   clicking "Sign in" still triggers the passkey ceremony.
