import { it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { ReportSummary } from "#components";

it("renders the summary it is handed", async () => {
  const component = await mountSuspended(ReportSummary, {
    props: {
      summary: "4:00 AM: Fare inspectors at Mission/16th south",
    },
  });
  expect(component.text()).toBe(
    "4:00 AM: Fare inspectors at Mission/16th south"
  );
});

it("falls back to a skeleton when there is no summary yet", async () => {
  const component = await mountSuspended(ReportSummary, {
    props: {
      summary: "",
    },
  });
  expect(component.text()).toBe("");
  expect(component.find('[aria-label="loading"]').exists()).toBe(true);
});
