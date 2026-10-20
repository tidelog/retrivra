import { z } from "zod";
import { isAbsolute } from "node:path";
function inputBoolean(value: string | undefined) { return value === "true"; }
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url().refine(value => {
    const url = URL.parse(value);
    if (!url) return false;
    return ["postgres:", "postgresql:"].includes(url.protocol) && Boolean(url.hostname && url.username && url.password && url.pathname.length > 1);
  }),
  DATABASE_TLS_INTERNAL: z.string().optional(),
  STORAGE_ROOT: z.string().min(1).default("./var/storage"),
  AI_PROVIDER: z.enum(["ollama", "disabled"]).default("ollama"),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production") {
    if (!isAbsolute(env.STORAGE_ROOT)) ctx.addIssue({ code: "custom", path: ["STORAGE_ROOT"], message: "Production storage must be absolute" });
    const url = URL.parse(env.DATABASE_URL);
    if (!url) return;
    if (decodeURIComponent(url.password) === "local-development-only")
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "Development password prohibited" });
    if (url.searchParams.get("sslmode") !== "verify-full" && !(url.hostname === "database" && inputBoolean(env.DATABASE_TLS_INTERNAL)))
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "Production requires verified TLS" });
  }
});
export function parseEnv(input: Record<string, unknown>) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error("Invalid server environment: " + [...new Set(result.error.issues.map(issue => issue.path.join(".")))].join(", "));
  return result.data;
}
