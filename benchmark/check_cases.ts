#!/usr/bin/env -S deno run --allow-read
/**
 * Validate every benchmark case without running the engine: files parse, the
 * product exists, each input fits its node schema, and sources cite a
 * publication. Known-invalid cases listed in benchmark/cases/baseline.json are
 * allowed until their entry expires; every other problem fails.
 */
import { dirname, fromFileUrl, join } from "@std/path";
import {
  applyCaseBaseline,
  inspectBenchmarkCases,
  readCaseBaseline,
} from "./harness.ts";

const repo = dirname(dirname(fromFileUrl(import.meta.url)));
const root = join(repo, "benchmark", "cases");
const json = Deno.args.includes("--json");
const today = new Date().toISOString().slice(0, 10);

let report;
try {
  const { found, problems } = await inspectBenchmarkCases(root);
  if (found.length === 0 && problems.length === 0) {
    throw new Error(`No benchmark cases: ${root}`);
  }
  const { open, allowed } = applyCaseBaseline(
    root,
    problems,
    await readCaseBaseline(repo),
    today,
  );
  report = { valid: found.length, allowed, problems: open };
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  Deno.exit(2);
}

const summary =
  `${report.valid} benchmark cases valid, ${report.allowed} known-invalid (baselined), ${report.problems.length} problems`;
console.log(
  json
    ? JSON.stringify(report)
    : [...report.problems.map((problem) => problem.message), summary].join(
      "\n",
    ),
);
Deno.exit(report.problems.length === 0 ? 0 : 1);
