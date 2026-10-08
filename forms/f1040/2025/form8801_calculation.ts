import { z } from "zod";
import {
  calculateForm8801Mtftce,
  form8801MtftceSchema,
} from "./form8801_mtftce.ts";

// Calculation workpapers only. References and entered amounts do not prove
// issuer authenticity, a filed/accepted prior return, or finalized return joins.
const ref = z.string().trim().min(1);
const signed = z.number().int().min(-1_000_000_000).max(1_000_000_000);
const amount = signed.nonnegative();
const workpaper = z.object({ reference: ref, amount }).strict();
const creditKey = z.enum([
  "1",
  "2",
  "3",
  "4",
  "5a",
  "5b",
  "6a",
  "6b",
  "6c",
  "6d",
  "6e",
  "6f",
  "6g",
  "6h",
  "6i",
  "6j",
  "6k",
  "6l",
  "6m",
  "6z",
]);
const capital = z.object({
  reference: ref,
  method: z.enum(["qualified_dividends_worksheet", "schedule_d_worksheet"]),
  line28: amount,
  line29: amount,
  schedule_d_line10: amount.optional(),
  line35: amount,
  line42: amount,
  // Inputs must already reflect AMT and, when applicable, Form 2555 changes.
  amt_and_foreign_modifications_reviewed: z.literal(true),
}).strict().superRefine((v, c) => {
  if (v.method === "qualified_dividends_worksheet") {
    if (v.line29 !== 0 || v.schedule_d_line10 !== undefined) {
      c.addIssue({
        code: "custom",
        message: "Qualified-dividend method skips line 29 and Schedule D limit",
      });
    }
  } else if (v.schedule_d_line10 === undefined) {
    c.addIssue({
      code: "custom",
      message: "Schedule D method needs its line 10 limit",
    });
  }
  if (v.method === "qualified_dividends_worksheet" && v.line35 !== v.line42) {
    c.addIssue({
      code: "custom",
      message: "Qualified-dividend lines 35 and 42 use the same worksheet line",
    });
  }
  if (
    v.method === "schedule_d_worksheet" && v.schedule_d_line10 !== undefined &&
    v.schedule_d_line10 < v.line28
  ) {
    c.addIssue({
      code: "custom",
      message: "Schedule D limit cannot be below its eligible line 28 amount",
    });
  }
});

export const form8801CalculationSchema = z.object({
  tax_year: z.literal(2025),
  prior_tax_year: z.literal(2024),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  reviewer: ref,
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }),
  prior_filing_status: z.enum([
    "single",
    "head_of_household",
    "married_filing_jointly",
    "qualifying_surviving_spouse",
    "married_filing_separately",
  ]),
  prior_form6251: z.object({
    reference: ref,
    line1: signed,
    line2e: signed,
    line2a: signed,
    line2b: signed,
    line2c: signed,
    line2d: signed,
    line2g: signed,
    line2h: signed,
    line10: amount,
    line11: amount,
  }).strict(),
  // Includes trust K-1 box 12 code J and exclusions on other 6251 lines.
  // Prior line 2j's aggregate is deliberately not substituted for this inventory.
  additional_exclusion_items: z.array(
    z.object({
      item_id: ref,
      reference: ref,
      amount: signed,
    }).strict(),
  ),
  minimum_tax_credit_nol_workpaper: workpaper,
  minimum_tax_foreign_credit_exclusion_workpaper: workpaper.extend({
    method: z.enum(["without_form1116_election", "refigured_exclusion_items"])
      .optional(),
    refiguring: form8801MtftceSchema.optional(),
  }).strict().superRefine((v, c) => {
    if (
      (v.method === "refigured_exclusion_items") !==
        (v.refiguring !== undefined)
    ) {
      c.addIssue({
        code: "custom",
        message:
          "Refigured MTFTCE requires its category workpaper; other methods cannot use it",
      });
    }
  }),
  prior_credit_carryforward: workpaper,
  prior_unallowed_qualified_electric_vehicle_credit: workpaper,
  foreign_earned_income: z.object({
    reference: ref,
    form2555_lines45_and50: amount,
    excluded_income_related_deductions: amount,
  }).strict().optional(),
  capital_rate_workpaper: capital.optional(),
  current_return: z.object({
    reference: ref,
    form1040_line16: amount,
    schedule2_line1z: amount,
    form1040_line19: amount,
    form6251_line9: amount,
    schedule3_credits: z.array(z.object({ key: creditKey, amount }).strict()),
  }).strict(),
}).strict().superRefine((v, c) => {
  for (
    const [rows, key, message] of [
      [v.additional_exclusion_items, "item_id", "Duplicate exclusion item"],
      [
        v.current_return.schedule3_credits,
        "key",
        "Duplicate Schedule 3 credit",
      ],
    ] as const
  ) {
    const seen = new Set<string>();
    for (const row of rows) {
      const value = (row as unknown as Record<string, string>)[key];
      if (seen.has(value)) c.addIssue({ code: "custom", message });
      seen.add(value);
    }
  }
});

export type Form8801CalculationInput = z.infer<
  typeof form8801CalculationSchema
>;
const rate = (value: number, percent: number) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Form 8801 percentage requires exact nonnegative dollars");
  }
  return Number((BigInt(value) * BigInt(percent) + 50n) / 100n);
};
const positive = (v: number) => Math.max(0, v);

/** TY2025 Form 8801 individual-filer line arithmetic from reviewed workpapers.
 * This is not a filing API. MTCNOL, MTFTCE source facts and AMT capital-basis
 * workpapers must be independently resolved; references do not authenticate them. */
export function calculateForm8801(input: Form8801CalculationInput) {
  const v = form8801CalculationSchema.parse(input);
  const mfs = v.prior_filing_status === "married_filing_separately";
  const joint = v.prior_filing_status === "married_filing_jointly" ||
    v.prior_filing_status === "qualifying_surviving_spouse";
  const ordinary = (base: number) =>
    base <= (mfs ? 116_300 : 232_600)
      ? rate(base, 26)
      : rate(base, 28) - (mfs ? 2_326 : 4_652);
  const lines: Partial<Record<number, number>> = {};
  const p = v.prior_form6251;
  lines[1] = p.line1 + p.line2e;
  lines[2] = p.line2a + p.line2b + p.line2c + p.line2d + p.line2g + p.line2h +
    v.additional_exclusion_items.reduce((sum, row) => sum + row.amount, 0);
  lines[3] = v.minimum_tax_credit_nol_workpaper.amount;
  let amti = positive(lines[1] + lines[2] - lines[3]);
  if (mfs && amti > 875_950) {
    amti += amti >= 1_142_550 ? 66_650 : rate(amti - 875_950, 25);
  }
  lines[4] = amti;
  if (amti > 0) {
    lines[5] = joint ? 133_300 : mfs ? 66_650 : 85_700;
    lines[6] = joint ? 1_218_700 : 609_350;
    lines[7] = positive(amti - lines[6]);
    lines[8] = rate(lines[7], 25);
    lines[9] = positive(lines[5] - lines[8]);
    lines[10] = positive(amti - lines[9]);
  }
  lines[15] = 0;
  let foreignWorksheet: Record<string, number> | undefined;
  let mtftceRefiguring: ReturnType<typeof calculateForm8801Mtftce> | undefined;
  if ((lines[10] ?? 0) > 0) {
    const fe = v.foreign_earned_income;
    const stacking = fe
      ? positive(
        fe.form2555_lines45_and50 - fe.excluded_income_related_deductions,
      )
      : 0;
    const taxBase = lines[10]! + stacking;
    let tax = ordinary(taxBase);
    const cap = v.capital_rate_workpaper;
    if (cap) {
      lines[27] = taxBase;
      lines[28] = cap.line28;
      if (cap.method === "schedule_d_worksheet") lines[29] = cap.line29;
      lines[30] = cap.method === "qualified_dividends_worksheet"
        ? cap.line28
        : Math.min(cap.line28 + cap.line29, cap.schedule_d_line10!);
      lines[31] = Math.min(taxBase, lines[30]);
      lines[32] = taxBase - lines[31];
      lines[33] = ordinary(lines[32]);
      lines[34] = joint
        ? 94_050
        : v.prior_filing_status === "head_of_household"
        ? 63_000
        : 47_025;
      lines[35] = cap.line35;
      lines[36] = positive(lines[34] - lines[35]);
      lines[37] = Math.min(taxBase, cap.line28);
      lines[38] = Math.min(lines[36], lines[37]);
      lines[39] = lines[37] - lines[38];
      lines[40] = joint
        ? 583_750
        : mfs
        ? 291_850
        : v.prior_filing_status === "head_of_household"
        ? 551_350
        : 518_900;
      lines[41] = lines[36];
      lines[42] = cap.line42;
      lines[43] = lines[41] + lines[42];
      lines[44] = positive(lines[40] - lines[43]);
      lines[45] = Math.min(lines[39], lines[44]);
      lines[46] = rate(lines[45], 15);
      lines[47] = lines[38] + lines[45];
      if (lines[47] !== taxBase) {
        lines[48] = lines[37] - lines[47];
        lines[49] = rate(lines[48], 20);
        if (cap.line29 > 0) {
          lines[50] = lines[32] + lines[47] + lines[48];
          lines[51] = taxBase - lines[50];
          lines[52] = rate(lines[51], 25);
        }
      }
      lines[53] = lines[33] + lines[46] + (lines[49] ?? 0) + (lines[52] ?? 0);
      lines[54] = ordinary(taxBase);
      lines[55] = Math.min(lines[53], lines[54]);
      tax = lines[55];
    }
    if (fe) {
      foreignWorksheet = {
        line1: lines[10]!,
        line2a: fe.form2555_lines45_and50,
        line2b: fe.excluded_income_related_deductions,
        line2c: stacking,
        line3: taxBase,
        line4: tax,
        line5: ordinary(stacking),
        line6: tax - ordinary(stacking),
      };
      tax = foreignWorksheet.line6;
    }
    lines[11] = tax;
    const mtftce = v.minimum_tax_foreign_credit_exclusion_workpaper;
    if (mtftce.method === "refigured_exclusion_items") {
      mtftceRefiguring = calculateForm8801Mtftce(mtftce.refiguring, {
        taxpayer_ssn: v.taxpayer_ssn,
        prior_filing_status: v.prior_filing_status,
        lines,
      });
      if (mtftce.amount !== mtftceRefiguring.form8801_line12) {
        throw new Error(
          "MTFTCE entered total differs from category calculation",
        );
      }
    }
    lines[12] = mtftceRefiguring?.form8801_line12 ?? mtftce.amount;
    lines[13] = tax - lines[12];
    lines[14] = p.line10;
    lines[15] = positive(lines[13] - lines[14]);
  }
  lines[16] = p.line11;
  lines[17] = lines[15];
  lines[18] = lines[16] - lines[17];
  lines[19] = v.prior_credit_carryforward.amount;
  lines[20] = v.prior_unallowed_qualified_electric_vehicle_credit.amount;
  lines[21] = lines[18] + lines[19] + lines[20];
  const fileRequired = lines[21] > 0;
  if (fileRequired) {
    const current = v.current_return;
    const credits = current.schedule3_credits.filter((c) =>
      c.key !== "6b" && c.key !== "6k"
    )
      .reduce((sum, row) => sum + row.amount, 0);
    lines[22] = positive(
      current.form1040_line16 + current.schedule2_line1z -
        current.form1040_line19 - credits,
    );
    lines[23] = current.form6251_line9;
    lines[24] = positive(lines[22] - lines[23]);
    lines[25] = Math.min(lines[21], lines[24]);
    lines[26] = lines[21] - lines[25];
  }
  for (const value of Object.values(lines)) {
    if (!Number.isSafeInteger(value)) {
      throw new Error("Form 8801 arithmetic exceeded exact dollars");
    }
  }
  return {
    lines,
    foreignWorksheet,
    mtftceRefiguring,
    mtftceWorkpaperArithmeticReconciled: mtftceRefiguring !== undefined,
    fileRequired,
    schedule3_line6b: lines[25] ?? 0,
    carryforward_to_2026: lines[26] ?? 0,
    filingReady: false as const,
    priorAcceptanceVerified: false as const,
    workpaperAuthenticityVerified: false as const,
    finalizedReturnReconciled: false as const,
  };
}
