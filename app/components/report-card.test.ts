import { it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { ReportCard, ReportSummary } from "#components";
import type { SelectReport } from "../../db/schema";

const mockReport: SelectReport = {
  id: 123,
  createdAt: new Date("May 15, 2025 04:00:00"),
  source: "internal",
  uri: null,
  reviewedAt: null,
  route: {
    routeId: "123",
    routeShortName: "22",
    routeLongName: "22",
    agencyId: "123",
    agencyName: "Muni",
    direction: "south",
    headsign: "Downtown",
  },
  stop: {
    stopId: "123",
    stopName: "Mission",
    direction: "south",
  },
  direction: {
    routeId: "123",
    directionId: null,
    direction: "south",
  },
  passenger: null,
  message: null,
};

it("includes the relative time in the past of the post", async () => {
  const component = await mountSuspended(ReportCard, {
    props: {
      report: mockReport,
    },
  });

  expect(component.find("a").text()).include("ago");
  expect(component.findComponent(ReportSummary).isVisible()).toBe(true);
});

it("should emit an approved event with approved report when approve button clicked", async () => {
  const component = await mountSuspended(ReportCard, {
    props: {
      report: mockReport,
    },
  });
  await component.find("#report-card-approve").trigger("click");

  expect(component.emitted()).toHaveProperty("onApprove");
});

it("should emit an dismiss event with dismissed report when dismiss button clicked", async () => {
  const component = await mountSuspended(ReportCard, {
    props: {
      report: mockReport,
    },
  });
  await component.find("#report-card-dismiss").trigger("click");

  expect(component.emitted()).toHaveProperty("onDismiss");
});

it("should return a skeleton the report is omitted", async () => {
  const component = await mountSuspended(ReportCard, {
    props: {
      report: null,
    },
  });
  expect(component.text()).toMatchInlineSnapshot(`""`);
  expect(component.html()).toMatchInlineSnapshot(`
    "<div>
      <div aria-busy="true" aria-label="loading" aria-live="polite" role="alert" class="animate-pulse bg-elevated h-12 w-12 rounded-full"></div>
      <div class="space-y-2">
        <div aria-busy="true" aria-label="loading" aria-live="polite" role="alert" class="animate-pulse rounded-md bg-elevated h-4 w-62.5"></div>
        <div aria-busy="true" aria-label="loading" aria-live="polite" role="alert" class="animate-pulse rounded-md bg-elevated h-4 w-50"></div>
      </div>
    </div>"
  `);
});
