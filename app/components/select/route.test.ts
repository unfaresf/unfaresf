import { it, expect, describe, afterEach } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { getQuery, type H3Event } from "h3";
import { SelectRoute, USelectMenu } from "#components";
import type { Agency } from "./agency.vue";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

// A prop change fires an async watcher (clear model -> await fetch -> assign
// options -> re-render). The fetch resolution adds a microtask boundary a single
// flush won't cross, so flush twice for the whole chain to settle.
const settle = async () => {
  await flushPromises();
  await flushPromises();
};

const muni: Agency = { agencyId: "muni", agencyName: "Muni" };

const geary = {
  routeId: "r38",
  routeShortName: "38",
  routeLongName: "Geary",
  agencyId: "muni",
  agencyName: "Muni",
  direction: "east",
  directionId: 0,
  headsign: "Downtown",
};

describe("SelectRoute", () => {
  it("fetches routes for the agency it is given and enriches them for the menu", async () => {
    let query: Record<string, unknown> | undefined;
    cleanups.push(
      registerEndpoint("/api/gtfs/routes", (event: H3Event) => {
        query = getQuery(event);
        return [geary];
      })
    );

    const component = await mountSuspended(SelectRoute, { props: { agency: muni } });
    await flushPromises();

    expect(query).toEqual({ agencyId: "muni" });
    // Options get the derived fields the menu needs to search/label/dedupe.
    expect(component.findComponent(USelectMenu).props("items")[0]).toMatchObject({
      routeId: "r38",
      searchString: "38 Geary Downtown",
      uniqueKey: "r38-0-Downtown",
      displayLabel: "38: Geary - Downtown",
    });
  });

  it("strips the derived fields back off the selected route before emitting", async () => {
    cleanups.push(registerEndpoint("/api/gtfs/routes", () => [geary]));

    const component = await mountSuspended(SelectRoute, { props: { agency: muni } });
    await flushPromises();

    const menu = component.findComponent(USelectMenu);
    // Select the exact enriched item the menu would emit on a pick.
    const enriched = menu.props("items")[0];
    menu.vm.$emit("update:modelValue", enriched);
    await flushPromises();

    // The model (and therefore the submitted report) must stay a clean Route
    // with no searchString/uniqueKey/displayLabel leaking through.
    expect(component.emitted("update:modelValue")![0]![0]).toEqual(geary);
  });

  it("clears the stale selection and refetches when the agency changes", async () => {
    const queries: Array<Record<string, unknown>> = [];
    const bartLine = {
      ...geary,
      routeId: "rN",
      routeShortName: "N",
      routeLongName: "Judah",
      agencyId: "bart",
      agencyName: "BART",
    };
    cleanups.push(
      registerEndpoint("/api/gtfs/routes", (event: H3Event) => {
        const q = getQuery(event);
        queries.push(q);
        return q.agencyId === "bart" ? [bartLine] : [geary];
      })
    );

    const component = await mountSuspended(SelectRoute, { props: { agency: muni } });
    await flushPromises();

    // Pick a route so there is something to clear.
    component
      .findComponent(USelectMenu)
      .vm.$emit("update:modelValue", component.findComponent(USelectMenu).props("items")[0]);
    await flushPromises();

    await component.setProps({ agency: { agencyId: "bart", agencyName: "BART" } });
    await settle();

    // The last emit resets the model to undefined...
    const emits = component.emitted("update:modelValue")!;
    expect(emits.at(-1)).toEqual([undefined]);
    // ...and routes were refetched, second time for the new agency.
    expect(queries.map((q) => q.agencyId)).toEqual(["muni", "bart"]);
    expect(component.findComponent(USelectMenu).props("items")[0]).toMatchObject({
      routeId: "rN",
    });
  });
});
