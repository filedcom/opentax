import { z } from "zod";

// A directly sold, nonbusiness investment asset with section 1245 recapture.
// Other property classes, installment sales, and special recapture exceptions
// need separate property-level source and are not inferred from this row.
export const investment1245DispositionSchema = z.object({
  property_id: z.string().trim().min(1),
  property_description: z.string().trim().min(1).max(40),
  acquired_on: z.string().date(),
  sold_on: z.string().date(),
  gross_sales_price: z.number().int().nonnegative(),
  cost_or_other_basis_plus_sale_expense: z.number().int().nonnegative(),
  depreciation_allowed_or_allowable: z.number().int().nonnegative(),
  property_held_for_investment_not_business: z.literal(true),
  section_1245_classification_reviewed: z.literal(true),
  direct_cash_sale_no_special_recapture_exception: z.literal(true),
  sale_document_reference: z.string().trim().min(1),
  basis_document_reference: z.string().trim().min(1),
  depreciation_schedule_reference: z.string().trim().min(1),
}).strict().superRefine((sale, ctx) => {
  const acquired = new Date(`${sale.acquired_on}T00:00:00Z`);
  const sold = new Date(`${sale.sold_on}T00:00:00Z`);
  const anniversary = new Date(Date.UTC(
    acquired.getUTCFullYear() + 1,
    acquired.getUTCMonth(),
    acquired.getUTCDate(),
  ));
  const adjustedBasis = sale.cost_or_other_basis_plus_sale_expense -
    sale.depreciation_allowed_or_allowable;
  const totalGain = sale.gross_sales_price - adjustedBasis;
  if (
    sale.sold_on < "2025-01-01" || sale.sold_on > "2025-12-31" ||
    sold <= anniversary ||
    sale.depreciation_allowed_or_allowable === 0 ||
    adjustedBasis < 0 || totalGain <= 0 ||
    !Number.isSafeInteger(adjustedBasis) || !Number.isSafeInteger(totalGain)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Form 4797 investment section 1245 sale needs a 2025, over-one-year, positive-gain direct sale with supported basis and depreciation",
    });
  }
});

export type Investment1245Disposition = z.infer<
  typeof investment1245DispositionSchema
>;

export function calculateInvestment1245Disposition(
  raw: Investment1245Disposition,
): {
  sale: Investment1245Disposition;
  adjustedBasis: number;
  totalGain: number;
  ordinaryRecapture: number;
  excessCapitalGain: number;
} {
  const sale = investment1245DispositionSchema.parse(raw);
  const adjustedBasis = sale.cost_or_other_basis_plus_sale_expense -
    sale.depreciation_allowed_or_allowable;
  const totalGain = sale.gross_sales_price - adjustedBasis;
  const ordinaryRecapture = Math.min(
    totalGain,
    sale.depreciation_allowed_or_allowable,
  );
  return {
    sale,
    adjustedBasis,
    totalGain,
    ordinaryRecapture,
    excessCapitalGain: totalGain - ordinaryRecapture,
  };
}

export function assertInvestment1245FilingLinks(
  calculated: ReadonlyArray<ReturnType<typeof calculateInvestment1245Disposition>>,
  rows: readonly {
    from_form4797_investment_1245?: true;
    form4797_property_id?: string;
    source_transaction_id?: string;
    proceeds: number;
    gain_loss: number;
  }[],
  schedule1Line4: unknown,
): void {
  const ordinary = calculated.reduce(
    (sum, sale) => sum + sale.ordinaryRecapture,
    0,
  );
  if (
    typeof schedule1Line4 !== "number" ||
    !Number.isFinite(schedule1Line4) || schedule1Line4 !== ordinary
  ) {
    throw new Error(
      "Form 4797 investment recapture needs the finalized Schedule 1 line 4 ordinary gain",
    );
  }
  const specialRows = rows.filter((row) =>
    row.from_form4797_investment_1245 === true
  );
  const expectedRows = calculated.filter((sale) => sale.excessCapitalGain > 0);
  if (
    specialRows.length !== expectedRows.length ||
    expectedRows.some((sale) =>
      specialRows.filter((row) =>
        row.form4797_property_id === sale.sale.property_id &&
        row.source_transaction_id === sale.sale.property_id &&
        row.proceeds === sale.excessCapitalGain &&
        row.gain_loss === sale.excessCapitalGain
      ).length !== 1
    )
  ) {
    throw new Error(
      "Form 4797 investment excess gain needs one matching Form 8949 row per property",
    );
  }
}
