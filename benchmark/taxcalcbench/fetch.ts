/** Fetches the pinned TaxCalcBench TY2025 cases, answers included, outside the checkout. */
import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import spec from "./spec.json" with { type: "json" };

export const REPOSITORY = spec.source.repository;
export const COMMIT = spec.source.commit;
// Outside the checkout so agents working in the repository never come across the answers.
export const CHECKOUT = join(homedir(), ".cache/opentax-taxcalcbench", COMMIT);
export const TEST_DATA = join(CHECKOUT, "tax_calc_bench/ty25/test_data");

// Published Claude Opus 5.5 no-tool outputs, used only to check that the scorer port agrees with upstream.
const SPARSE = [
  "/LICENSE",
  "/tax_calc_bench/ty25_prompt.py",
  "/tax_calc_bench/ty25_scoring.py",
  "/tax_calc_bench/tax_return_evaluator.py",
  "/tax_calc_bench/ty25/test_data/",
  "/tax_calc_bench/ty25/results/*/anthropic/claude-opus-5-5/*_ultrathink_1.md",
];

async function git(args: string[], cwd?: string): Promise<void> {
  const proc = Bun.spawn(["git", ...args], {
    cwd,
    env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" },
    stdout: "inherit",
    stderr: "inherit",
  });
  if (await proc.exited !== 0) throw new Error(`git ${args.join(" ")} failed`);
}

/** Labels in spec.json must still appear verbatim in the pinned upstream scoring module. */
async function verifySpec(): Promise<void> {
  const scoring = await fs.readFile(
    join(CHECKOUT, "tax_calc_bench/ty25_scoring.py"),
    "utf8",
  );
  const missing = Object.values(spec.jurisdictions).flatMap((j) =>
    j.fields.filter((f) =>
      !scoring.includes(JSON.stringify(f.label)) ||
      !scoring.includes(JSON.stringify(f.xpath))
    )
  );
  if (missing.length > 0) {
    throw new Error(
      `spec.json drifted from upstream: ${
        missing.map((f) => f.label).join("; ")
      }`,
    );
  }
}

export async function fetchCases(): Promise<string> {
  if (!existsSync(join(TEST_DATA, "ty25-us-001/output.xml"))) {
    await fs.rm(CHECKOUT, { recursive: true, force: true });
    await fs.mkdir(CHECKOUT, { recursive: true });
    await git(["init", "-q"], CHECKOUT);
    await git(["remote", "add", "origin", REPOSITORY], CHECKOUT);
    await git(["sparse-checkout", "set", "--no-cone", ...SPARSE], CHECKOUT);
    await git([
      "fetch",
      "-q",
      "--depth",
      "1",
      "--filter=blob:none",
      "origin",
      COMMIT,
    ], CHECKOUT);
    await git(["checkout", "-q", COMMIT], CHECKOUT);
  }
  await verifySpec();
  return TEST_DATA;
}

if (import.meta.main) console.log(await fetchCases());
