/** MeF readiness: every complete sample return through calculation, XML and IRS business rules. */
import * as fs from "node:fs/promises";
import { z } from "zod";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { f1040_2026 } from "../../forms/f1040/2026/index.ts";
import type { FormDefinition } from "../../core/types/form-definition.ts";
import {
  type PdfReviewFixture,
  pdfReviewFixtures,
} from "../../forms/f1040/2025/pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import { shiftDatedFacts } from "./sample-year.ts";
import { withSyntheticForm1098Copy } from "../../forms/f1040/2025/pdf/reviews/deductions/mortgage/review-1098-copy.fixture.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../cli/commands/export.ts";

export const BASELINE_FILE = "scripts/testing/mef-baseline.json";
/** The tax year the sample returns are written for. */
export const SAMPLE_TAX_YEAR = 2025;

/**
 * Each tax year the samples run as, with its own baseline. TY2026 runs the
 * TY2025 samples with their dated facts a year later and 2027 signatures.
 */
export const SAMPLE_YEARS: Readonly<
  Record<number, { form: FormDefinition; baseline: string; reasons: boolean }>
> = {
  2025: { form: f1040_2025, baseline: BASELINE_FILE, reasons: false },
  2026: {
    form: f1040_2026,
    baseline: "scripts/testing/mef-baseline-2026.json",
    reasons: true,
  },
};

const baselineSchema = z.object({
  reason: z.string().min(1),
  approvedBy: z.string().min(1),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  /** Sample return id → the findings it is known to have. */
  returns: z.record(z.array(z.string().min(1))),
  /** Sample return id → why its findings are a correct block. */
  reasons: z.record(z.string().min(1)).default({}),
});
export type Baseline = z.infer<typeof baselineSchema>;
export type Findings = Readonly<Record<string, readonly string[]>>;

/**
 * Self-Select PIN authentication (Pub 4164 §8.9.2): 0 is the prior-year AGI of
 * a first-time filer, but a filer under 16 who never filed cannot use a
 * Self-Select PIN (IND-674-01), so a minor authenticates with last year's PIN.
 */
function priorYearAuthentication(
  general: Record<string, unknown>,
  filer: "taxpayer" | "spouse",
  dob: string,
  priorYearPin: string,
  taxYear: number,
): Record<string, unknown> {
  const agi = general[`${filer}_prior_year_agi`];
  const pin = general[`${filer}_prior_year_pin`];
  if (agi !== undefined || pin !== undefined) return {};
  const under16 = Number(dob.slice(0, 4)) > taxYear - 16;
  return under16
    ? { [`${filer}_prior_year_pin`]: priorYearPin }
    : { [`${filer}_prior_year_agi`]: 0 };
}

/** A filed return is signed; sample returns are calculation fixtures without PINs. */
export function signed(
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  return signedForYear(inputs, 2025);
}

/**
 * Signed for one tax year. A sample's own signature dates belong to its
 * TY2025 filing, so another year signs on February 1 of the following year.
 */
export function signedForYear(
  inputs: Record<string, unknown>,
  taxYear: number,
): Record<string, unknown> {
  const general = (inputs.general ?? {}) as Record<string, unknown>;
  const taxpayerDob = String(general.taxpayer_dob ?? "1980-01-01");
  const spouseDob = String(general.spouse_dob ?? "1980-01-01");
  const filingDate = `${taxYear + 1}-02-01`;
  const date = (own: unknown) => taxYear === 2025 ? own ?? filingDate : filingDate;
  return {
    ...structuredClone(inputs),
    general: {
      ...general,
      taxpayer_signature_pin: general.taxpayer_signature_pin ?? "12345",
      taxpayer_signature_date: date(general.taxpayer_signature_date),
      taxpayer_dob: taxpayerDob,
      ...priorYearAuthentication(
        general,
        "taxpayer",
        taxpayerDob,
        "24680",
        taxYear,
      ),
      ...(general.filing_status === "mfj"
        ? {
          spouse_signature_pin: general.spouse_signature_pin ?? "54321",
          spouse_signature_date: date(general.spouse_signature_date),
          spouse_dob: spouseDob,
          ...priorYearAuthentication(
            general,
            "spouse",
            spouseDob,
            "13579",
            taxYear,
          ),
        }
        : {}),
    },
  };
}

const COPY_B_SUFFIX = "-Form1098-CopyB.pdf";
const copyBSourceSchema = z.object({
  lender_name: z.string(),
  recipient_tin: z.string(),
  source_document_reference: z.string(),
  box1_mortgage_interest: z.number(),
  box2_outstanding_principal: z.number().optional(),
  box3_origination_date: z.string().optional(),
  box4_refund_overpaid: z.number().optional(),
  box5_mip: z.number().optional(),
  box6_points_paid: z.number().optional(),
}).passthrough();

/**
 * A synthetic Form 1098 Copy B prints its calendar year and box 3 date, so a
 * sample moved to another year is issued a Copy B for that year.
 */
async function reissuedForm1098Copies(
  inputs: Record<string, unknown>,
  taxYear: number,
): Promise<Record<string, unknown>> {
  if (!Array.isArray(inputs.f1098)) return inputs;
  const f1098 = await Promise.all(
    inputs.f1098.map(async (item: Record<string, unknown>) => {
      const copy = item.issuer_copy as { file_name?: unknown } | undefined;
      const fileName = typeof copy?.file_name === "string" ? copy.file_name : "";
      if (!fileName.endsWith(COPY_B_SUFFIX)) return item;
      const { issuer_copy: _, ...source } = item;
      return await withSyntheticForm1098Copy(
        fileName.slice(0, -COPY_B_SUFFIX.length),
        copyBSourceSchema.parse(source),
        taxYear,
      );
    }),
  );
  return { ...inputs, f1098 };
}

/** A sample return as filed for `taxYear`: its dated facts and Copy B moved to that year. */
export async function sampleForYear(
  inputs: Record<string, unknown>,
  taxYear: number,
): Promise<Record<string, unknown>> {
  if (taxYear === SAMPLE_TAX_YEAR) return inputs;
  return await reissuedForm1098Copies(
    shiftDatedFacts(inputs, taxYear - SAMPLE_TAX_YEAR),
    taxYear,
  );
}

function oneLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").trim().slice(0, 160);
}

/** What stops one signed sample return from filing, as sorted findings. */
export async function returnFindings(
  inputs: Record<string, unknown>,
  documents: Pick<
    PdfReviewFixture,
    "attachments" | "retainedSourceDocuments"
  > = {},
  taxYear = 2025,
): Promise<string[]> {
  const form = SAMPLE_YEARS[taxYear]?.form;
  if (!form) throw new Error(`No sample returns for tax year ${taxYear}`);
  let result: ReturnType<FormDefinition["executeReturn"]>;
  try {
    result = form.executeReturn(
      signedForYear(await sampleForYear(inputs, taxYear), taxYear),
    );
  } catch (error) {
    return [`calculation threw ${oneLine(error)}`];
  }
  if (result.diagnostics.length > 0) {
    return [
      ...new Set(result.diagnostics.map((d) => `calculation ${d.nodeType}`)),
    ]
      .sort();
  }
  const pending = normalizeAllPending(result.pending);
  const identity = extractFilerIdentity(pending.f1040 ?? {});
  // A later year's samples are received when they are signed.
  const filer = identity && taxYear !== 2025
    ? { ...identity, timestamp: `${taxYear + 1}-02-01T12:00:00Z` }
    : identity;
  let xml: string;
  try {
    xml = (await form.prepareReturn(
      pending,
      filer,
      documents.attachments ?? [],
      documents.retainedSourceDocuments ?? [],
    )).bundle.xml;
  } catch (error) {
    return [`xml ${oneLine(error)}`];
  }
  const report = businessRuleReport(
    pending,
    filer,
    emittedValidationScope(xml),
  );
  return [
    ...new Set(
      report.entries
        .filter((e) =>
          e.severity === "reject" || e.severity === "reject_and_stop"
        )
        .map((e) => `rule ${e.ruleNumber}`),
    ),
  ].sort();
}

export type Problem = {
  readonly id: string;
  readonly kind: "new" | "fixed";
  readonly finding: string;
};

/** New findings fail; findings that no longer occur must leave the baseline. */
export function compareFindings(
  actual: Findings,
  baseline: Baseline["returns"],
): Problem[] {
  const problems: Problem[] = [];
  for (
    const id of [...new Set([...Object.keys(actual), ...Object.keys(baseline)])]
      .sort()
  ) {
    const now = new Set(actual[id] ?? []);
    const known = new Set(id in actual ? baseline[id] ?? [] : []);
    for (const finding of now) {
      if (!known.has(finding)) problems.push({ id, kind: "new", finding });
    }
    for (const finding of known) {
      if (!now.has(finding)) problems.push({ id, kind: "fixed", finding });
    }
  }
  return problems;
}

/** Reasons stay with the returns that are still blocked. */
export function keptReasons(
  actual: Findings,
  reasons: Baseline["reasons"],
): Baseline["reasons"] {
  return Object.fromEntries(
    Object.entries(reasons).filter(([id]) => (actual[id] ?? []).length > 0),
  );
}

/** A blocked TY2026 return must say why its block is correct. */
export function unexplained(
  baseline: Baseline["returns"],
  reasons: Baseline["reasons"],
): string[] {
  return Object.keys(baseline).filter((id) => !reasons[id]).sort();
}

export function summarize(actual: Findings): string {
  const ids = Object.keys(actual);
  const clean = ids.filter((id) => actual[id].length === 0).length;
  const counts = new Map<string, number>();
  for (const id of ids) {
    for (const finding of actual[id]) {
      counts.set(finding, (counts.get(finding) ?? 0) + 1);
    }
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([finding, n]) => `  ${String(n).padStart(4)}  ${finding}`);
  return [
    `${ids.length} sample returns, ${clean} ready to file`,
    ...(top.length ? ["Most common findings:", ...top] : []),
  ].join("\n");
}

function yearArg(args: readonly string[]): number {
  const index = args.indexOf("--year");
  return index === -1 ? 2025 : Number(args[index + 1]);
}

async function main(args: readonly string[]): Promise<number> {
  const taxYear = yearArg(args);
  const year = SAMPLE_YEARS[taxYear];
  if (!year) {
    console.error(
      `--year must be one of ${Object.keys(SAMPLE_YEARS).join(", ")}`,
    );
    return 1;
  }
  const baselineFile = year.baseline;
  const actual: Record<string, string[]> = {};
  for (const fixture of pdfReviewFixtures) {
    actual[fixture.id] = await returnFindings(
      fixture.inputs as Record<string, unknown>,
      fixture,
      taxYear,
    );
  }
  const json = args.includes("--json");
  if (!json) console.log(summarize(actual));
  if (args.includes("--update")) {
    const previous = baselineSchema.safeParse(
      JSON.parse(await fs.readFile(baselineFile, "utf8").catch(() => "{}")),
    );
    const baseline: Baseline = {
      reason:
        "Known MeF blockers per sample return; a finding leaves when its fix lands",
      approvedBy: "pending-review",
      expires: "2027-01-31",
      returns: Object.fromEntries(
        Object.entries(actual).filter(([, findings]) => findings.length > 0),
      ),
      reasons: keptReasons(
        actual,
        previous.success ? previous.data.reasons : {},
      ),
    };
    await fs.writeFile(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`Wrote ${baselineFile}`);
    return 0;
  }
  const baseline = baselineSchema.parse(
    JSON.parse(await fs.readFile(baselineFile, "utf8")),
  );
  const problems = compareFindings(actual, baseline.returns);
  const missingReasons = year.reasons
    ? unexplained(baseline.returns, baseline.reasons)
    : [];
  const today = new Date().toISOString().slice(0, 10);
  if (baseline.expires < today) {
    console.error(`${baselineFile} expired on ${baseline.expires}`);
    return 1;
  }
  if (json) {
    console.log(JSON.stringify({ returns: actual, problems }, null, 2));
    return problems.length + missingReasons.length > 0 ? 1 : 0;
  }
  for (const id of missingReasons) {
    console.error(`REASON ${id}: give its block a reason in ${baselineFile}`);
  }
  for (const p of problems) {
    console.error(
      p.kind === "new"
        ? `NEW   ${p.id}: ${p.finding}`
        : `FIXED ${p.id}: ${p.finding} (remove it from ${baselineFile})`,
    );
  }
  console.log(`${problems.length + missingReasons.length} problems`);
  return problems.length + missingReasons.length > 0 ? 1 : 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
