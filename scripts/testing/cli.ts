/** CLI readiness: complete sample returns go through the product CLI end to end. */
import * as fs from "node:fs/promises";
import { join } from "node:path";
import * as sys from "../support/sys.ts";
import {
  type PdfReviewFixture,
  pdfReviewFixtures,
} from "../../forms/f1040/2025/pdf/review-fixtures.ts";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { signed } from "./mef.ts";
import { detachInlineBytes } from "../../cli/commands/return-source-files.ts";

/** Diverse sample returns that pass every implemented MeF business rule. */
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
  // These need files filed with the return or retained for it.
  "single-form8994-direct-employer-full",
  "single-form8978-multiple-reviewed-source",
  "single-retained-4852-ordinary-roth",
  "single-reviewed-adoption-credit",
  "single-8862-ctc-reinstatement",
  "single-1098-purchase-points",
] as const;

const MAIN = new URL("../../cli/main.ts", import.meta.url).pathname;
// The private IRS schema cache; CI has none, so the XSD check runs locally only.
const RETURN_XSD = new URL(
  "../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

/** xmllint's first complaints, or null when the XML validates against `xsd`. */
async function schemaProblem(
  xmlPath: string,
  xsd: string,
): Promise<string | null> {
  const out = await new sys.Command("xmllint", {
    args: ["--noout", "--schema", xsd, xmlPath],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (out.code === 0) return null;
  return new TextDecoder().decode(out.stderr).trim().split("\n").slice(0, 3)
    .join("; ");
}

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

/** Add the fixture's attachments and retained copies with `return attach`. */
async function attachFixtureFiles(
  home: string,
  returnId: string,
  fixture: PdfReviewFixture,
  inlineBytes: ReadonlyMap<string, Uint8Array>,
  step: (name: string, run: Run) => boolean,
): Promise<boolean> {
  const sources = join(home, "sources");
  await fs.mkdir(sources, { recursive: true });
  const files = [
    ...[...inlineBytes].map(([sha256, bytes]) => ({
      bytes,
      args: ["--reference", `inline-${sha256}`],
    })),
    ...(fixture.attachments ?? []).map((a) => ({
      bytes: a.bytes,
      args: ["--name", a.fileName, "--description", a.description],
    })),
    ...(fixture.retainedSourceDocuments ?? []).map((d) => ({
      bytes: d.bytes,
      args: ["--reference", d.document_reference],
    })),
  ];
  for (const [index, file] of files.entries()) {
    const path = join(sources, `source-${index}`);
    await fs.writeFile(path, file.bytes);
    const attached = await cli(
      home,
      "return",
      "attach",
      "--returnId",
      returnId,
      "--file",
      path,
      ...file.args,
    );
    if (!step(`return attach ${file.args[1]}`, attached)) return false;
  }
  return true;
}

/** Problems found running one sample return through every user-facing step. */
export async function checkReturn(id: string, home: string): Promise<string[]> {
  const fixture = pdfReviewFixtures.find((f) => f.id === id);
  if (!fixture) return ["fixture not found"];
  const inputs = signed(fixture.inputs as Record<string, unknown>);
  const detached = detachInlineBytes(inputs);
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
    !await attachFixtureFiles(
      home,
      returnId,
      fixture,
      detached.files,
      step,
    )
  ) {
    return problems;
  }
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
        JSON.stringify(detached.value),
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
      problems.push(`validate rejects ${entry.ruleNumber}`);
    }
  } catch {
    problems.push(`validate printed no JSON report (exit ${validated.code})`);
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
    if (xml && await fs.access(RETURN_XSD).then(() => true, () => false)) {
      const invalid = await schemaProblem(xmlPath, RETURN_XSD);
      if (invalid) problems.push(`MeF XML fails the IRS schema: ${invalid}`);
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
