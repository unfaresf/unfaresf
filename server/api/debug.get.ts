import { getHealth } from "../../shared/utils/abilities";

export default defineEventHandler(async (event) => {
  // @ts-ignore TODO https://github.com/nuxt/nuxt/issues/29263
  await authorize(event, getHealth);
  /*
    This is intentionally blank. Useful when debugging.
  */
});