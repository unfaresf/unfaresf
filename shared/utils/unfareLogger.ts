import { consola } from "consola/basic";

const config = useRuntimeConfig();
consola.level = config.public.logLevel
export default consola;