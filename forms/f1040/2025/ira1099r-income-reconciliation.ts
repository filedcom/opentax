import { f1099r } from "../nodes/inputs/f1099r/index.ts";
import { f4852 } from "../nodes/inputs/f4852/index.ts";

type IraAmounts = { gross: number; taxable: number };

function sourcedIraAmounts(
  source: unknown,
  node: typeof f1099r | typeof f4852,
): IraAmounts {
  if (source === undefined) return { gross: 0, taxable: 0 };
  const parsed = node.inputSchema.parse(source);
  const context = { taxYear: 2025, formType: "f1040" } as const;
  const result = node === f1099r
    ? f1099r.compute(context, parsed as Parameters<typeof f1099r.compute>[1])
    : f4852.compute(context, parsed as Parameters<typeof f4852.compute>[1]);
  const fields = result.outputs.find((row) => row.nodeType === "f1040")
    ?.fields;
  return {
    gross: (fields?.line4a_ira_gross as number | undefined) ?? 0,
    taxable: (fields?.line4b_ira_taxable as number | undefined) ?? 0,
  };
}

function retainedAgiIraTaxable(
  pending: Record<string, unknown>,
): number | undefined {
  const raw = (pending.agi_aggregator as Record<string, unknown> | undefined)
    ?.line4b_ira_taxable;
  if (raw === undefined) return undefined;
  const amounts = Array.isArray(raw) ? raw : [raw];
  if (
    !amounts.every((amount) =>
      typeof amount === "number" && Number.isFinite(amount)
    )
  ) {
    throw new Error("Retained AGI IRA taxable amount is invalid");
  }
  return (amounts as number[]).reduce((sum, amount) => sum + amount, 0);
}

/** Replay IRA distributions into Form 1040 and its retained AGI input. */
export function assertIra1099rIncomeSource(
  pending: Record<string, unknown>,
): void {
  const issued = sourcedIraAmounts(pending.f1099r, f1099r);
  const substitute = sourcedIraAmounts(pending.f4852, f4852);
  const issuedRows = pending.f1099r === undefined ? [] : f1099r.inputSchema
    .parse(pending.f1099r).f1099rs;
  // Form 8606 owns line 4a for reviewed Roth distributions excluded from the
  // ordinary Form 1099-R gross output, but the issued box 1 still proves it.
  const form8606RothGross = issuedRows.filter((row) =>
    row.exclude_8606_roth === true && row.no_distribution_received !== true
  ).reduce((sum, row) => sum + row.box1_gross_distribution, 0);
  const form8606IncomeSource = issuedRows.some((row) =>
    row.no_distribution_received !== true &&
    (row.exclude_8606_roth === true || row.rollover_code === "C" ||
      (row.box7_ira_simple_indicator === true &&
        (row.prior_ira_basis ?? 0) > 0))
  );
  if (form8606IncomeSource && pending.form8606 === undefined) {
    throw new Error("IRA basis or Roth distribution needs retained Form 8606");
  }
  const expectedGross = issued.gross + substitute.gross + form8606RothGross;
  const filed = pending.f1040 as Record<string, unknown> | undefined;
  const line4a = filed?.line4a_ira_gross ?? 0;
  const line4b = filed?.line4b_ira_taxable ?? 0;
  const omitFullyTaxableGross = line4a === 0 && expectedGross > 0 &&
    line4b === expectedGross && !form8606IncomeSource;
  if (
    typeof line4a !== "number" || !Number.isFinite(line4a) ||
    typeof line4b !== "number" || !Number.isFinite(line4b) ||
    (!omitFullyTaxableGross && line4a !== expectedGross)
  ) {
    throw new Error("Form 1040 line 4a differs from retained IRA sources");
  }
  const agiTaxable = retainedAgiIraTaxable(pending);
  if (
    (!form8606IncomeSource &&
      line4b !== issued.taxable + substitute.taxable) ||
    (line4b !== 0 && agiTaxable === undefined) ||
    (agiTaxable !== undefined && line4b !== agiTaxable)
  ) {
    throw new Error(
      "Form 1040 line 4b and AGI differ from retained IRA sources",
    );
  }
}
