import { scheduleAPdfFor } from "../../../../../2025/pdf/forms/deductions/itemized/schedule_a.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { CONFIG_BY_YEAR } from "../../../../../nodes/config/index.ts";
import { topBracketThreshold } from "../../../../../nodes/intermediate/worksheets/deductions/standard/standard_deduction/deduction-limits-2026.ts";
import { inputSchema as standardDeductionInputSchema } from "../../../../../nodes/intermediate/worksheets/deductions/standard/standard_deduction/index.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Schedule A draft (page 1 is the IRS cover sheet). Gifts to charity
// move to page 2 and gain line 13, the gifts above the IRC §170(b)(1)(I) 0.5%
// AGI floor; the carryover becomes line 14 and the total line 15. Line 16 is
// casualty loss, line 17 splits other deductions into 17a-17k, and line 18
// asks whether the IRC §68 limit applies before the filed total.
const P1 = "form1[0].Page1[0]";
const P2 = "form1[0].Page2[0]";

const rename: Readonly<Record<string, string>> = {
  [`${P1}.f1_1[0]`]: `${P1}.f1_01[0]`,
  [`${P1}.f1_2[0]`]: `${P1}.f1_02[0]`,
  [`${P1}.f1_3[0]`]: `${P1}.f1_03[0]`,
  [`${P1}.Line2_ReadOrder[0].f1_4[0]`]: `${P1}.f1_04[0]`,
  [`${P1}.f1_5[0]`]: `${P1}.f1_05[0]`,
  [`${P1}.f1_6[0]`]: `${P1}.f1_06[0]`,
  [`${P1}.f1_7[0]`]: `${P1}.f1_07[0]`,
  [`${P1}.f1_8[0]`]: `${P1}.f1_08[0]`,
  [`${P1}.f1_9[0]`]: `${P1}.f1_09[0]`,
  [`${P1}.Line8b_ReadOrder[0].f1_16[0]`]: `${P1}.f1_17[0]`,
  [`${P1}.f1_17[0]`]: `${P1}.f1_16[0]`,
  [`${P1}.f1_23[0]`]: `${P2}.Line11_ReadOrder[0].f2_01[0]`,
  [`${P1}.f1_24[0]`]: `${P2}.f2_02[0]`,
  [`${P1}.f1_25[0]`]: `${P2}.f2_04[0]`,
  [`${P1}.f1_26[0]`]: `${P2}.f2_05[0]`,
  [`${P1}.f1_27[0]`]: `${P2}.f2_06[0]`,
  [`${P1}.f1_30[0]`]: `${P2}.f2_19[0]`,
  [`${P1}.Line18_ReadOrder[0].c1_3[0]`]: `${P2}.Line19_ReadOrder[0].c2_2[0]`,
};

const added: readonly PdfFieldEntry[] = [
  {
    kind: "text",
    domainKey: "line_8d_mortgage_insurance_allowed",
    pdfField: `${P1}.f1_19[0]`,
  },
  {
    kind: "text",
    domainKey: "ty2026_line13_charity_after_floor",
    pdfField: `${P2}.f2_03[0]`,
  },
  {
    kind: "checkboxWhen",
    domainKey: "ty2026_line18_limited",
    pdfField: `${P2}.c2_1[0]`,
    whenValue: "false",
  },
  {
    kind: "checkboxWhen",
    domainKey: "ty2026_line18_limited",
    pdfField: `${P2}.c2_1[1]`,
    whenValue: "true",
  },
];

const base = scheduleAPdfFor(2026);
const draft = onTy2026Template(
  base,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040sa--dft.pdf",
    pdfSha256:
      "d49acff9afc2faa178b7bf1f70d826d03c2c6def43700880f8ae5bb8bb5a0ffa",
    formPages: [1, 2],
  },
  rename,
  ["print_line_16_description", "line_16_other_deductions"],
  added,
);

const amount = (fields: Record<string, unknown>, key: string) =>
  Number(fields[key] ?? 0);

/** The 2025 copy moved onto the 2026 lines, or a named refusal. */
function on2026Lines(
  copy: Record<string, unknown>,
  all: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  if (
    copy.print_increased_standard === true ||
    copy.line_16_other_deductions !== undefined ||
    copy.net_qualified_disaster_loss !== undefined
  ) {
    throw new Error(
      "TY2026 PDF Schedule A lines 17a-17k are not mapped; export MeF XML",
    );
  }
  const standard = standardDeductionInputSchema.parse(all.standard_deduction);
  const insurance = amount(copy, "line_8d_mortgage_insurance_allowed");
  const line10 = amount(copy, "line_10_interest") + insurance;
  const gifts = [
    "line_11_cash_contributions",
    "line_12_noncash_contributions",
  ].some((key) => copy[key] !== undefined);
  const line13 = amount(copy, "line_11_cash_contributions") +
    amount(copy, "line_12_noncash_contributions") -
    amount(copy, "charitable_agi_floor");
  const line15 = line13 + amount(copy, "line_13_contribution_carryover");
  const filed = all.f1040?.line12e_itemized_deductions;
  const reduction = standard.overall_itemized_limit_reduction ?? 0;
  const total = amount(copy, "line_4_medical_deduction") +
    amount(copy, "line_7_taxes") + line10 + line15 +
    amount(copy, "line_15_casualty_theft_loss");
  if (typeof filed !== "number" || total - reduction !== filed) {
    throw new Error(
      "TY2026 PDF Schedule A lines 4 through 16 differ from Form 1040 line 12e",
    );
  }
  const income = Math.round(standard.agi) -
    Math.round(standard.qbi_deduction ?? 0) -
    Math.round(standard.additional_deductions ?? 0);
  return {
    ...copy,
    line_8e_mortgage_interest: amount(copy, "line_8e_mortgage_interest") +
      insurance,
    line_10_interest: line10,
    ty2026_line13_charity_after_floor: gifts ? line13 : undefined,
    line_14_charity: line15,
    line_17_itemized: filed,
    ty2026_line18_limited: income >
      topBracketThreshold(CONFIG_BY_YEAR[2026], standard.filing_status),
  };
}

export const scheduleAPdf2026: PdfFormDescriptor = {
  ...draft,
  instances(fields, filer, all, ...rest) {
    const copies = base.instances?.(fields, filer, all, ...rest) ?? [fields];
    return copies.map((copy) => on2026Lines(copy, all ?? {}));
  },
};
