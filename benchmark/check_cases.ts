#!/usr/bin/env -S deno run --allow-read
/**
 * Validate every benchmark case without running the engine: files parse, the
 * product exists, each input fits its node schema, and sources cite a
 * publication. Prints every problem, not just the first.
 */
import { dirname, fromFileUrl, join } from "@std/path";
import { discoverBenchmarkCases } from "./harness.ts";

const root = join(dirname(fromFileUrl(import.meta.url)), "cases");
const json = Deno.args.includes("--json");

try {
  const cases = await discoverBenchmarkCases(root);
  console.log(
    json
      ? JSON.stringify({ cases: cases.length, problems: [] })
      : `${cases.length} benchmark cases valid`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const [summary, ...problems] = message.split("\n");
  console.log(
    json ? JSON.stringify({ cases: 0, summary, problems }) : message,
  );
  Deno.exit(1);
}
