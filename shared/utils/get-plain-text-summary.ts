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

  if (report.message) {
    return `${formattedDate}: ${report.message}`;
  }
  else if (report.passenger) {
    return `${formattedDate}: Fare inspectors on ${report.route?.routeShortName || "ROUTE"
      } (${report.route?.headsign || "HEADSIGN"}) from ${report.stop?.stopName || "STOP"
      }`;
  } else {
    return `${formattedDate}: Fare inspectors at ${report.stop?.stopName || "STOP"
      } ${report.stop?.direction || "DIRECTION"}`;
  }
}