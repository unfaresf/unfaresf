import { it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { ReportSummary } from "#components";
import type { SelectReport } from "../../db/schema";

const mockReport: SelectReport = {
  id: 123,
  // 4:00 AM Pacific, pinned as an instant so it renders the same anywhere.
  createdAt: new Date("2025-05-15T11:00:00Z"),
  source: "test",
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
    stopName: "Mission/16th",
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

it("can mount report-summary component", async () => {
  const component = mount(ReportSummary, {
    props: {
      report: mockReport,
    },
  });
  expect(component.text()).toMatchInlineSnapshot(
    `"4:00 AM: Fare inspectors at Mission/16th south"`
  );
});

it("summarizes a passenger report using the route headsign", async () => {
  const passengerReport: SelectReport = {
    ...mockReport,
    passenger: true,
    route: {
      routeId: "123",
      routeShortName: "22",
      routeLongName: "22",
      agencyId: "123",
      agencyName: "Muni",
      direction: "south",
      headsign: "Downtown",
    },
  };
  const component = mount(ReportSummary, {
    props: {
      report: passengerReport,
    },
  });
  expect(component.text()).toBe(
    "4:00 AM: Fare inspectors on 22 (Downtown) from Mission/16th"
  );
});
