import { consola } from "consola";

const config = useRuntimeConfig();
consola.level = config.public.logLevel
export default consola;