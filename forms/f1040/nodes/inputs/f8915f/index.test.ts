import { assertEquals, assertThrows } from "@std/assert";
import {
  currentYearDistributionLines,
  f8915f,
  itemSchema,
  verifyCurrentYearDistributionSource,
} from "./index.ts";
import { FilingStatus } from "../../../mef/header.ts";

const reviewed2025Plan = {
  retirement_source_kind: "plan",
  owner: "T",
  recipient_ssn: "111223333",
  fema_number: "DR-4871-TX",
  disaster_begin_date: "2025-03-26",
  disaster_declaration_date: "2025-05-21",
  distribution_date: "2025-06-01",
  qualified_area_home_review_reference: "reviewed principal home in Texas",
  economic_loss_review_reference: "reviewed 2025 flood loss",
  eligible_retirement_source_review_reference:
    "reviewed eligible employer plan",
  no_prior_distributions_review_reference: "reviewed 2025 disaster ledger",
  no_repayments_review_reference: "reviewed retirement repayment ledger",
  source_1099r_document_reference: "issued 2025 1099-R account 123",
  source_1099r_payer_ein: "123456789",
  source_1099r_account_number: "123",
  gross_distribution: 20_000,
  taxable_distribution: 20_000,
  full_inclusion_elected: true,
} as const;

function compute(input: Parameters<typeof f8915f.compute>[1]) {
  return f8915f.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("Form 8915-F absent and empty source make no claim", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(compute({ f8915fs: [] }).outputs, []);
});

Deno.test("Form 8915-F calculates one current-year fully taxable plan distribution", () => {
  const lines = currentYearDistributionLines(
    itemSchema.parse(reviewed2025Plan),
  );
  assertEquals(lines.line1e_available, 22_000);
  assertEquals(lines.line2a_plan_distributions, 20_000);
  assertEquals(lines.line2b_qualified_plan_distributions, 20_000);
  assertEquals(lines.line11_current_income, 20_000);
  assertEquals(lines.line15_form1040_line5b, 20_000);
});

Deno.test("Form 8915-F spreads a new 2025 plan distribution over three years", () => {
  const lines = currentYearDistributionLines(itemSchema.parse({
    ...reviewed2025Plan,
    full_inclusion_elected: false,
  }));
  assertEquals(lines.line10_taxable, 20_000);
  assertEquals(lines.line11_current_income, 6_667);
  assertEquals(lines.line15_form1040_line5b, 6_667);
});

Deno.test("Form 8915-F traditional IRA path needs reviewed no-basis history", () => {
  assertEquals(
    itemSchema.safeParse({
      ...reviewed2025Plan,
      retirement_source_kind: "traditional_ira",
    }).success,
    false,
  );
  const lines = currentYearDistributionLines(itemSchema.parse({
    ...reviewed2025Plan,
    retirement_source_kind: "traditional_ira",
    no_ira_basis_review_reference: "reviewed nondeductible basis history",
    full_inclusion_elected: false,
  }));
  assertEquals(lines.line3b_qualified_ira_distributions, 20_000);
  assertEquals(lines.line15_form1040_line5b, 0);
  assertEquals(lines.line22_current_ira_income, 6_667);
  assertEquals(lines.line26_form1040_line4b, 6_667);
});

Deno.test("Form 8915-F retains the reviewed source for native and PDF export", () => {
  assertEquals(compute({ f8915fs: [reviewed2025Plan] }).outputs, []);
});

Deno.test("Form 8915-F rejects the old amount-only source", () => {
  assertEquals(
    itemSchema.safeParse({
      distribution_year: 2025,
      total_distribution: 30_000,
    })
      .success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({ ...reviewed2025Plan, repayments_this_year: 1_000 })
      .success,
    false,
  );
  const { retirement_source_kind: _oldMissingKind, ...oldPlan } =
    reviewed2025Plan;
  assertEquals(itemSchema.safeParse(oldPlan).success, false);
});

Deno.test("Form 8915-F enforces the disaster limit and distribution window", () => {
  assertEquals(
    itemSchema.safeParse({ ...reviewed2025Plan, gross_distribution: 22_001 })
      .success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...reviewed2025Plan,
      distribution_date: "2025-03-25",
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...reviewed2025Plan,
      distribution_date: "2025-11-16",
    }).success,
    true,
  );
  assertEquals(
    itemSchema.safeParse({
      ...reviewed2025Plan,
      distribution_date: "2025-11-17",
    }).success,
    false,
  );
  assertEquals(
    itemSchema.safeParse({
      ...reviewed2025Plan,
      taxable_distribution: 19_000,
    }).success,
    false,
  );
});

Deno.test("Form 8915-F matches one issued 1099-R and recipient", () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "EXAMPLE ALEX",
    fullName: "Alex Example",
    nameControl: "EXAM",
    filingStatus: FilingStatus.Single,
    address: {
      line1: "1 EXAMPLE WAY",
      city: "AUSTIN",
      state: "TX",
      zip: "78701",
    },
  };
  const source = {
    f1099rs: [{
      payer_name: "Example Plan",
      payer_ein: "12-3456789",
      account_number: "123",
      source_document_reference: "issued 2025 1099-R account 123",
      ts: "T",
      box1_gross_distribution: 20_000,
      box2a_taxable_amount: 20_000,
      box7_distribution_code: "7",
      form8915f_treatment: "full",
      box13_date_of_payment: "2025-06-01",
    }],
  };
  verifyCurrentYearDistributionSource(
    itemSchema.parse(reviewed2025Plan),
    source,
    filer,
  );
  const ira = itemSchema.parse({
    ...reviewed2025Plan,
    retirement_source_kind: "traditional_ira",
    no_ira_basis_review_reference: "reviewed nondeductible basis history",
  });
  const iraSource = {
    f1099rs: [{ ...source.f1099rs[0], box7_ira_simple_indicator: true }],
  };
  verifyCurrentYearDistributionSource(ira, iraSource, filer);
  assertThrows(
    () =>
      verifyCurrentYearDistributionSource(ira, {
        f1099rs: [{ ...iraSource.f1099rs[0], prior_ira_basis: 100 }],
      }, filer),
    Error,
    "matching fully taxable Form 1099-R",
  );
  assertThrows(
    () =>
      verifyCurrentYearDistributionSource(
        itemSchema.parse({
          ...reviewed2025Plan,
          full_inclusion_elected: false,
        }),
        source,
        filer,
      ),
    Error,
    "matching fully taxable Form 1099-R",
  );
  assertThrows(
    () =>
      verifyCurrentYearDistributionSource(
        itemSchema.parse(reviewed2025Plan),
        { f1099rs: [{ ...source.f1099rs[0], box2a_taxable_amount: 19_999 }] },
        filer,
      ),
    Error,
    "matching fully taxable Form 1099-R",
  );
  assertThrows(
    () =>
      verifyCurrentYearDistributionSource(
        itemSchema.parse(reviewed2025Plan),
        { f1099rs: [source.f1099rs[0], source.f1099rs[0]] },
        filer,
      ),
    Error,
    "one matching",
  );
  assertThrows(
    () =>
      verifyCurrentYearDistributionSource(
        itemSchema.parse(reviewed2025Plan),
        {
          f1099rs: [source.f1099rs[0], {
            ...source.f1099rs[0],
            account_number: "other plan",
          }],
        },
        filer,
      ),
    Error,
    "one matching",
  );
  assertThrows(
    () =>
      verifyCurrentYearDistributionSource(
        itemSchema.parse({ ...reviewed2025Plan, recipient_ssn: "222334444" }),
        source,
        filer,
      ),
    Error,
    "recipient must match",
  );
});
