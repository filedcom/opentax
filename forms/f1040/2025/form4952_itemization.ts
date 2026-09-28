import { z } from "zod";

const standardDeductionSchema = z.object({
  itemized_deductions: z.number().nonnegative(),
});
const taxCalculationSchema = z.object({
  taking_standard_deduction: z.literal(false),
});
const form1040Schema = z.object({
  line12a_standard_deduction: z.number().nonnegative().optional(),
  line12e_itemized_deductions: z.number().nonnegative(),
});

/** Match Form 4952's deduction to the selected Schedule A total on Form 1040. */
export function reconcileForm4952Itemization(
  pending: Readonly<Record<string, unknown>>,
  form4952Deduction: number,
): void {
  if (pending.form_1116 !== undefined) {
    throw new Error(
      "Form 4952 with independent Form 1116 needs source-backed investment-interest allocation before export",
    );
  }
  const selected = standardDeductionSchema.safeParse(
    pending.standard_deduction,
  );
  const tax = taxCalculationSchema.safeParse(pending.income_tax_calculation);
  const returnForm = form1040Schema.safeParse(pending.f1040);
  if (!selected.success || !tax.success || !returnForm.success) {
    throw new Error(
      "Form 4952 deduction needs the calculated itemization choice and finalized Form 1040",
    );
  }
  if (
    returnForm.data.line12a_standard_deduction !== undefined ||
    selected.data.itemized_deductions < form4952Deduction ||
    returnForm.data.line12e_itemized_deductions !==
      selected.data.itemized_deductions
  ) {
    throw new Error(
      "Form 4952 deduction differs from selected Schedule A total on Form 1040",
    );
  }
}
