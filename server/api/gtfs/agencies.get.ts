import { getGtfs } from "../../../shared/utils/abilities";
import { gtfsDB } from "../../sqlite-service";
import { agency } from "../../../db/gtfs-migrations/schema";

const getAgencies = () => {
  return gtfsDB
    .select({
      agencyId: agency.agencyId,
      agencyName: agency.agencyName,
    })
    .from(agency);
};

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getGtfs);

  try {
    return getAgencies();
  } catch (err: any) {
    throw createError({
      statusCode: 500,
    });
  }
});
