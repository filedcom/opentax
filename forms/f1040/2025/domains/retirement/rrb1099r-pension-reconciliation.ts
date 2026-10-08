import { reconcileForm4852Source } from "../income/form4852/form4852_source.ts";
import { inputSchema } from "../../../nodes/inputs/rrb1099r/index.ts";
import { f1099r } from "../../../nodes/inputs/f1099r/index.ts";
import { f4852 } from "../../../nodes/inputs/f4852/index.ts";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";

/** Replay issued, substitute, and railroad pensions into filed lines 5a/5b. */
export function assertRrb1099rPensionSource(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  const rows = pending.rrb1099r === undefined
    ? []
    : inputSchema.parse(pending.rrb1099r).rrb1099rs;
  const recipients = new Set<string>();
  if (filer) {
    recipients.add(filer.primarySSN.replace(/\D/g, ""));
    if (
      filer.filingStatus === FilingStatus.MarriedFilingJointly && filer.spouse
    ) {
      recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
    }
  }
  if (
    rows.some((row) =>
      ((row.box7_total_gross_paid ?? 0) > 0 ||
        (row.box9_federal_withheld ?? 0) > 0) &&
      !recipients.has(row.recipient_tin ?? "")
    )
  ) {
    throw new Error(
      "RRB-1099-R pension recipient must match taxpayer or joint spouse",
    );
  }
  const rrbGross = rows.reduce(
    (sum, row) => sum + (row.box7_total_gross_paid ?? 0),
    0,
  );
  const filed = pending.f1040 as Record<string, unknown> | undefined;
  const line5a = filed?.line5a_pension_gross ?? 0;
  const line5b = filed?.line5b_pension_taxable ?? 0;
  const context = { taxYear: 2025, formType: "f1040" } as const;
  if (
    pending.f1099r !== undefined && pending.f4852 !== undefined &&
    (pending.f4852 as Record<string, unknown>).reviewed_source === undefined
  ) {
    const issued = f1099r.inputSchema.parse(pending.f1099r).f1099rs;
    const substitutes = f4852.inputSchema.parse(pending.f4852).f4852s;
    const payerIds = new Set(
      issued.map((item) => item.payer_ein?.replace(/\D/g, "")).filter((
        value,
      ): value is string => !!value),
    );
    const payerNames = new Set(
      issued.map((item) => item.payer_name.trim().toUpperCase()),
    );
    if (
      substitutes.some((item) =>
        item.form_type === "R_1099" && (
          (item.payer_tin !== undefined &&
            payerIds.has(item.payer_tin.replace(/\D/g, ""))) ||
          payerNames.has(item.payer_name.trim().toUpperCase())
        )
      )
    ) {
      throw new Error(
        "Form 4852 and issued Form 1099-R share a payer; pension source overlap needs review",
      );
    }
  }
  if (
    pending.f4852 &&
    (pending.f4852 as Record<string, unknown>).reviewed_source && filer
  ) reconcileForm4852Source(pending, filer);
  const pensionFrom = (
    source: unknown,
    node: typeof f1099r | typeof f4852,
  ): { gross: number; taxable: number } => {
    if (source === undefined) return { gross: 0, taxable: 0 };
    const parsed = node.inputSchema.parse(source);
    const output = node === f1099r
      ? f1099r.compute(context, parsed as Parameters<typeof f1099r.compute>[1])
      : f4852.compute(context, parsed as Parameters<typeof f4852.compute>[1]);
    const fields = output.outputs.find((item) => item.nodeType === "f1040")
      ?.fields;
    return {
      gross: (fields?.line5a_pension_gross as number | undefined) ?? 0,
      taxable: (fields?.line5b_pension_taxable as number | undefined) ?? 0,
    };
  };
  const issued = pensionFrom(pending.f1099r, f1099r);
  const substitute = pensionFrom(pending.f4852, f4852);
  // Part II-only Form 4972 ordinary income is deposited separately by its
  // source node and then added to both printed pension lines by Form 1040.
  const ordinary = filed?.line5b_form4972_ordinary ?? 0;
  if (typeof ordinary !== "number" || !Number.isFinite(ordinary)) {
    throw new Error("Form 1040 Form 4972 ordinary pension amount is invalid");
  }
  if (ordinary !== 0 && pending.form4972 === undefined) {
    throw new Error("Form 1040 Form 4972 ordinary pension needs its source");
  }
  const expectedGross = rrbGross + issued.gross + substitute.gross + ordinary;
  const expectedTaxable = rrbGross + issued.taxable + substitute.taxable +
    ordinary;
  // A fully taxable nonrailroad pension may omit line 5a under the 2025
  // Form 1040 instructions; line 5b still needs its retained payer source.
  const omittedFullyTaxableGross = rows.length === 0 && line5a === 0 &&
    expectedGross === expectedTaxable;
  const agiRaw = (pending.agi_aggregator as
    | Record<string, unknown>
    | undefined)?.line5b_pension_taxable;
  const agiTaxable = typeof agiRaw === "number"
    ? agiRaw
    : Array.isArray(agiRaw) &&
        agiRaw.every((value) => typeof value === "number")
    ? agiRaw.reduce((sum, value) => sum + value, 0)
    : undefined;
  if (
    (!omittedFullyTaxableGross && line5a !== expectedGross) ||
    line5b !== expectedTaxable ||
    (ordinary === 0 && agiRaw !== undefined &&
      agiTaxable !== expectedTaxable)
  ) {
    throw new Error(
      "Form 1040 lines 5a and 5b or AGI differ from retained pension sources",
    );
  }
}
