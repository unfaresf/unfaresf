import { it, expect, describe, afterEach } from "vitest";
import { reactive } from "vue";
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { SelectAgency, SelectRoute, SelectStop } from "#components";
import ReportForm, {
  reportSchema,
  type ReportPostSchema,
} from "./report-form.vue";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

const muni = { agencyId: "muni", agencyName: "Muni" };
const geary = {
  routeId: "r38",
  routeShortName: "38",
  routeLongName: "Geary",
  direction: "east",
  directionId: 0,
  headsign: "Downtown",
};
const mission = { stopId: "s1", stopName: "Mission", direction: "north", directionId: 0 };

// The child selects fetch their own options on mount; stub every GTFS endpoint
// they might reach so mounting never hits the network.
function registerGtfs() {
  cleanups.push(registerEndpoint("/api/gtfs/agencies", () => [muni]));
  cleanups.push(
    registerEndpoint("/api/gtfs/routes", () => [
      { ...geary, agencyId: "muni", agencyName: "Muni" },
    ])
  );
  cleanups.push(registerEndpoint("/api/gtfs/stops", () => [mission]));
  cleanups.push(registerEndpoint("/api/gtfs/stops/search", () => [mission]));
}

// Mount with a reactive model, mirroring how the report page provides v-model.
// The children mutate this shared object in place, so it doubles as a probe for
// events flowing up out of the child selects.
async function mountForm(initial: Partial<ReportPostSchema> = { passenger: false }) {
  registerGtfs();
  const state = reactive({ ...initial }) as Partial<ReportPostSchema>;
  const component = await mountSuspended(ReportForm, { props: { modelValue: state } });
  await flushPromises();
  return { component, state };
}

const switches = (c: Awaited<ReturnType<typeof mountForm>>["component"]) =>
  c.findAll("button[role=switch]");

describe("ReportForm", () => {
  it("shows only the agency select until an agency is chosen", async () => {
    const { component } = await mountForm();

    expect(component.findComponent(SelectAgency).exists()).toBe(true);
    expect(switches(component)).toHaveLength(0);
    expect(component.findComponent(SelectRoute).exists()).toBe(false);
    expect(component.findComponent(SelectStop).exists()).toBe(false);
  });

  it("propagates the agency choice up to the model and reveals the passenger switch", async () => {
    const { component, state } = await mountForm();

    component.findComponent(SelectAgency).vm.$emit("update:modelValue", muni);
    await flushPromises();

    // The child's event landed in the shared form model...
    expect(state.agency).toEqual(muni);
    // ...and the next step (passenger onboard?) is now offered.
    expect(switches(component)).toHaveLength(1);
  });

  it("offers the route step when inspectors are onboard, then the stop step once a route is picked", async () => {
    const { component, state } = await mountForm({ passenger: true, agency: muni });

    expect(component.findComponent(SelectRoute).exists()).toBe(true);
    expect(component.findComponent(SelectStop).exists()).toBe(false);

    component.findComponent(SelectRoute).vm.$emit("update:modelValue", geary);
    await flushPromises();

    expect(state.route).toEqual(geary);
    expect(component.findComponent(SelectStop).exists()).toBe(true);
  });

  it("skips the route step and goes straight to the stop when inspectors are not onboard", async () => {
    const { component } = await mountForm({ passenger: false, agency: muni });

    expect(component.findComponent(SelectRoute).exists()).toBe(false);
    expect(component.findComponent(SelectStop).exists()).toBe(true);
  });

  it("resets the chosen route and stop when the passenger toggle flips", async () => {
    const { component, state } = await mountForm({ passenger: true, agency: muni });

    component.findComponent(SelectRoute).vm.$emit("update:modelValue", geary);
    await flushPromises();
    component.findComponent(SelectStop).vm.$emit("update:modelValue", mission);
    await flushPromises();
    expect(state.route).toEqual(geary);
    expect(state.stop).toEqual(mission);

    // Flip "inspectors onboard" off.
    await switches(component)[0]!.trigger("click");
    await flushPromises();

    expect(state.route).toBeUndefined();
    expect(state.stop).toBeUndefined();
    expect(component.findComponent(SelectRoute).exists()).toBe(false);
  });

  it("assembles a report that satisfies the schema as the selects are filled in", async () => {
    const { component, state } = await mountForm({ passenger: false });

    component.findComponent(SelectAgency).vm.$emit("update:modelValue", muni);
    await flushPromises();
    await switches(component)[0]!.trigger("click"); // inspectors onboard
    await flushPromises();
    component.findComponent(SelectRoute).vm.$emit("update:modelValue", geary);
    await flushPromises();
    component.findComponent(SelectStop).vm.$emit("update:modelValue", mission);
    await flushPromises();

    expect(state).toMatchObject({
      passenger: true,
      agency: muni,
      route: geary,
      stop: mission,
    });
    // This is the exact check the page uses to enable the Submit button.
    expect(reportSchema.safeParse(state).success).toBe(true);
  });
});
