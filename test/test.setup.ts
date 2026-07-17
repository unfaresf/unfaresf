import { defineComponent } from "vue";
import { mockComponent } from "@nuxt/test-utils/runtime";
import { beforeAll, vi } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

beforeAll(() => {
  mockComponent("RoutesMap", () => {
    return defineComponent({
      default: {
        name: "RoutesMap",
        template: '<div data-testid="mocked-map">Mocked Map</div>',
      },
    });
  });
  mockComponent("Geolocate", () => {
    return defineComponent({
      default: {
        name: "Geolocate",
        template: '<div data-testid="mocked-geolocate">Mocked geolocate</div>',
      },
    });
  });
  // Nuxt UI v3 UTooltip needs a TooltipProvider from <UApp>, which isn't present
  // when mounting components in isolation. Render it as a passthrough so the
  // trigger content (e.g. the relative-time link) still renders.
  mockComponent("UTooltip", () => {
    return defineComponent({
      default: {
        name: "UTooltip",
        // The real UTooltip declares `text` (and other) props; this passthrough
        // does not, so those would fall through as attrs onto a fragment root
        // (`<slot />`) and trigger a Vue "Extraneous non-props attributes"
        // warning. We only render the trigger content, so drop fallthrough attrs.
        inheritAttrs: false,
        template: "<slot />",
      },
    });
  });
});

// Each test file runs in its own isolated Vitest module context, so
// server/sqlite-service instantiates a fresh SQLite connection per file. With
// DB_FILE_NAME=:memory: that is a private, empty in-memory database per file —
// clean isolation with no shared state, which lets test files run in parallel.
//
// Import the singleton lazily: sqlite-service reads useRuntimeConfig() at module
// load, which only works once the Nuxt test context exists (inside a hook, not
// at setup-file top level). This resolves to the same per-file :memory:
// connection the app code uses, so migrating it here creates the schema before
// any test queries it — a separate :memory: connection would be a different DB.
beforeAll(async () => {
  const { DB } = await import("../server/sqlite-service");
  migrate(DB, { migrationsFolder: "./db/migrations" });
});
