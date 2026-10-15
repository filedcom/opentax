import { z } from "zod";
import {
  Box12Code,
  w2ItemSchema,
} from "../../nodes/inputs/income/wages/w2/index.ts";
const money = z.number().finite().nonnegative();
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const sourceShape = w2ItemSchema.innerType();
const legacyBox12 = sourceShape.shape.box12_entries.unwrap().element;
export const newCodes = new Set(["TP", "TT", "TA", "II"]);

/** Issued 2026 W-2 facts; 2025 transitional tip/overtime evidence is not accepted. */
export const w2Item2026Schema = sourceShape.omit({
  box12_entries: true,
  box14_entries: true,
  box14b_tipped_code: true,
  qualified_tips_box14_review: true,
  flsa_overtime_review: true,
  excess_deferral_review: true,
}).extend({
  tax_year: z.literal(2026),
  employer_ein: ein,
  employer_name: reference,
  employee_ssn: ssn,
  source_document_reference: reference,
  box1_wages: money,
  box2_fed_withheld: money,
  box12_entries: z.array(
    legacyBox12.extend({
      code: z.union([
        z.nativeEnum(Box12Code),
        z.enum(["TP", "TT", "TA", "II"]),
      ]),
      amount: money,
      code_g_employee_elective_amount: money.optional(),
    }).strict(),
  ).optional(),
  box14a_entries: sourceShape.shape.box14_entries,
  box14b_tipped_codes: z.array(z.string().regex(/^\d{3}$/)).min(1).max(2)
    .refine(
      (codes) => new Set(codes).size === codes.length,
      "Repeated occupation code",
    )
    .optional(),
}).strict().superRefine((item, ctx) => {
  // Old source schemas use nonnegative numbers without an explicit finite check.
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: "Amount must be finite",
      });
    }
  }
  if (
    (item.box14a_entries ?? []).some((entry) => !Number.isFinite(entry.amount))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box14a_entries"],
      message: "Amount must be finite",
    });
  }
  const entries = item.box12_entries ?? [];
  const seen = new Set<string>();
  for (const entry of entries) {
    // Multiple retirement entries may represent different contribution years;
    // the current intake does not model those years and cannot combine them.
    if (seen.has(entry.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box12_entries"],
        message: "Repeated box 12 code needs contribution-year reconciliation",
      });
    }
    seen.add(entry.code);
    if (
      newCodes.has(entry.code) && (
        entry.code_g_governmental_457b !== undefined ||
        entry.code_g_employee_elective_amount !== undefined ||
        entry.code_g_employee_split_review_ref !== undefined
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box12_entries"],
        message: "Code G split facts belong only on code G",
      });
    }
    if (
      (entry.code === "TP" || entry.code === "TT") &&
      entry.amount > item.box1_wages
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box12_entries"],
        message: "Reported tips/overtime cannot exceed box 1 wages",
      });
    }
  }
  if (
    entries.some((entry) => entry.code === "TP" && entry.amount > 0) &&
    !item.box14b_tipped_codes
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box14b_tipped_codes"],
      message: "Code TP needs box 14b occupation codes",
    });
  }
});
