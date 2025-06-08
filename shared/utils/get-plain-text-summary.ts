import type { SelectReport } from "../../db/schema";
import { formatDate } from "date-fns/format";

export type PartialReport = Omit<
  SelectReport,
  "route" | "stop" | "source" | "id" | "uri" | "reviewedAt" | "direction"
> & {
  route: Partial<SelectReport["route"]>;
  stop: Partial<SelectReport["stop"]>;
};

export default function (report: PartialReport) {
  if (!report) return "";

  const formattedDate = formatDate(report.createdAt, "p");

  if (report.passenger) {
    return `${formattedDate}: Fare inspectors on ${
      report.route?.routeShortName || "ROUTE"
    } headed ${report.route?.direction || "DIRECTION"} from ${
      report.stop?.stopName || "STOP"
    }`;
  } else {
    return `${formattedDate}: Fare inspectors at ${
      report.stop?.stopName || "STOP"
    } ${report.stop?.direction || "DIRECTION"}`;
  }
}