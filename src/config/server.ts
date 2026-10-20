import "server-only";
import { parseEnv } from "./env";
export function getServerConfig() { return parseEnv(process.env); }
