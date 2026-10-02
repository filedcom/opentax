import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import {
  calculateOneBusiness8995ALines,
  inputSchema as form8995aInputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import {
  f1099div,
  inputSchema as f1099divInputSchema,
} from "../../../nodes/inputs/f1099div/index.ts";
import { form8995aPdf } from "../../pdf/forms/f8995a.ts";
import { form8995a } from "./f8995a.ts";

const dividend = {
  recipient_tin: "123456789",
  payerName: "Example Qualified REIT",
  source_document_reference: "2025 issued Example Qualified REIT 1099-DIV",
  isNominee: false,
  box11: false,
  box1a: 1_000,
  box5: 1_000,
  holdingPeriodDays: 65,
  section199a_holding_review: {
    ex_dividend_date: "2025-06-01",
    qualified_held_days_in_91_day_window: 55,
    diminished_risk_days_excluded: 10,
    no_related_payment_obligation_confirmed: true,
    review_reference: "2025 REIT holding review",
    reviewed_on: "2026-03-01",
  },
};

const source = {
  payer_name: dividend.payerName,
  source_document_reference: dividend.source_document_reference,
  box1a: dividend.box1a,
  box5: dividend.box5,
  ex_dividend_date: dividend.section199a_holding_review.ex_dividend_date,
  qualified_held_days_in_91_day_window: dividend.section199a_holding_review
    .qualified_held_days_in_91_day_window,
  diminished_risk_days_excluded: dividend.section199a_holding_review
    .diminished_risk_days_excluded,
  no_related_payment_obligation_confirmed: true as const,
  review_reference: dividend.section199a_holding_review.review_reference,
  reviewed_on: dividend.section199a_holding_review.reviewed_on,
};

const fields = {
  filing_status: NodeFilingStatus.Single,
  taxable_income: 300_000,
  net_capital_gain: 0,
  qbi: 100_000,
  w2_wages: 20_000,
  unadjusted_basis: 200_000,
  line6_sec199a_dividends: 1_000,
  reit_dividend_sources: [source],
  business_filing_details: {
    business_name: "Smith Design LLC",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 20_000,
    business_ubia: 200_000,
    one_non_sstb_business_confirmed: true as const,
    no_aggregation_confirmed: true as const,
    no_ptp_or_loss_carryforward_confirmed: true as const,
    qualified_dividends_zero_confirmed: true as const,
    qbi_wages_ubia_sources_confirmed: true as const,
    taxable_income_before_qbi_confirmed: true as const,
  },
};

const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: HeaderFilingStatus.Single,
};

const pending = {
  form8995a: fields,
  f1099div: { f1099divs: [dividend] },
  f1040: {
    line3b_ordinary_dividends: 1_000,
    line13_qbi_deduction: 10_200,
  },
};

Deno.test("Form 8995-A carries one sourced REIT dividend through calculation, MeF, and PDF", () => {
  const parsed = form8995aInputSchema.parse(fields);
  const lines = calculateOneBusiness8995ALines(parsed);
  assertEquals(lines.line28, 1_000);
  assertEquals(lines.line31, 200);
  assertEquals(lines.line32, 10_200);
  assertEquals(lines.line39, 10_200);

  const xml = form8995a.build(parsed, { filer, pending });
  assertStringIncludes(
    xml,
    "<QlfyREITDivPTPIncomeLossAmt>1000</QlfyREITDivPTPIncomeLossAmt>",
  );
  assertStringIncludes(xml, "<REITPTPComponentAmt>200</REITPTPComponentAmt>");
  assertStringIncludes(
    xml,
    "<QualifiedBusinessIncomeDedAmt>10200</QualifiedBusinessIncomeDedAmt>",
  );

  const pdf = form8995aPdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line28, 1_000);
  assertEquals(pdf?.line31, 200);
  assertEquals(pdf?.line39, 10_200);
  assertEquals(
    form8995aPdf.fields.find((entry) => entry.domainKey === "line28")?.pdfField,
    "topmostSubform[0].Page2[0].f2_37[0]",
  );

  const forwarded = f1099div.compute(
    { taxYear: 2025, formType: "f1040" },
    f1099divInputSchema.parse({
      f1099divs: [dividend],
      taxableIncome: 300_000,
      filingStatus: "single",
    }),
  ).outputs.find((item) => item.nodeType === "form8995a");
  assertEquals(forwarded?.fields.reit_dividend_sources, [source]);
});

Deno.test("Form 8995-A REIT source, holding review, and return totals reject tampering", () => {
  const build = (input: Record<string, unknown>, retained = pending) =>
    form8995a.build(form8995aInputSchema.parse(input), {
      filer,
      pending: retained,
    });
  assertThrows(
    () => build({ ...fields, reit_dividend_sources: undefined }),
    Error,
    "REIT line 28",
  );
  assertThrows(
    () => build({ ...fields, line6_sec199a_dividends: 999 }),
    Error,
    "REIT line 28",
  );
  assertThrows(
    () =>
      build(fields, {
        ...pending,
        f1099div: {
          f1099divs: [{
            ...dividend,
            section199a_holding_review: {
              ...dividend.section199a_holding_review,
              qualified_held_days_in_91_day_window: 45,
            },
          }],
        },
      }),
    Error,
    "REIT component",
  );
  assertThrows(
    () =>
      form8995aPdf.projectFields?.(fields, {
        ...pending,
        f1040: { ...pending.f1040, line3b_ordinary_dividends: 999 },
      }),
    Error,
    "REIT line 28",
  );
  assertThrows(
    () =>
      form8995aPdf.projectFields?.(fields, {
        ...pending,
        f1040: { ...pending.f1040, line13_qbi_deduction: 10_000 },
      }),
    Error,
    "Form 1040 line 13",
  );
});
