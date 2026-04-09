#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run
/**
 * Run all benchmark cases and generate output.json for each.
 * Run: deno run --allow-read --allow-write --allow-run taxcalcbench/run_all.ts
 */

import { basename, dirname, fromFileUrl, join } from "@std/path";

const SCRIPT_DIR = dirname(fromFileUrl(import.meta.url));
const TAX_DIR    = join(SCRIPT_DIR, "..");
const CASES_DIR  = join(SCRIPT_DIR, "cases");

async function tax(...args: string[]): Promise<string> {
  const { stdout } = await new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-write", join(TAX_DIR, "cli/main.ts"), ...args],
    stdout: "piped", stderr: "inherit",
  }).output();
  return new TextDecoder().decode(stdout);
}

const names: string[] = [];
for await (const e of Deno.readDir(CASES_DIR)) {
  if (e.isDirectory) names.push(e.name);
}
names.sort();

console.log(`Running all ${names.length} benchmark cases...`);
console.log("==================================");

let pass = 0, fail = 0;

for (const name of names) {
  const caseDir   = join(CASES_DIR, name);
  const inputFile = join(caseDir, "input.json");
  try { await Deno.stat(inputFile); } catch { continue; }

  const caseData = JSON.parse(await Deno.readTextFile(inputFile));
  console.log(`Running: ${name}`);
  console.log(`  Scenario: ${caseData.scenario ?? ""}`);

  try {
    const rid = JSON.parse(await tax("return", "create", "--year", String(caseData.year), "--json")).returnId;
    console.log(`  Created return: ${rid}`);

    for (const f of caseData.forms) {
      console.log(`  Adding: ${f.node_type}`);
      await tax("form", "add", "--returnId", rid, "--node_type", f.node_type, JSON.stringify(f.data), "--json");
    }

    const result = await tax("return", "get", "--returnId", rid, "--json");
    await Deno.writeTextFile(join(caseDir, "output.json"), result);
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
