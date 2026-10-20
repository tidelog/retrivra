import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--json"], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

if (result.error || ![0, 1].includes(result.status)) {
  throw new Error("Unable to execute npm audit reliably.");
}

let report;

try {
  report = JSON.parse(result.stdout);
} catch {
  throw new Error("npm audit did not return valid JSON.");
}

if (report.error) {
  throw new Error(`npm audit error: ${JSON.stringify(report.error)}`);
}

const vulnerabilities = report.vulnerabilities;

if (!vulnerabilities || typeof vulnerabilities !== "object") {
  throw new Error("npm audit vulnerability data missing.");
}

const expected = [
  "braces",
  "micromatch",
  "fast-glob",
  "@next/eslint-plugin-next",
  "eslint-config-next",
].sort();

const actual = Object.entries(vulnerabilities)
  .filter(([, data]) => ["high", "critical"].includes(data.severity))
  .map(([name]) => name)
  .sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `Security findings changed.\nExpected: ${expected.join(", ")}\nActual: ${actual.join(", ")}`
  );
}

const braces = vulnerabilities.braces;

const advisoryVerified = braces.via.some(
  (item) =>
    typeof item === "object" &&
    String(item.url ?? "").includes("GHSA-vfj7-8cjw-p6xm")
);

if (!advisoryVerified) {
  throw new Error("Expected braces advisory is missing.");
}

const production = spawnSync(
  "npm",
  ["ls", "--omit=dev", "braces", "--all", "--json"],
  {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  }
);

if (production.error || ![0, 1].includes(production.status)) {
  throw new Error("Unable to inspect production dependency tree.");
}

let tree;

try {
  tree = JSON.parse(production.stdout);
} catch {
  throw new Error("Production dependency tree returned invalid JSON.");
}

if (tree.dependencies?.braces) {
  throw new Error("Affected braces package found in production dependencies.");
}

if (tree.problems?.some((problem) => !problem.includes("extraneous: braces"))) {
  throw new Error("Production dependency tree has unexpected problems.");
}

console.log("PASS: Exactly five known high-severity development findings.");
console.log("PASS: Expected braces advisory verified.");
console.log("PASS: Affected package absent from production dependencies.");
