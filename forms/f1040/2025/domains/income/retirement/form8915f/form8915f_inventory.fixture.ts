import {
  type Form8915FItem,
  itemSchema,
} from "../../../../../nodes/inputs/income/retirement/f8915f/index.ts";
import { itemSchema as retirementSchema } from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { paymentPackets } from "../../investments/form6252/form6252_payments.fixture.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

// Synthetic reviewed source records; these are not authenticated issuer documents.
export function distribution(
  id: number,
  amount: number,
  kind: Form8915FItem["retirement_source_kind"] = "plan",
  owner: Form8915FItem["owner"] = "T",
  full = false,
  repayment = 0,
): Form8915FItem {
  return itemSchema.parse({
    retirement_source_kind: kind,
    owner,
    recipient_ssn: owner === "T" ? "123456789" : "987654321",
    fema_number: "DR-4871-TX",
    disaster_begin_date: "2025-03-26",
    disaster_declaration_date: "2025-05-21",
    distribution_date: new Date(Date.UTC(2025, 5, id)).toISOString().slice(
      0,
      10,
    ),
    qualified_area_home_review_reference:
      "Reviewed principal home within qualified disaster area",
    economic_loss_review_reference: "Reviewed economic loss from disaster",
    eligible_retirement_source_review_reference:
      "Reviewed eligible retirement source",
    no_ira_basis_review_reference: kind === "traditional_ira"
      ? "Reviewed complete IRA basis history: zero"
      : undefined,
    no_prior_distributions_review_reference:
      "Reviewed complete current and prior disaster ledger",
    repayment: repayment
      ? {
        kind: "timely",
        amount: repayment,
        date: "2025-09-01",
        receiving_plan_review_reference: "Reviewed eligible receiving plan",
        repayment_record_reference: `Repayment-${owner}-${id}`,
        return_filing_date: "2026-04-10",
        filing_date_review_reference: "Reviewed filing date",
        filing_deadline: { kind: "ordinary" },
      }
      : { kind: "none", review_reference: "Reviewed no repayments" },
    source_1099r_document_reference: `Issued-2025-${owner}-${id}`,
    source_1099r_payer_ein: "120000001",
    source_1099r_account_number: `${owner}-${id}`,
    gross_distribution: amount,
    taxable_distribution: amount,
    full_inclusion_elected: full,
  });
}
export function issuedSource(item: Form8915FItem) {
  return retirementSchema.parse({
    payer_name: "Example Retirement Plan",
    payer_ein: item.source_1099r_payer_ein,
    recipient_ssn: item.recipient_ssn,
    account_number: item.source_1099r_account_number,
    source_document_reference: item.source_1099r_document_reference,
    ts: item.owner,
    box1_gross_distribution: item.gross_distribution,
    box2a_taxable_amount: item.taxable_distribution,
    box7_distribution_code: "7",
    box7_ira_simple_indicator:
      item.retirement_source_kind === "traditional_ira",
    box13_date_of_payment: item.distribution_date,
    form8915f_treatment: item.full_inclusion_elected ? "full" : "three_years",
    form8915f_repayment_amount: item.repayment.kind === "timely"
      ? item.repayment.amount
      : undefined,
  });
}
function packet(
  id: string,
  items: Form8915FItem[],
  expected: {
    iraGross: number;
    iraTaxable: number;
    planGross: number;
    planTaxable: number;
    tax: number;
    worksheets?: number;
    extraPages?: number;
  },
  ordinary: ReturnType<typeof issuedSource>[] = [],
) {
  const joint = items.some((i) => i.owner === "S");
  return {
    id,
    expected,
    joint,
    inputs: {
      general: {
        ...paymentPackets[0].inputs.general,
        taxpayer_dob: "1965-01-01",
        ...(joint
          ? {
            filing_status: FilingStatus.MFJ,
            spouse_first_name: "Bea",
            spouse_last_name: "Taxpayer",
            spouse_ssn: "987654321",
            spouse_dob: "1965-01-01",
          }
          : {}),
      },
      w2: paymentPackets[0].inputs.w2,
      f8915f: items.map((i) => ({
        ...i,
        other_distribution_nonqualified_review_reference:
          ordinary.some((o) => o.ts === i.owner)
            ? "Reviewed all ordinary distributions outside disaster claim"
            : undefined,
      })),
      f1099r: [...items.map(issuedSource), ...ordinary],
    },
  };
}
const ordinary = [
  distribution(20, 2000),
  distribution(21, 3000),
  distribution(22, 4000, "traditional_ira"),
].map((i) => ({ ...issuedSource(i), form8915f_treatment: undefined }));
export const distributionPackets = [
  packet("plan-round-after-aggregation", [
    distribution(1, 10000),
    distribution(2, 10000),
  ], {
    iraGross: 0,
    iraTaxable: 0,
    planGross: 20000,
    planTaxable: 6667,
    tax: 26667,
  }),
  packet("ira-round-after-aggregation", [
    distribution(1, 10001, "traditional_ira"),
    distribution(2, 10001, "traditional_ira"),
  ], {
    iraGross: 20002,
    iraTaxable: 6667,
    planGross: 0,
    planTaxable: 0,
    tax: 26667,
  }),
  packet("mixed-plan-and-ira", [
    distribution(1, 7001),
    distribution(2, 7001),
    distribution(3, 3999, "traditional_ira"),
    distribution(4, 3999, "traditional_ira"),
  ], {
    iraGross: 7998,
    iraTaxable: 2666,
    planGross: 14002,
    planTaxable: 4667,
    tax: 26827,
    extraPages: 1,
  }),
  packet("full-inclusion-mixed", [
    distribution(1, 8000, "plan", "T", true),
    distribution(2, 4000, "plan", "T", true),
    distribution(3, 6000, "traditional_ira", "T", true),
    distribution(4, 4000, "traditional_ira", "T", true),
  ], {
    iraGross: 10000,
    iraTaxable: 10000,
    planGross: 12000,
    planTaxable: 12000,
    tax: 30347,
    extraPages: 1,
  }),
  packet("spouse-only-mixed", [
    distribution(1, 14002, "plan", "S"),
    distribution(2, 7998, "traditional_ira", "S"),
  ], {
    iraGross: 7998,
    iraTaxable: 2666,
    planGross: 14002,
    planTaxable: 4667,
    tax: 17511,
  }),
  packet("joint-separate-elections", [
    distribution(1, 10000),
    distribution(2, 10000),
    distribution(3, 10000, "plan", "S", true),
    distribution(4, 12000, "traditional_ira", "S", true),
  ], {
    iraGross: 12000,
    iraTaxable: 12000,
    planGross: 30000,
    planTaxable: 16667,
    tax: 22205,
  }),
  packet("joint-both-categories", [
    distribution(1, 10000),
    distribution(2, 10000, "traditional_ira"),
    distribution(3, 11000, "plan", "S"),
    distribution(4, 11000, "traditional_ira", "S"),
  ], {
    iraGross: 21000,
    iraTaxable: 7000,
    planGross: 21000,
    planTaxable: 7000,
    tax: 18978,
  }),
  packet("joint-four-repayment-worksheets", [
    distribution(1, 6000, "plan", "T", false, 1000),
    distribution(2, 6000, "plan", "T", false, 500),
    distribution(3, 6000, "traditional_ira", "T", false, 1000),
    distribution(4, 9000, "plan", "S", false, 1500),
    distribution(5, 9000, "traditional_ira", "S", false, 1000),
  ], {
    iraGross: 15000,
    iraTaxable: 3000,
    planGross: 21000,
    planTaxable: 4000,
    tax: 17438,
    worksheets: 4,
  }),
  packet("repayment-zero-taxable-distribution", [
    distribution(1, 6000, "plan", "T", false, 2000),
    distribution(2, 6000, "plan", "T", false, 2000),
  ], {
    iraGross: 0,
    iraTaxable: 0,
    planGross: 12000,
    planTaxable: 0,
    tax: 25067,
    worksheets: 1,
  }),
  packet("multiple-ordinary-sources", [
    distribution(1, 7000),
    distribution(2, 7000),
  ], {
    iraGross: 4000,
    iraTaxable: 4000,
    planGross: 19000,
    planTaxable: 9667,
    tax: 28347,
  }, ordinary),
  packet(
    "eight-distribution-dates",
    Array.from({ length: 8 }, (_, i) => distribution(i + 1, 2000)),
    {
      iraGross: 0,
      iraTaxable: 0,
      planGross: 16000,
      planTaxable: 5333,
      tax: 26347,
      extraPages: 1,
    },
  ),
  packet(
    "distribution-statement-overflow",
    Array.from({ length: 34 }, (_, i) => distribution(i + 1, 500)),
    {
      iraGross: 0,
      iraTaxable: 0,
      planGross: 17000,
      planTaxable: 5667,
      tax: 26427,
      extraPages: 2,
    },
  ),
  packet("maximum-owner-limit", [
    distribution(1, 11000),
    distribution(2, 11000),
  ], {
    iraGross: 0,
    iraTaxable: 0,
    planGross: 22000,
    planTaxable: 7333,
    tax: 26827,
  }),
  packet("small-distributions-aggregate-to-one", [
    distribution(1, 1),
    distribution(2, 1),
  ], { iraGross: 0, iraTaxable: 0, planGross: 2, planTaxable: 1, tax: 25067 }),
  packet(
    "repayment-worksheet-overflow",
    Array.from(
      { length: 34 },
      (_, i) => distribution(i + 1, 500, "plan", "T", false, 50),
    ),
    {
      iraGross: 0,
      iraTaxable: 0,
      planGross: 17000,
      planTaxable: 3967,
      tax: 26019,
      worksheets: 1,
      extraPages: 2,
    },
  ),
];
