#!/usr/bin/env bun
import * as fs from "node:fs/promises";
import * as sys from "../scripts/support/sys.ts";
/**
 * Run all benchmark cases and generate output.json for each.
 * Run: bun benchmark/run_all.ts
 */

import { dirname, join } from "node:path";
import { fileURLToPath as fromFileUrl } from "node:url";

import {
  benchmarkExitCode,
  benchmarkInputSchema,
  benchmarkReturnSchema,
  benchmarkTax,
  createdReturnSchema,
  discoverBenchmarkCases,
} from "./harness.ts";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR = join(SCRIPT_DIR, "..");
const CASES_DIR = join(SCRIPT_DIR, "cases");

async function tax(...args: string[]): Promise<string> {
  return await benchmarkTax(TAX_DIR, args);
}

const names = await discoverBenchmarkCases(CASES_DIR);

console.log(`Running all ${names.length} benchmark cases...`);
console.log("==================================");

let pass = 0, fail = 0;

for (const name of names) {
  const caseDir = name;
  const inputFile = join(caseDir, "input.json");
  await sys.stat(inputFile);

  const caseData = benchmarkInputSchema.parse(
    JSON.parse(await fs.readFile(inputFile, "utf8")),
  );
  console.log(`Running: ${name}`);
  console.log(`  Scenario: ${caseData.scenario ?? ""}`);

  try {
    const rid = createdReturnSchema.parse(JSON.parse(
      await tax(
        "return",
        "create",
        "--year",
        String(caseData.year),
        "--json",
      ),
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

    const result = await tax("return", "get", "--returnId", rid, "--json");
    benchmarkReturnSchema.parse(JSON.parse(result));
    await fs.writeFile(join(caseDir, "output.json"), result);
    console.log(`  Saved: output.json`);
    pass++;
  } catch (err) {
    console.error(`  FAILED: ${err}`);
    fail++;
  }
  console.log();
}

console.log("==================================");
console.log(`Results: ${pass} passed, ${fail} failed`);

process.exit(benchmarkExitCode(pass + fail, fail));
