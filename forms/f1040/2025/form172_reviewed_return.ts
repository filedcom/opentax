import type { SourceDocumentBytes } from "../../../core/runtime/source-documents.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { f1040 } from "../nodes/outputs/f1040/index.ts";
import { stageForm172CurrentDeductionSource } from "./form172_current_deduction_source.ts";

const statuses: Record<string, string> = {
  single: "single",
  mfj: "married_filing_jointly",
  mfs: "married_filing_separately",
  hoh: "head_of_household",
  qss: "qualifying_surviving_spouse",
};
function amount(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("NOL current return needs scalar calculated amounts");
  }
  return value;
}

/** Byte-bound current workpaper matched to an actual public pre-NOL return.
 * This proves the starting amounts only. It does not insert a deduction or
 * claim post-NOL AGI refigures, AMT, authentic sources or filing admission. */
export async function stageForm172ReviewedReturnCalculation(
  rawInputs: Readonly<Record<string, unknown>>,
  rawBinding: unknown,
  rawDocuments: readonly SourceDocumentBytes[],
) {
  const inputs = structuredClone(rawInputs);
  const documents = rawDocuments.map((d) => ({
    reference: d.reference,
    bytes: new Uint8Array(d.bytes),
  }));
  const binding = structuredClone(rawBinding);
  for (
    const key of [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule3",
      "form6251",
      "nol_carryforward",
    ]
  ) {
    if (inputs[key] !== undefined) {
      throw new Error(`NOL starting return rejects detached ${key} inputs`);
    }
  }
  const staged = await stageForm172CurrentDeductionSource(binding, documents);
  // The staging function already verifies exact canonical bytes and this claim.
  const claim =
    (binding as { current_review: { reference: string } }).current_review;
  const current = JSON.parse(
    new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      documents.find((d) => d.reference === claim.reference)!.bytes,
    ),
  );
  const annual = current.annual_review;
  const execution = f1040_2025.executeReturn(inputs);
  if (execution.diagnostics.length > 0) {
    throw new Error("NOL starting return needs successful public execution");
  }
  const pending = normalizeAllPending(execution.pending);
  const before = pending.f1040;
  const general = pending.general;
  if (!before || !general || !execution.replayInputs?.f1040) {
    throw new Error(
      "NOL starting return needs computed identity and retained finalizer",
    );
  }
  const identity = (v: unknown) =>
    typeof v === "string" ? v.replaceAll("-", "") : undefined;
  if (
    identity(general.taxpayer_ssn) !== annual.taxpayer_ssn ||
    identity(general.spouse_ssn) !== annual.spouse_ssn ||
    statuses[String(general.filing_status)] !== annual.filing_status
  ) {
    throw new Error(
      "NOL current review differs from actual return owners or filing status",
    );
  }
  const replayInput = f1040.inputSchema.parse(execution.replayInputs.f1040);
  const replay = f1040.compute(
    { taxYear: 2025, formType: "f1040" },
    replayInput,
  ).outputs.find((o) => o.nodeType === "f1040")?.fields;
  if (!replay) throw new Error("NOL finalizer replay is missing");
  for (const key of Object.keys(replay).filter((k) => /^line\d/.test(k))) {
    if (JSON.stringify(replay[key]) !== JSON.stringify(before[key])) {
      throw new Error(`NOL retained finalizer differs from public ${key}`);
    }
  }
  const comparisons: [string, number, number][] = [
    ["AGI", annual.agi, amount(before.line11_agi)],
    [
      "deduction",
      annual.standard_or_itemized_deduction,
      amount(before.line12c_deduction_total),
    ],
    ["QBI", annual.qbi_deduction, amount(before.line13_qbi_deduction)],
    [
      "Schedule1-A",
      annual.schedule1a_deduction?.amount ?? 0,
      amount(before.line13b_additional_deductions),
    ],
    [
      "Schedule1-A senior amount",
      annual.schedule1a_deduction?.senior_amount ?? 0,
      amount(before.schedule1a_line37_senior_deduction),
    ],
    [
      "taxable income",
      annual.reported_taxable_income,
      amount(before.line15_taxable_income),
    ],
    [
      "capital loss deduction",
      annual.capital_loss_deduction.amount,
      Math.max(0, -amount(before.line7_capital_gain)),
    ],
    [
      "earlier NOL deduction",
      annual.return_nol_deduction.amount,
      amount(pending.schedule1?.line8a_nol_deduction),
    ],
  ];
  for (const [name, reviewed, calculated] of comparisons) {
    if (reviewed !== calculated) {
      throw new Error(
        `NOL current ${name} differs from calculated public return`,
      );
    }
  }
  const method = amount(before.line12e_itemized_deductions) > 0
    ? "itemized"
    : "standard";
  if (annual.deduction_method !== method) {
    throw new Error("NOL current deduction method differs from actual return");
  }
  // There is no registered individual section250 route to substantiate it here.
  if (annual.section250_deduction !== 0) {
    throw new Error(
      "NOL current section250 deduction needs a calculated public source join",
    );
  }
  return {
    ...staged,
    current_form1040_before_nol: before,
    public_pending_before_nol: pending,
    public_return_replay_input: replayInput,
    currentReturnStartingAmountsReconciled: true as const,
    publicForm1040JoinVerified: false as const,
    currentAgiDependentRefiguresVerified: false as const,
    filingReady: false as const,
  };
}
