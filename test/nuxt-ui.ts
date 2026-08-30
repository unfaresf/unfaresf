import type { ComponentOptions } from "vue";
import { USelectMenu as GenericUSelectMenu } from "#components";

// @nuxt/ui's SelectMenu is a generic SFC, so its type is a generic function
// rather than a component definition. vue-test-utils matches that against its
// functional-component overload and hands back a DOMWrapper, which has neither
// props() nor vm, even though the lookup itself works fine at runtime.
// Re-export the same component as plain component options — naming the one prop
// these tests read back — so findComponent() resolves to the overload that
// returns a VueWrapper.
export const USelectMenu = GenericUSelectMenu as unknown as ComponentOptions<{
  items: Record<string, unknown>[];
}>;
