import { assertEquals, assertThrows } from "@std/assert";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { executeDraftSources2026 } from "../execute.ts";
import {
  disabilityException2026,
  disabilityPension2026,
  disabilityWithdrawal2026,
} from "./retirement-disability.fixture.ts";
import {
  claimEarlyExceptions2026,
  exceptionRetirementGraph2026,
} from "./retirement-exceptions.fixture.ts";
import { calculateRetirementSources2026 as calc } from "./retirement-source.ts";

Deno.test("2026 disability exception derives 03 from medical evidence without changing IRA income", async () => {
  for (const simple of [false, true]) {
    const s = disabilityWithdrawal2026(simple), r = calc(s);
    assertEquals(r.lines.line4b_ira_taxable, 10000);
    assertEquals(r.cents.line1h_disability_wages, 0);
    assertEquals(r.early_owners[0].exception_code, "03");
    assertEquals(r.early_owners[0].line1, 10000);
    assertEquals(r.early_owners[0].line2, 10000);
    assertEquals(r.early_owners[0].line4, 0);
    assertEquals(r.early_owners[0].file_form5329, true);
    const g = await executeDraftSources2026(exceptionRetirementGraph2026(s));
    assertEquals(g.diagnostics, []);
    assertEquals(g.pending.f1040.line4b_ira_taxable, 10000);
    assertEquals(g.pending.schedule2.line5_form5329_early_tax ?? 0, 0);
  }
});

Deno.test("2026 disability exception verifies patient, onset, medical proof and retained review date", () => {
  for (
    const patch of [
      { patient_tin: "111223333" },
      { disability_onset_date: "2026-09-02" },
      { disability_onset_date: "1989-12-31" },
      { physician_determination_signed_on: "1989-12-31" },
      { physician_determination_signed_on: "2027-03-01" },
      { physician_record_reference: "" },
      { medical_evidence_covers_payment_date_verified: false },
      { unable_to_perform_any_substantial_gainful_activity_verified: false },
      { disability_caused_by_physical_or_mental_condition_verified: false },
      { physician_expected_duration: "temporary" },
      { distribution_due_to_disability_verified: false },
    ]
  ) {
    const s = disabilityWithdrawal2026();
    Object.assign(
      s.claim.reviews[0].early_distribution!.exception_review!.claims[0],
      patch,
    );
    assertThrows(() => calc(s));
  }
  // Unlike terminal illness, 03 allows a later medical determination proving disability at payment.
  assertEquals(calc(disabilityWithdrawal2026()).line5_early_tax, 0);
  const established = disabilityWithdrawal2026();
  const claim =
    established.claim.reviews[0].early_distribution!.exception_review!
      .claims[0];
  if (claim.kind !== "total_permanent_disability") throw Error("fixture");
  // The duration of a physical/mental condition can be medically established
  // before it prevents work; separate evidence must still establish inability at payment.
  claim.physician_determination_signed_on = "2026-07-31";
  assertEquals(calc(established).line5_early_tax, 0);
});

Deno.test("2026 disability pension splits the minimum-retirement-age day from the following day with one withholding amount", () => {
  const s = disabilityPension2026(), r = calc(s);
  assertEquals(r.cents.line1h_disability_wages, 7000.50);
  assertEquals(r.cents.line5a_pension_gross, 4000.25);
  assertEquals(r.cents.line5b_pension_taxable, 3000.25);
  assertEquals(r.cents.line25b_withheld_1099, 1000.25);
  assertEquals(r.lines.line1h_disability_wages, 7001);
  assertEquals(
    r.rows[0].disability_wage_payments.map((p) => p.record_reference),
    ["may-payment", "birthday-payment"],
  );
  assertEquals(r.early_owners, []);
  assertEquals(r.filed_lines, {
    line5a_pension_gross: 4000,
    line5b_pension_taxable: 3000,
  });
  const d = s.claim.reviews[0].disability_income!;
  if (d.kind !== "employer_disability_pension") throw Error("fixture");
  d.minimum_retirement_age_date = "2027-06-15";
  const wages = calc(s);
  assertEquals(wages.cents.line1h_disability_wages, 10000.75);
  assertEquals(wages.has_pension, false);
  assertEquals(wages.filed_lines, {});
  d.minimum_retirement_age_date = "2025-06-15";
  assertEquals(calc(s).cents.line1h_disability_wages, 0);
  assertEquals(calc(s).cents.line5b_pension_taxable, 10000.75);
});

Deno.test("2026 code-3 ordinary withdrawals require payer review and do not become wages", async () => {
  const s = disabilityPension2026(), r = s.claim.reviews[0];
  r.disability_income = {
    kind: "ordinary_distribution",
    record_reference: "not-a-disability-pension",
    not_employer_disability_pension_verified: true,
  };
  assertEquals(calc(s).cents.line5b_pension_taxable, 10000.75);
  assertEquals(calc(s).cents.line1h_disability_wages, 0);
  const g = await executeDraftSources2026(exceptionRetirementGraph2026(s));
  assertEquals(g.diagnostics, []);
  assertEquals(g.pending.f1040.line5b_pension_taxable, 10001);
  delete r.disability_income;
  assertThrows(() => calc(s), Error, "pension-versus-withdrawal");
  s.claim.copies[0].box7b_ira_sep_simple = true;
  s.claim.copies[0].box2a_taxable_amount =
    s.claim.copies[0].box1_gross_distribution;
  r.plan_type = "traditional_ira";
  assertEquals(calc(s).cents.line4b_ira_taxable, 12000.75);
  delete r.payer_code3_disability_verified;
  assertThrows(() => calc(s), Error, "Code 3");
});

Deno.test("2026 disability pension rejects contradictory or unreconciled owner, plan and payment facts", () => {
  for (
    const patch of [
      { owner_tin: "111223333" },
      { account_number: "other-account" },
      { disability_retirement_date: "2026-06-01" },
      { minimum_retirement_age_date: "1970-01-01" },
      { earliest_non_disability_pension_eligibility_verified: false },
      { no_special_military_service_or_terrorism_exclusion_verified: false },
    ]
  ) {
    const s = disabilityPension2026();
    Object.assign(s.claim.reviews[0].disability_income!, patch);
    assertThrows(() => calc(s));
  }
  for (
    const patch of [
      { payment_date: "2027-05-31" },
      { taxable: 4001 },
      { gross: 3999 },
      { record_reference: "birthday-payment" },
      { taxable: 3500.251 },
    ]
  ) {
    const s = disabilityPension2026(),
      d = s.claim.reviews[0].disability_income!;
    if (d.kind !== "employer_disability_pension") throw Error("fixture");
    Object.assign(d.payments[0], patch);
    assertThrows(() => calc(s));
  }
  const ira = disabilityPension2026();
  ira.claim.copies[0].box7b_ira_sep_simple = true;
  ira.claim.copies[0].box2a_taxable_amount =
    ira.claim.copies[0].box1_gross_distribution;
  ira.claim.reviews[0].plan_type = "traditional_ira";
  assertThrows(() => calc(ira), Error, "cannot come from an IRA");
});

Deno.test("2026 early-coded disability pension uses the entire taxable distribution for Part I despite its wage/pension split", () => {
  const s = disabilityPension2026(), d = s.claim.reviews[0].disability_income!;
  if (d.kind !== "employer_disability_pension") throw Error("fixture");
  s.claim.copies[0].box7a_distribution_codes = [Code.Code1];
  delete s.claim.reviews[0].payer_code3_disability_verified;
  s.claim.reviews[0].early_distribution = {
    record_reference: "early-payment-review",
    complete_payment_inventory_verified: true,
    payments: structuredClone(d.payments),
  };
  claimEarlyExceptions2026(
    s,
    d.payments.map((p) => ({
      ...disabilityException2026(),
      payment_reference: p.record_reference,
      disability_onset_date: "2025-01-01",
    })),
  );
  const r = calc(s);
  assertEquals(r.early_owners[0].line1, 10001);
  assertEquals(r.early_owners[0].line2, 10001);
  assertEquals(r.early_owners[0].exception_code, "03");
  assertEquals(r.line5_early_tax, 0);
  s.claim.reviews[0].early_distribution!.payments[0].payment_date =
    "2026-05-30";
  assertThrows(() => calc(s), Error, "same dated payments");
});

Deno.test("2026 disability payment references and plan dates reconcile across current copies but remain owner-specific", () => {
  const a = disabilityPension2026(), b = disabilityPension2026();
  b.claim.copies[0].source_document_reference = "second-disability-copy";
  b.claim.copies[0].statement_identifier = "second-disability-copy";
  b.claim.reviews[0].source_document_reference = "second-disability-copy";
  a.claim.copies.push(...b.claim.copies);
  a.claim.reviews.push(...b.claim.reviews);
  assertThrows(() => calc(a), Error, "reused");
  const d = a.claim.reviews[1].disability_income!;
  if (d.kind !== "employer_disability_pension") throw Error("fixture");
  d.payments.forEach((p) => p.record_reference += "-second");
  d.minimum_retirement_age_date = "2026-06-14";
  assertThrows(() => calc(a), Error, "plan dates disagree");
  a.filing_status = FilingStatus.MFJ;
  a.spouse_ssn = "555667777";
  a.spouse_dob = a.taxpayer_dob;
  a.claim.copies[1].recipient = "spouse";
  a.claim.copies[1].recipient_tin = a.spouse_ssn;
  d.owner_tin = a.spouse_ssn;
  assertEquals(calc(a).cents.line1h_disability_wages, 10500.75);
});

Deno.test("2026 ordinary plan disability exception preserves pension income and taxes only unclaimed payments", async () => {
  const s = disabilityWithdrawal2026(),
    c = s.claim.copies[0],
    r = s.claim.reviews[0];
  c.box7b_ira_sep_simple = false;
  c.box2a_taxable_amount = 8000;
  r.plan_type = "qualified_employer_plan";
  r.early_distribution!.payments = [
    {
      record_reference: "payment-one",
      payment_date: "2026-09-01",
      gross: 6000,
      taxable: 5000,
    },
    {
      record_reference: "payment-two",
      payment_date: "2026-07-01",
      gross: 4000,
      taxable: 3000,
    },
  ];
  assertThrows(() => calc(s), Error, "pension-versus-withdrawal");
  r.disability_income = {
    kind: "ordinary_distribution",
    record_reference: "withdrawal-classification",
    not_employer_disability_pension_verified: true,
  };
  const result = calc(s);
  assertEquals(result.cents.line5b_pension_taxable, 8000);
  assertEquals(result.cents.line1h_disability_wages, 0);
  assertEquals(result.early_owners[0].line2, 5000);
  assertEquals(result.line5_early_tax, 300);
  const g = await executeDraftSources2026(exceptionRetirementGraph2026(s));
  assertEquals(g.diagnostics, []);
  assertEquals(g.pending.f1040.line5b_pension_taxable, 8000);
  assertEquals(g.pending.schedule2.line5_form5329_early_tax, 300);
});

Deno.test("2026 disability pension assembly reports the unfinished earned-income bridge instead of dropping wages", async () => {
  const { retirement_2026 } = await import("./retirement.ts");
  assertThrows(
    () =>
      retirement_2026.compute(
        { taxYear: 2026, formType: "f1040" },
        disabilityPension2026(),
      ),
    Error,
    "earned-income credit and dependent-income source bridges",
  );
});
