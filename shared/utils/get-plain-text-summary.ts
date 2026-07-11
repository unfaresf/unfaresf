import type { SelectReport } from "../../db/schema";
import { formatDate } from "date-fns/format";

export type PartialReport = Omit<
  SelectReport,
  "route" | "stop" | "id" | "uri" | "reviewedAt" | "direction"
> & {
  route: Partial<SelectReport["route"]>;
  stop: Partial<SelectReport["stop"]>;
};

export default function (report: PartialReport) {
  if (!report) return "";

  const formattedDate = formatDate(report.createdAt, "p");

  let summary;
  if (report.message) {
    summary = `${formattedDate}: ${report.message}`;
  }
  else if (report.passenger) {
    summary = `${formattedDate}: Fare inspectors on ${report.route?.routeShortName || "ROUTE"
      } (${report.route?.headsign || "HEADSIGN"}) from ${report.stop?.stopName || "STOP"
      }`;
  } else {
    summary = `${formattedDate}: Fare inspectors at ${report.stop?.stopName || "STOP"
      } ${report.stop?.direction || "DIRECTION"}`;
  }

  // Bound the summary to 400 chars so it satisfies the broadcast message
  // schema (z.string().max(400)). The notification body is reused verbatim
  // as the broadcast message by the service worker 'post' action.
  return summary.length > 400 ? summary.slice(0, 400) : summary;
}