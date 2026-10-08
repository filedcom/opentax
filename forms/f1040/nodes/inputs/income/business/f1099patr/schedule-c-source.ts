import { type PATRItems } from "./schema.ts";

export function assertPatrScheduleCIncome(
  items: PATRItems,
  businesses: readonly {
    business_reference?: string;
    proprietor_recipient?: string;
    line_f_accounting_method: string;
    line_6_other_income?: number;
  }[],
): void {
  const totals = new Map<string, number>();
  for (const item of items) {
    const treatment = item.distribution_treatment;
    if (treatment?.kind !== "schedule_c") continue;
    const matches = businesses.filter((business) =>
      business.business_reference === treatment.business_reference
    );
    if (
      matches.length !== 1 || !matches[0].proprietor_recipient ||
      matches[0].line_f_accounting_method !== "cash"
    ) {
      throw new Error(
        "PATR distribution needs one identified cash Schedule C proprietor",
      );
    }
    totals.set(
      treatment.business_reference,
      (totals.get(treatment.business_reference) ?? 0) +
        treatment.verified_taxable_amount,
    );
  }
  for (const [reference, total] of totals) {
    if (
      (businesses.find((business) => business.business_reference === reference)
        ?.line_6_other_income ?? 0) < total
    ) {
      throw new Error(
        "Schedule C line 6 must include all sourced taxable PATR distributions",
      );
    }
  }
}
