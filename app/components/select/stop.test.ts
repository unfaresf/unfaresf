import { vi, it, expect, describe, afterEach } from "vitest";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { getQuery, type H3Event } from "h3";
import { SelectStop, USelectMenu } from "#components";
import type { Agency } from "./agency.vue";
import type { Route } from "./route.vue";

const cleanups: Array<() => void> = [];
afterEach(() => {
  // Always restore real timers even if a fake-timer test threw mid-way.
  vi.useRealTimers();
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

const gearyRoute: Route = {
  routeId: "r38",
  routeShortName: "38",
  routeLongName: "Geary",
  direction: "east",
  directionId: 0,
  headsign: "Downtown",
};

const mission = { stopId: "s1", stopName: "Mission", direction: "north", directionId: 0 };

describe("SelectStop", () => {
  it("loads the route's stops on mount when a route is provided", async () => {
    let query: Record<string, unknown> | undefined;
    cleanups.push(
      registerEndpoint("/api/gtfs/stops", (event: H3Event) => {
        query = getQuery(event);
        return [mission];
      })
    );

    const component = await mountSuspended(SelectStop, {
      props: { agency: muni, route: gearyRoute },
    });
    await flushPromises();

    expect(query).toEqual({ routeId: "r38", directionId: "0" });
    expect(component.findComponent(USelectMenu).props("items")[0]).toMatchObject({
      stopId: "s1",
      displayLabel: "Mission - north",
    });
  });

  it("strips the derived label off the selected stop before emitting", async () => {
    cleanups.push(registerEndpoint("/api/gtfs/stops", () => [mission]));

    const component = await mountSuspended(SelectStop, {
      props: { agency: muni, route: gearyRoute },
    });
    await flushPromises();

    const menu = component.findComponent(USelectMenu);
    menu.vm.$emit("update:modelValue", menu.props("items")[0]);
    await flushPromises();

    // The model stays a clean Stop with no displayLabel.
    expect(component.emitted("update:modelValue")![0]![0]).toEqual(mission);
  });

  it("searches agency-wide (debounced) as the user types when there is no route", async () => {
    vi.useFakeTimers();
    const queries: Array<Record<string, unknown>> = [];
    cleanups.push(
      registerEndpoint("/api/gtfs/stops/search", (event: H3Event) => {
        queries.push(getQuery(event));
        return [mission];
      })
    );

    const component = await mountSuspended(SelectStop, { props: { agency: muni } });
    await flushPromises();

    // No route => no route-stops request and nothing typed yet => no search.
    expect(queries).toHaveLength(0);

    // The search term is a v-model on the inner menu; typing updates it.
    component.findComponent(USelectMenu).vm.$emit("update:searchTerm", "miss");

    // The search is debounced: it must NOT fire before the 500ms window elapses.
    await vi.advanceTimersByTimeAsync(499);
    expect(queries).toHaveLength(0);

    // Once the debounce window passes, the agency-wide search fires.
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();

    expect(queries).toEqual([{ q: "miss", agencyId: "muni" }]);
    expect(component.findComponent(USelectMenu).props("items")[0]).toMatchObject({
      displayLabel: "Mission - north",
    });
  });

  it("clears the stale selection and reloads stops when the route changes", async () => {
    const queries: Array<Record<string, unknown>> = [];
    const ferryStop = { stopId: "s2", stopName: "Embarcadero", direction: "west", directionId: 1 };
    cleanups.push(
      registerEndpoint("/api/gtfs/stops", (event: H3Event) => {
        const q = getQuery(event);
        queries.push(q);
        return q.routeId === "r5" ? [ferryStop] : [mission];
      })
    );

    const component = await mountSuspended(SelectStop, {
      props: { agency: muni, route: gearyRoute },
    });
    await flushPromises();

    // Pick a stop so there is something to clear.
    component
      .findComponent(USelectMenu)
      .vm.$emit("update:modelValue", component.findComponent(USelectMenu).props("items")[0]);
    await flushPromises();

    await component.setProps({
      agency: muni,
      route: { ...gearyRoute, routeId: "r5", directionId: 1 },
    });
    await settle();

    const emits = component.emitted("update:modelValue")!;
    expect(emits.at(-1)).toEqual([undefined]);
    expect(queries.map((q) => q.routeId)).toEqual(["r38", "r5"]);
    expect(component.findComponent(USelectMenu).props("items")[0]).toMatchObject({
      stopId: "s2",
    });
  });
});
