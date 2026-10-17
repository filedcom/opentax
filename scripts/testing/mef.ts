/** MeF readiness: every complete sample return through calculation, XML and IRS business rules. */
import * as fs from "node:fs/promises";
import { z } from "zod";
import { f1040_2025 } from "../../forms/f1040/2025/index.ts";
import { pdfReviewFixtures } from "../../forms/f1040/2025/pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../forms/f1040/mef/filer.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../cli/commands/export.ts";

export const BASELINE_FILE = "scripts/testing/mef-baseline.json";

const baselineSchema = z.object({
  reason: z.string().min(1),
  approvedBy: z.string().min(1),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  /** Sample return id → the findings it is known to have. */
  returns: z.record(z.array(z.string().min(1))),
});
export type Baseline = z.infer<typeof baselineSchema>;
export type Findings = Readonly<Record<string, readonly string[]>>;

/** A filed return is signed; sample returns are calculation fixtures without PINs. */
export function signed(
  inputs: Record<string, unknown>,
): Record<string, unknown> {
  const general = (inputs.general ?? {}) as Record<string, unknown>;
  return {
    ...structuredClone(inputs),
    general: {
      ...general,
      taxpayer_signature_pin: general.taxpayer_signature_pin ?? "12345",
      taxpayer_signature_date: general.taxpayer_signature_date ?? "2026-02-01",
      ...(general.filing_status === "mfj"
        ? {
          spouse_signature_pin: general.spouse_signature_pin ?? "54321",
          spouse_signature_date: general.spouse_signature_date ?? "2026-02-01",
        }
        : {}),
    },
  };
}

/** What stops one signed sample return from filing, as sorted findings. */
export async function returnFindings(
  inputs: Record<string, unknown>,
): Promise<string[]> {
  const result = f1040_2025.executeReturn(signed(inputs));
  if (result.diagnostics.length > 0) {
    return [
      ...new Set(result.diagnostics.map((d) => `calculation ${d.nodeType}`)),
    ]
      .sort();
  }
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  let xml: string;
  try {
    xml = (await f1040_2025.prepareReturn(pending, filer, [])).bundle.xml;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [`xml ${message.replace(/\s+/g, " ").trim().slice(0, 160)}`];
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

async function main(args: readonly string[]): Promise<number> {
  const actual: Record<string, string[]> = {};
  for (const fixture of pdfReviewFixtures) {
    actual[fixture.id] = await returnFindings(
      fixture.inputs as Record<string, unknown>,
    );
  }
  const json = args.includes("--json");
  if (!json) console.log(summarize(actual));
  if (args.includes("--update")) {
    const baseline: Baseline = {
      reason:
        "Known MeF blockers per sample return; a finding leaves when its fix lands",
      approvedBy: "pending-review",
      expires: "2027-01-31",
      returns: Object.fromEntries(
        Object.entries(actual).filter(([, findings]) => findings.length > 0),
      ),
    };
    await fs.writeFile(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`Wrote ${BASELINE_FILE}`);
    return 0;
  }
  const baseline = baselineSchema.parse(
    JSON.parse(await fs.readFile(BASELINE_FILE, "utf8")),
  );
  const problems = compareFindings(actual, baseline.returns);
  const today = new Date().toISOString().slice(0, 10);
  if (baseline.expires < today) {
    console.error(`${BASELINE_FILE} expired on ${baseline.expires}`);
    return 1;
  }
  if (json) {
    console.log(JSON.stringify({ returns: actual, problems }, null, 2));
    return problems.length > 0 ? 1 : 0;
  }
  for (const p of problems) {
    console.error(
      p.kind === "new"
        ? `NEW   ${p.id}: ${p.finding}`
        : `FIXED ${p.id}: ${p.finding} (remove it from ${BASELINE_FILE})`,
    );
  }
  console.log(`${problems.length} problems`);
  return problems.length > 0 ? 1 : 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)));
