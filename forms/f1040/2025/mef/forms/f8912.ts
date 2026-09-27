import { element, elements } from "../../../mef/xml.ts";
import { z } from "zod";
import {
  calculateForm8912IndividualLimit,
  calculateForm8912PartIVBond,
  deriveForm8912IndividualLimitInput,
  type Form8912FinalizedReturnLines,
} from "../../../nodes/inputs/f8912/calculation.ts";
import {
  type F8912UnreportedBond,
  inputSchema,
  interestFromItem,
  partIVRowInput,
  sourceLinesFromInput,
} from "../../../nodes/inputs/f8912/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

// One return-level Form 8912, with all bond rows and finalized Part II.
export function buildForm8912Document(
  rawInput: unknown,
  finalizedReturn: Form8912FinalizedReturnLines,
): string {
  const input = inputSchema.parse(rawInput);
  const reportedBonds = input.f8912s.flatMap((item) => item.reported_bonds);
  const unreportedBonds = input.f8912s.flatMap((item) => item.unreported_bonds);
  if (reportedBonds.length > 99 || unreportedBonds.length > 99) {
    throw new Error(
      "Form 8912 MeF supports at most 99 Part III or Part IV bond groups",
    );
  }
  const source = sourceLinesFromInput(input);
  input.f8912s.forEach(interestFromItem);
  const limit = calculateForm8912IndividualLimit(
    deriveForm8912IndividualLimitInput(source, finalizedReturn),
  );
  if (source.hasPassThroughCrebCredit) {
    throw new Error(
      "Form 8912 pass-through CREB credit needs its separate taxable-income limit",
    );
  }
  if (Math.abs(finalizedReturn.schedule3Line6k - limit.line12) > 0.000001) {
    throw new Error(
      "Form 8912 line 12 must reconcile to finalized Schedule 3 line 6k",
    );
  }

  let line19 = 0;
  const partIV = unreportedBonds.map((bond) => {
    const details = bond.line18_rows.map((row) => {
      const sourceRow = partIVRowInput(bond, row);
      const lines = calculateForm8912PartIVBond(sourceRow);
      line19 += lines.line18f;
      return elements("BondNotRptOn1097BTCDetail", [
        element("CUSIPNum", row.cusip),
        element("PrinciplePaymentDt", row.principal_payment_date),
        element("InterestPaymentDt", row.interest_payment_date),
        element("OutstndingBondPrinAmt", row.outstanding_principal),
        element("InterestPayableAmt", row.interest_payable),
        element("CreditRt", String(row.credit_rate)),
        element("TotalBeforeOthLimitationsCrAmt", lines.line18d),
        element(
          "PercentageAmt",
          (sourceRow.creditAllowancePercentage * 100).toFixed(2),
        ),
        element("BeforeOtherLmtAllowableCrAmt", lines.line18f),
      ]);
    });
    return partIVBondXml(bond, details);
  });

  return elements("IRS8912", [
    elements("TotalForm8912BondCreditGrp", [
      element("TotalAllForm1097BTCAmt", source.line1),
      element("NewCleanEnergyBondAmt", source.line2),
    ]),
    element("CarryforwardPYBondCreditAmt", source.line3),
    element("TotalCreditAmt", limit.line4),
    element("RegularTaxBeforeCreditAmt", limit.line7),
    element("AlternativeMinimumTaxAmt", limit.line8),
    element("SumRegularTaxAndAltMinTxAmt", limit.line9),
    element("ForeignTaxCreditAmt", limit.line10a),
    element("CertainAllowableCreditsAmt", limit.line10b),
    element("GeneralBusinessCreditAmt", limit.line10c),
    element("CreditPriorYearMinimumTaxAmt", limit.line10d),
    element("TotalCreditsAmt", limit.line10e),
    element("NetIncomeTaxAmt", limit.line11),
    element("CurrentYearAllowableCreditAmt", limit.line12),
    ...reportedBonds.map((bond) =>
      elements("BondInformation", [
        elements("BondIssuerName", [
          element("BusinessNameLine1Txt", bond.issuer_name),
        ]),
        element("BondIssuerEIN", bond.issuer_ein),
        element("UniqueId", bond.unique_identifier),
        element("Form1097BTCAmt", bond.credit_amount),
      ])
    ),
    element("TotalAllForm1097BTCAmt", source.line1),
    ...partIV,
    element("TotalOtherNotRptF1097BTCAmt", line19),
    element("NewCleanEnergyBondAmt", source.line2),
  ]);
}

function partIVBondXml(
  bond: F8912UnreportedBond,
  details: readonly string[],
): string {
  return elements("BondNotOnForm1097BTCGrp", [
    elements("BondIssuerName", [
      element("BusinessNameLine1Txt", bond.issuer_name),
    ]),
    element("CityNm", bond.issuer_city),
    element("StateAbbreviationCd", bond.issuer_state),
    element("BondIssuerEIN", bond.issuer_ein),
    element("BondIssueDt", bond.issue_date),
    element("BondMaturityDt", bond.maturity_date),
    element("BondDisposedDt", bond.disposition_date),
    ...details,
  ]);
}

const amount = z.number().finite().nonnegative();
const returnSchema = z.object({
  line16_income_tax: amount,
  line17_additional_taxes: amount.optional(),
  line19_child_tax_credit: amount.optional(),
  line20_nonrefundable_credits: amount.optional(),
  form8912_source_lines: z.object({
    line1: amount,
    line2: amount,
    line3: amount,
    line4: amount,
  }),
});
const schedule3Schema = z.object({
  line1_total: amount.optional(),
  line6a_total: amount.optional(),
  line6b_prior_year_min_tax_credit: amount.optional(),
  line6k_tax_credit_bonds: amount.optional(),
  line8_total: amount.optional(),
});
const form6251Schema = z.object({ line11_amt: amount });
const form3800Schema = z.object({ allowed_credit: amount });
type PendingForm8912 = Partial<z.infer<typeof inputSchema>> & {
  readonly allowed_credit?: number;
  readonly unused_credit?: number;
};

function sameMoney(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

export function finalizedReturnLines(
  context: MefBuildContext,
  source: ReturnType<typeof sourceLinesFromInput>,
): Form8912FinalizedReturnLines {
  const form1040 = returnSchema.parse(context.pending?.f1040);
  const schedule3 = schedule3Schema.parse(context.pending?.schedule3);
  const form6251 = form6251Schema.parse(context.pending?.form6251);
  const rawForm3800 = context.pending?.f3800;
  const form3800Credit = rawForm3800
    ? form3800Schema.parse(rawForm3800).allowed_credit
    : 0;
  for (const key of ["line1", "line2", "line3", "line4"] as const) {
    if (!sameMoney(form1040.form8912_source_lines[key], source[key])) {
      throw new Error(
        "Form 8912 source lines do not reconcile to Form 1040 graph",
      );
    }
  }
  if (
    !sameMoney(
      form1040.line20_nonrefundable_credits ?? 0,
      schedule3.line8_total ?? 0,
    )
  ) {
    throw new Error(
      "Form 8912 Schedule 3 line 8 differs from Form 1040 line 20",
    );
  }
  const schedule2Line1z = (form1040.line17_additional_taxes ?? 0) -
    form6251.line11_amt;
  if (schedule2Line1z < 0) {
    throw new Error("Form 8912 Schedule 2 line 1z does not reconcile");
  }
  return {
    form1040Line16: form1040.line16_income_tax,
    form1040Line19: form1040.line19_child_tax_credit ?? 0,
    schedule2Line1z,
    form6251Line11: form6251.line11_amt,
    schedule3Line1: schedule3.line1_total ?? 0,
    schedule3Line6a: schedule3.line6a_total ?? 0,
    schedule3Line6b: schedule3.line6b_prior_year_min_tax_credit ?? 0,
    schedule3Line6k: schedule3.line6k_tax_credit_bonds ?? 0,
    schedule3Line8: schedule3.line8_total ?? 0,
    form3800AllowedCredit: form3800Credit,
  };
}

export const form8912: MefFormDescriptor<"f8912", PendingForm8912> = {
  pendingKey: "f8912",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8912.pdf",
  build(fields, context = {}) {
    if (!fields.f8912s?.length) return "";
    const input = inputSchema.parse(fields);
    const source = sourceLinesFromInput(input);
    if (source.line4 <= 0) return "";
    if (
      fields.allowed_credit === undefined || fields.unused_credit === undefined
    ) {
      throw new Error(
        "Form 8912 needs finalized Part II allowed and unused credit",
      );
    }
    if (fields.unused_credit > 0) {
      const sources = input.f8912s.reduce(
        (count, item) =>
          count + item.reported_bonds.length + item.unreported_bonds.length +
          item.carryforwards.length,
        0,
      );
      const hasDeductionChoice = input.f8912s.some((item) =>
        [...item.reported_bonds, ...item.unreported_bonds].some((bond) =>
          bond.bond_type === "CREB" ||
          (bond.bond_type === "QZAB" && bond.issue_date < "2008-10-04")
        )
      );
      if (sources !== 1 || hasDeductionChoice) {
        throw new Error(
          "Form 8912 limited credit needs bond-specific unused-credit allocation or deduction election",
        );
      }
    }
    const finalized = finalizedReturnLines(context, source);
    const xml = buildForm8912Document(input, finalized);
    if (
      !sameMoney(fields.allowed_credit, finalized.schedule3Line6k) ||
      !sameMoney(fields.unused_credit, source.line4 - fields.allowed_credit)
    ) {
      throw new Error(
        "Form 8912 graph credit does not reconcile to filed Part II",
      );
    }
    return xml;
  },
};
