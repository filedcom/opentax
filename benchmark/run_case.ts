#!/usr/bin/env bun
import * as fs from "node:fs/promises";
/**
 * Run a single benchmark case through the tax engine and save output.json.
 * Usage: bun benchmark/run_case.ts <case_dir>
 */

import { basename, dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";

import {
  benchmarkInputSchema,
  benchmarkReturnSchema,
  benchmarkTax,
  createdReturnSchema,
} from "./harness.ts";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR = join(SCRIPT_DIR, "..");

const caseDir = process.argv.slice(2)[0];
if (!caseDir) {
  console.error(
    "Usage: bun benchmark/run_case.ts <case_dir>",
  );
  process.exit(1);
}

async function tax(...args: string[]): Promise<string> {
  return await benchmarkTax(TAX_DIR, args);
}

const inputFile = join(caseDir, "input.json");
const caseData = benchmarkInputSchema.parse(
  JSON.parse(await fs.readFile(inputFile, "utf8")),
);

console.log(`Running: ${basename(caseDir)}`);
console.log(`  Scenario: ${caseData.scenario ?? ""}`);

const rid = createdReturnSchema.parse(JSON.parse(
  await tax("return", "create", "--year", String(caseData.year), "--json"),
)).returnId;
console.log(`  Created return: ${rid}`);

for (const f of caseData.forms) {
  console.log(`  Adding: ${f.node_type}`);
  await tax(
    "form",
    "add",
    "--returnId",
    rid,
    "--node_type",
    f.node_type,
    JSON.stringify(f.data),
    "--json",
  );
}

console.log("  Computing result...");
const result = await tax("return", "get", "--returnId", rid, "--json");
benchmarkReturnSchema.parse(JSON.parse(result));
const outputFile = join(caseDir, "output.json");
await fs.writeFile(outputFile, result);
console.log(`  Saved: ${outputFile}`);

console.log(JSON.stringify(JSON.parse(result).summary, null, 2));
