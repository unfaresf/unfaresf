import { describe, it, expect, afterEach, vi } from "vitest";
import getPlainTextSummary from "./get-plain-text-summary";
import type { SelectReport } from "../../db/schema";

// The report behind unfaresf/unfaresf#238: created at 20:15 UTC, which is
// 1:15 PM in the Bay Area.
const report = {
  id: 1,
  createdAt: new Date("2026-08-27T20:15:00Z"),
  source: "internal",
  uri: null,
  reviewedAt: null,
  route: {
    routeId: "1",
    routeShortName: "5R",
    routeLongName: "Fulton Rapid",
    agencyId: "SF",
    agencyName: "Muni",
    direction: "west",
    headsign: "Ocean Beach",
  },
  stop: {
    stopId: "1",
    stopName: "Mcallister St & Van Ness Ave",
    direction: "west",
  },
  direction: null,
  passenger: true,
  message: null,
} as unknown as SelectReport;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPlainTextSummary", () => {
  // This string is built on the server for push notification bodies and is
  // reused verbatim as the public broadcast message, so it has to render Bay
  // Area local time regardless of which process formatted it. Production runs
  // in UTC, which is what made the notification read "8:15 PM".
  it.each(["UTC", "Asia/Tokyo", "America/New_York", "America/Los_Angeles"])(
    "renders the report time in Bay Area local time when the process runs in %s",
    (timeZone) => {
      vi.stubEnv("TZ", timeZone);

      expect(getPlainTextSummary(report)).toBe(
        "1:15 PM: Fare inspectors on 5R (Ocean Beach) from Mcallister St & Van Ness Ave"
      );
    }
  );

  it("uses Pacific standard time outside of DST", () => {
    vi.stubEnv("TZ", "UTC");

    const winterReport = {
      ...report,
      createdAt: new Date("2026-01-15T01:09:00Z"),
    } as SelectReport;

    expect(getPlainTextSummary(winterReport)).toBe(
      "5:09 PM: Fare inspectors on 5R (Ocean Beach) from Mcallister St & Van Ness Ave"
    );
  });
});
