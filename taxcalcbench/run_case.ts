#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * Run a single benchmark case through the tax engine and save output.json.
 * Usage: deno run --allow-read --allow-write --allow-run taxcalcbench/run_case.ts <case_dir>
 */

import { basename, dirname, fromFileUrl, join } from "@std/path";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR    = join(SCRIPT_DIR, "..");

const caseDir = Deno.args[0];
if (!caseDir) {
  console.error("Usage: deno run --allow-read --allow-write --allow-run run_case.ts <case_dir>");
  Deno.exit(1);
}

async function tax(...args: string[]): Promise<string> {
  const { stdout } = await new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", join(TAX_DIR, "cli/main.ts"), ...args],
    stdout: "piped", stderr: "inherit",
  }).output();
  return new TextDecoder().decode(stdout);
}

const inputFile = join(caseDir, "input.json");
const caseData  = JSON.parse(await Deno.readTextFile(inputFile));

console.log(`Running: ${basename(caseDir)}`);
console.log(`  Scenario: ${caseData.scenario ?? ""}`);

const rid = JSON.parse(await tax("return", "create", "--year", String(caseData.year), "--json")).returnId;
console.log(`  Created return: ${rid}`);

for (const f of caseData.forms) {
  console.log(`  Adding: ${f.node_type}`);
  await tax("form", "add", "--returnId", rid, "--node_type", f.node_type, JSON.stringify(f.data), "--json");
}

console.log("  Computing result...");
const result      = await tax("return", "get", "--returnId", rid, "--json");
const outputFile  = join(caseDir, "output.json");
await Deno.writeTextFile(outputFile, result);
console.log(`  Saved: ${outputFile}`);

console.log(JSON.stringify(JSON.parse(result).summary, null, 2));
