/** CLI readiness: complete sample returns go through the product CLI end to end. */
import * as fs from "node:fs/promises";
import { join } from "node:path";
import * as sys from "../support/sys.ts";
import { pdfReviewFixtures } from "../../forms/f1040/2025/pdf/review-fixtures.ts";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { signed } from "./mef.ts";

/** Diverse returns whose only MeF blocker is the header birth date (IND-021/022). */
export const CLI_RETURNS = [
  "form4972-annuity-primary-3-spouse-0-nua-1",
  "owned-mixed-cf-health-full",
  "joint-owned-cf-filed-business-filed-leaf-operands",
  "single-shop-seasonal-excluded-workers",
  "single-high-wage-no-niit",
  "single-wind-and-geothermal-business-credits",
  "single-form4137-qualified-tips-schedule1a",
  "single-three-no-aptc-policies-september-uncovered",
  "single-form8815-series-ee-bond-exclusion",
  "qualified-tip-qbi-wholly-excluded-qbi",
  "independent-primary-spouse-c-health-different-owner-eligible-months",
] as const;

const KNOWN_BLOCKERS = new Set(["IND-021-01", "IND-022-01"]);
const MAIN = new URL("../../cli/main.ts", import.meta.url).pathname;

type Run = { code: number; stdout: string; stderr: string };

/** One CLI run, isolated in its own HOME so returns never mix. */
async function cli(home: string, ...args: string[]): Promise<Run> {
  const out = await new sys.Command(process.execPath, {
    args: [MAIN, ...args],
    env: { HOME: home },
    stdout: "piped",
    stderr: "piped",
  }).output();
  const decode = (b: Uint8Array) => new TextDecoder().decode(b);
  return {
    code: out.code,
    stdout: decode(out.stdout),
    stderr: decode(out.stderr),
  };
}

/** Problems found running one sample return through every user-facing step. */
export async function checkReturn(id: string, home: string): Promise<string[]> {
  const fixture = pdfReviewFixtures.find((f) => f.id === id);
  if (!fixture) return ["fixture not found"];
  const inputs = signed(fixture.inputs as Record<string, unknown>);
  const engine = normalizeAllPending(
    f1040_2025.executeReturn(structuredClone(inputs)).pending,
  )
    .f1040 ?? {};
  const problems: string[] = [];
  const step = (name: string, run: Run) => {
    if (run.code !== 0) {
      problems.push(
        `${name} exited ${run.code}: ${run.stderr.trim().split("\n").at(-1)}`,
      );
    }
    return run.code === 0;
  };

  const created = await cli(
    home,
    "return",
    "create",
    "--year",
    "2025",
    "--json",
  );
  if (!step("return create", created)) return problems;
  const { returnId } = JSON.parse(created.stdout);
  if (
    !step(
      "form add",
      await cli(
        home,
        "form",
        "add",
        "--returnId",
        returnId,
        "--node_type",
        "start",
        JSON.stringify(inputs),
      ),
    )
  ) {
    return problems;
  }
  const got = await cli(
    home,
    "return",
    "get",
    "--returnId",
    returnId,
    "--json",
  );
  if (step("return get", got)) {
    const lines = JSON.parse(got.stdout).lines ?? {};
    for (
      const line of ["line11_agi", "line15_taxable_income", "line24_total_tax"]
    ) {
      if (lines[line] !== engine[line]) {
        problems.push(
          `return get ${line} = ${lines[line]}, engine ${engine[line]}`,
        );
      }
    }
  }
  const validated = await cli(
    home,
    "return",
    "validate",
    "--returnId",
    returnId,
    "--format",
    "json",
  );
  try {
    const report = JSON.parse(validated.stdout);
    for (const entry of report.entries ?? []) {
      if (!KNOWN_BLOCKERS.has(entry.ruleNumber)) {
        problems.push(`validate rejects ${entry.ruleNumber}`);
      }
    }
  } catch {
    problems.push(`validate printed no JSON report (exit ${validated.code})`);
  }
  const blocked = await cli(
    home,
    "return",
    "export",
    "--returnId",
    returnId,
    "--type",
    "mef",
  );
  const rules = [...blocked.stderr.matchAll(/\[([A-Z0-9-]+)\]/g)].map((m) =>
    m[1]
  );
  if (blocked.code === 0 || rules.some((rule) => !KNOWN_BLOCKERS.has(rule))) {
    problems.push(
      `export without --force: exit ${blocked.code}, rules ${
        rules.join(" ") || "none"
      }`,
    );
  }
  const xmlPath = join(home, `${id}.xml`), pdfPath = join(home, `${id}.pdf`);
  if (
    step(
      "export mef",
      await cli(
        home,
        "return",
        "export",
        "--returnId",
        returnId,
        "--type",
        "mef",
        "--force",
        "--output",
        xmlPath,
      ),
    )
  ) {
    const xml = await fs.readFile(xmlPath, "utf8").catch(() => "");
    if (!xml) problems.push(`export mef wrote nothing to --output`);
    const agi = /<AdjustedGrossIncomeAmt>(-?\d+)</.exec(xml)?.[1];
    if (Number(agi ?? 0) !== Number(engine.line11_agi ?? 0)) {
      problems.push(
        `MeF AdjustedGrossIncomeAmt ${agi}, engine ${engine.line11_agi}`,
      );
    }
  }
  if (
    step(
      "export pdf",
      await cli(
        home,
        "return",
        "export",
        "--returnId",
        returnId,
        "--type",
        "pdf",
        "--force",
        "--output",
        pdfPath,
      ),
    )
  ) {
    const bytes = await fs.readFile(pdfPath).catch(() => new Uint8Array());
    const head = new TextDecoder().decode(bytes.subarray(0, 5));
    if (head !== "%PDF-") problems.push("export pdf wrote no PDF");
  }
  return problems;
}

async function main(): Promise<number> {
  const root = await sys.makeTempDir({ prefix: "opentax-cli-" });
  let failed = 0;
  try {
    const queue = [...CLI_RETURNS];
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const home = join(root, id);
        await fs.mkdir(home, { recursive: true });
        const problems = await checkReturn(id, home);
        if (problems.length) failed++;
        console.log(
          problems.length
            ? `FAIL ${id}\n${problems.map((p) => `  ${p}`).join("\n")}`
            : `ok   ${id}`,
        );
      }
    }));
  } finally {
    await sys.remove(root, { recursive: true });
  }
  console.log(
    `${CLI_RETURNS.length} returns through the CLI, ${failed} problems`,
  );
  return failed > 0 ? 1 : 0;
}

if (import.meta.main) process.exit(await main());
