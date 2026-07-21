import { it, expect, describe, afterEach } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { SelectAgency, USelectMenu } from "#components";

// registerEndpoint handlers live on the shared test app for the whole file;
// collect each registration's unregister fn so a handler never leaks into the
// next test.
const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

// Deliberately out of alphabetical order so the component's sort has to do real
// work rather than echo the response order back.
const agencies = [
  { agencyId: "muni", agencyName: "Muni" },
  { agencyId: "bart", agencyName: "BART" },
  { agencyId: "actransit", agencyName: "AC Transit" },
];

describe("SelectAgency", () => {
  it("fetches agencies and hands the menu a labelled, sorted list", async () => {
    cleanups.push(registerEndpoint("/api/gtfs/agencies", () => agencies));

    const component = await mountSuspended(SelectAgency);
    await flushPromises();

    // Each option gains an `agencyLabel` (falling back to agencyName with no
    // alt-name override) and the list is sorted by that label.
    const menu = component.findComponent(USelectMenu);
    expect(menu.props("items")).toEqual([
      { agencyId: "actransit", agencyName: "AC Transit", agencyLabel: "AC Transit" },
      { agencyId: "bart", agencyName: "BART", agencyLabel: "BART" },
      { agencyId: "muni", agencyName: "Muni", agencyLabel: "Muni" },
    ]);
  });

  it("emits the chosen agency to its v-model when a selection is made", async () => {
    cleanups.push(registerEndpoint("/api/gtfs/agencies", () => agencies));

    const component = await mountSuspended(SelectAgency);
    await flushPromises();

    // Picking an item in USelectMenu is just a v-model update; emit it directly
    // instead of driving the teleported popover.
    const chosen = { agencyId: "bart", agencyName: "BART", agencyLabel: "BART" };
    component.findComponent(USelectMenu).vm.$emit("update:modelValue", chosen);
    await flushPromises();

    const emitted = component.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toMatchObject({ agencyId: "bart", agencyName: "BART" });
  });
});
