import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import {
  calculateGovernmentPayments2026,
  governmentSource2026Schema,
} from "./government-source.ts";
import {
  familyLeaveFixture2026,
  governmentGraphFixture2026,
  governmentRefundFixture2026,
} from "./government.fixture.ts";
import { socialSecurityGraphFixture2026 } from "./social-security.fixture.ts";
import { childTaxFixture2026 } from "./child-tax.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
// Strict owner schema is intentionally built from the three authoritative keys.
function reviewed(f = governmentGraphFixture2026()) {
  return {
    filing_status: f.general.filing_status,
    taxpayer_ssn: f.general.taxpayer_ssn,
    ...f.government_payments,
  };
}
Deno.test("Government unemployment, repayments and withholding reconcile through AGI and deductions", () => {
  const f = governmentGraphFixture2026(), p = complete(f);
  assertEquals(p.schedule1.line7_unemployment, 17000);
  assertEquals(p.schedule1.line7_repaid, 3000);
  assertEquals(p.f1040.line11b_agi, 57000);
  assertEquals(p.f1040.line25b_withheld_1099, 2000);
  const g = calculateGovernmentPayments2026(reviewed(f));
  assertEquals(g.cents.federal_withheld, 2000.25);
  f.government_payments.claim.copies[0].box1_unemployment = 17000;
  f.government_payments.claim.copies[0].unemployment_review!.box1_reporting =
    "net_of_same_year_repayments";
  assertEquals(complete(f).f1040.line11b_agi, 57000);
});
Deno.test("Fully repaid unemployment retains its zero line and repayment annotation", () => {
  const f = governmentGraphFixture2026();
  f.government_payments.claim.copies[0].unemployment_review!.repayments[0]
    .amount = 20000;
  const p = complete(f);
  assertEquals(p.schedule1.line7_unemployment, 0);
  assertEquals(p.schedule1.line7_repaid, 20000);
  assertEquals(p.f1040.line11b_agi, 40000);
});
Deno.test("Government family leave, RTAA and grants remain unearned and round by printed category", () => {
  const f = familyLeaveFixture2026(), p = complete(f);
  assertEquals(p.f1040.line11b_agi, 3300);
  assertEquals(p.f1040.line1z_total_wages, 0);
  assertEquals(p.schedule1.line8z_total, 3300);
  assertEquals(p.schedule1.line7_unemployment, 0);
  assertEquals(p.f8812.wage_income_from_agi, 0);
  const c = childTaxFixture2026();
  const combined = {
    ...c,
    investment_income: undefined,
    government_payments: f.government_payments,
  };
  const child = complete(combined);
  assertEquals(child.form8615.line1_child_unearned_income, 3300);
});
Deno.test("State refund recovery derives the SALT benefit and reverses it for AMT", () => {
  const f = governmentRefundFixture2026(),
    r = calculateGovernmentPayments2026(reviewed(f)),
    p = complete(f);
  assertEquals(r.recoveries[0].salt_cap, 40000);
  assertEquals(r.lines.state_refund, 3000);
  assertEquals(p.schedule1.line1_state_refund, 3000);
  assertEquals(p.f1040.line11b_agi, 60000);
  const amt = p.form6251.calculation_2026 as { lines: Record<string, number> };
  assertEquals(amt.lines.line2b, 3000);
  assertEquals(amt.lines.line4, 57000);
  for (const method of ["standard", "itemized_sales_tax"] as const) {
    const s = structuredClone(f);
    s.government_payments.claim.refund_histories[0].deduction_method = method;
    if (method === "standard") {
      s.government_payments.claim.refund_histories[0].schedule_a_line5e = 0;
      s.government_payments.claim.refund_histories[0]
        .total_itemized_deductions = 0;
    }
    if (method === "itemized_sales_tax") {
      s.government_payments.claim.refund_histories[0].schedule_a_line5e = 35000;
    }
    assertEquals(
      calculateGovernmentPayments2026(reviewed(s)).lines.state_refund,
      0,
    );
  }
});
Deno.test("State refund benefit honors alternative sales tax, standard deduction and MAGI cap", () => {
  const f = governmentRefundFixture2026(),
    h = f.government_payments.claim.refund_histories[0];
  h.state_local_sales_taxes = 10000;
  assertEquals(
    calculateGovernmentPayments2026(reviewed(f)).lines.state_refund,
    0,
  );
  h.state_local_income_taxes = 20000;
  h.state_local_sales_taxes = 0;
  h.real_personal_property_taxes = 0;
  h.schedule_a_line5e = 20000;
  h.total_itemized_deductions = 20000;
  assertEquals(
    calculateGovernmentPayments2026(reviewed(f)).lines.state_refund,
    4250,
  );
  h.salt_magi = 550000;
  h.state_local_income_taxes = 32000;
  h.schedule_a_line5e = 25000;
  h.total_itemized_deductions = 30000;
  assertEquals(
    calculateGovernmentPayments2026(reviewed(f)).lines.state_refund,
    1000,
  );
});
Deno.test("Family leave participates in taxable Social Security before final AGI", () => {
  const s = socialSecurityGraphFixture2026(20000), f = familyLeaveFixture2026();
  Object.assign(s.general, { do_not_claim_eic: true });
  const p = complete({ ...s, government_payments: f.government_payments });
  const baseline = complete(s);
  assert(
    Number(p.f1040.line6b_ss_taxable) >
      Number(baseline.f1040.line6b_ss_taxable),
  );
});
Deno.test("Government copies reject wrong owners, active corrections, duplicated records and unsupported programs", () => {
  const raw = reviewed();
  const owner = structuredClone(raw);
  owner.claim.copies[0].recipient_tin = "111223333";
  assertThrows(
    () => calculateGovernmentPayments2026(owner),
    Error,
    "recipient",
  );
  const dup = structuredClone(raw);
  dup.claim.copies.push(structuredClone(dup.claim.copies[0]));
  assertThrows(() => calculateGovernmentPayments2026(dup), Error, "distinct");
  const prior = structuredClone(raw);
  prior.claim.copies[0].unemployment_review!.repayments[0].benefit_year = 2025;
  assertThrows(
    () => calculateGovernmentPayments2026(prior),
    Error,
    "claim-of-right",
  );
  const mismatch = structuredClone(raw);
  mismatch.claim.copies[0].unemployment_review!.receipts[0].amount = 1;
  assertThrows(
    () => calculateGovernmentPayments2026(mismatch),
    Error,
    "reconcile",
  );
  const corrected = structuredClone(raw);
  corrected.claim.copies[0].corrected = true;
  corrected.claim.copies[0].superseded_document_references = ["original-copy"];
  assertEquals(
    calculateGovernmentPayments2026(corrected).lines.unemployment,
    17000,
  );
  corrected.claim.copies[0].superseded_document_references = [
    corrected.claim.copies[0].source_document_reference,
  ];
  assertThrows(
    () => calculateGovernmentPayments2026(corrected),
    Error,
    "active",
  );
  assertThrows(() =>
    governmentSource2026Schema.parse({
      ...raw,
      claim: {
        ...raw.claim,
        copies: [{ ...raw.claim.copies[0], box7_agriculture: 1 }],
      },
    })
  );
  const medical = familyLeaveFixture2026();
  (medical.government_payments.claim.copies[0].family_leave_review as Record<
    string,
    unknown
  >).no_medical_leave_sick_pay_or_employer_paid_benefits = false;
  assertThrows(() => calculateGovernmentPayments2026(reviewed(medical)));
});
Deno.test("Refund histories reject unmatched years, invented prior SALT and changed filing units", () => {
  const f = governmentRefundFixture2026();
  f.government_payments.claim.copies[0].box3_tax_year = 2024;
  assertThrows(
    () => calculateGovernmentPayments2026(reviewed(f)),
    Error,
    "original year",
  );
  f.government_payments.claim.copies[0].box3_tax_year = 2025;
  const h = f.government_payments.claim.refund_histories[0];
  h.schedule_a_line5e = 1;
  assertThrows(
    () => calculateGovernmentPayments2026(reviewed(f)),
    Error,
    "SALT",
  );
  h.schedule_a_line5e = 40000;
  h.filing_status = FilingStatus.MFJ;
  h.spouse_tin = "987654321";
  assertThrows(
    () => calculateGovernmentPayments2026(reviewed(f)),
    Error,
    "Changed filing units",
  );
});
Deno.test("Government state withholding preserves both state rows while federal withholding combines once", () => {
  const f = governmentGraphFixture2026(),
    c = f.government_payments.claim.copies[0];
  c.state_information.push({
    state: "NY",
    payer_state_id: "STATE2",
    box12_state_withheld: 500.25,
  });
  const p = complete(f);
  assertEquals(p.schedule_a.information_return_tax_sources, [{
    document_type: "1099-G",
    source_document_reference: "1099g-1",
    recipient_tin: "123456789",
    payer_tin: "120001234",
    account_number: "benefit-1",
    state: "MA/NY",
    payer_state_id: "STATE1/STATE2",
    state_withheld: 2000.5,
  }]);
  assertEquals(p.f1040.line25b_withheld_1099, 2000);
  const extra = structuredClone(c);
  extra.source_document_reference = "1099g-2";
  extra.account_number = "benefit-2";
  extra.unemployment_review!.receipts[0].record_reference = "payment-2";
  extra.unemployment_review!.repayments[0].record_reference = "repay-2";
  f.government_payments.claim.copies.push(extra);
  assertEquals(complete(f).f1040.line25b_withheld_1099, 4001);
});
Deno.test("Multiple refund copies share one prior deduction benefit rather than claiming it twice", () => {
  const f = governmentRefundFixture2026(),
    c = f.government_payments.claim.copies[0];
  c.box2_state_refund = 4000;
  const extra = structuredClone(c);
  extra.source_document_reference = "refund-2";
  extra.account_number = "refund-2";
  extra.box1_unemployment = 0;
  delete extra.unemployment_review;
  extra.box4_federal_withheld = 0;
  extra.state_information = [];
  f.government_payments.claim.copies.push(extra);
  assertEquals(
    calculateGovernmentPayments2026(reviewed(f)).lines.state_refund,
    3000,
  );
  assertThrows(() =>
    calculateGovernmentPayments2026(
      {
        ...reviewed(f),
        claim: { ...f.government_payments.claim, taxable_refund: 0 },
      } as never,
    )
  );
});
