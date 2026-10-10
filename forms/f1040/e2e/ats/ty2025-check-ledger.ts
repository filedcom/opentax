import type { replayAtsChecks } from "./ty2025-check-replay.ts";

type Replay = Awaited<ReturnType<typeof replayAtsChecks>>;
export interface LedgerRow {
  id: string;
  scenario: string;
  kind: "calculation" | "document-copy" | "binary-attachment";
  result: string;
  basis: string;
  sourceUrl: string;
  expected: unknown;
  actual: unknown;
}

/** Keep calculation comparisons, copy presence and unknown requirements separate.
 * A row is a local observation, never an IRS business-rule/acceptance assertion.
 */
export function buildAtsCheckLedger(report: Replay) {
  const rows: LedgerRow[] = [];
  for (const s of report.scenarios) {
    const common = { scenario: s.id, sourceUrl: s.sourceUrl };
    for (const c of s.checks) {
      rows.push({
        ...common,
        id: `${s.id}:calculation:${c.path}`,
        kind: "calculation",
        result: c.result,
        basis: `${c.basis}: ${c.sourceLocation}`,
        expected: c.expected,
        actual: c.actual ?? null,
      });
    }
    for (const d of s.documentCoverage.rows) {
      for (let copy = 1; copy <= d.requiredCopies; copy++) {
        rows.push({
          ...common,
          id: `${s.id}:document:${d.sourceForm}:${copy}`,
          kind: "document-copy",
          result: !d.nativeRoot
            ? "unmapped"
            : d.observedCopies === null
            ? "not-evaluated"
            : copy <= d.observedCopies
            ? "present"
            : "missing",
          basis:
            `Required source inventory: ${d.sourceForm}, copy ${copy}; presence only`,
          expected: d.nativeRoot,
          actual: d.observedCopies === null
            ? null
            : copy <= d.observedCopies
            ? d.nativeRoot
            : null,
        });
      }
    }
    for (const a of s.attachmentCoverage.rows ?? []) {
      rows.push({
        ...common,
        id: `${s.id}:attachment:${a.description}`,
        kind: "binary-attachment",
        result: a.result,
        basis: "Known required attachment; description/bytes only",
        expected: a.description,
        actual: a.observed,
      });
    }
  }
  if (new Set(rows.map((r) => r.id)).size !== rows.length) {
    throw new Error("Duplicate ATS ledger check identity");
  }
  const checks = report.scenarios.flatMap((s) => s.checks);
  const nonprovisional = checks.filter((c) =>
    c.basis !== "provisional-source-interpretation"
  );
  const evaluated = nonprovisional.filter((c) => c.result !== "not-produced");
  const matches = evaluated.filter((c) => c.result === "match").length;
  const byKind = Object.fromEntries(
    (["calculation", "document-copy", "binary-attachment"] as const).map(
      (kind) => {
        const selected = rows.filter((r) => r.kind === kind);
        return [kind, {
          count: selected.length,
          counts: Object.fromEntries(
            [...new Set(selected.map((r) => r.result))].sort().map((
              result,
            ) => [
              result,
              selected.filter((r) => r.result === result).length,
            ]),
          ),
        }];
      },
    ),
  );
  return {
    scope:
      "Enumerated local observations only; not the full IRS ATS denominator. No combined pass percentage across unlike kinds.",
    count: rows.length,
    byKind,
    calculationAnchor: {
      scope:
        "Nonprovisional selected calculation comparisons only; printed differences may be answer-key conflicts, not established software defects",
      matching: matches,
      evaluated: evaluated.length,
      notProduced: nonprovisional.length - evaluated.length,
      provisional: checks.length - nonprovisional.length,
      percent: evaluated.length ? 100 * matches / evaluated.length : null,
    },
    attachmentRequirementsNotInventoried: report.scenarios.filter((s) =>
      !s.attachmentCoverage.requirementsInventoried
    ).map((s) => s.id),
    unenumeratedScopes: [
      "Remaining printed and independently derived scenario expectations",
      "Native/PDF values, ownership and presentation",
      "Complete attachment requirements and contents",
      "Applicable IRS business rules and submission-package checks",
    ],
    rows,
  };
}
if (import.meta.main) {
  const { replayAtsChecks } = await import("./ty2025-check-replay.ts");
  const ledger = buildAtsCheckLedger(await replayAtsChecks());
  const json = JSON.stringify(ledger, null, 2) + "\n";
  if (Deno.args[0]) await Deno.writeTextFile(Deno.args[0], json);
  else console.log(json);
}
