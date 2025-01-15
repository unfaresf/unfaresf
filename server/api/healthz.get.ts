import { getHealth } from "../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  await authorize(event, getHealth);
});