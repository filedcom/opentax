import { syntheticForm8919_2026 } from "./form8919.fixture.ts";
import { syntheticVehicleLoan2026 } from "./vehicle-loan.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  businessGraphFixture2026,
  businessQbiFixture2026,
  jointBusinessGraphFixture2026,
} from "./business-qbi.fixture.ts";
import {
  businessQbiCalculator2026,
  resolveBusinessQbi2026,
} from "./business-qbi.ts";
import { business, payment, vehicle, wage } from "./business.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";

const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
Deno.test("2026 business source graph derives income, SE and active QBI through settlement", () => {
  const r = run(businessGraphFixture2026());
  assertEquals(r.diagnostics, []);
  const p = r.pending;
  assertEquals(p.schedule1.line3_schedule_c, 10000);
  assertEquals(p.schedule1.line15_se_deduction, 707);
  assertEquals(p.schedule2.line4_self_employment_tax, 1413);
  assertEquals(p.f1040.line11b_agi, 9293);
  assertEquals(p.f1040.line13b_qbi, 400);
  assertEquals(p.f1040.line15_taxable_income, 0);
  assertEquals(p.f1040.line23_other_taxes, 1413);
  assertEquals(p.f1040.line37_amount_owed, 1413);
});
Deno.test("2026 QBI uses source-qualified net income after own SE deduction, with capital-gain limits", () => {
  const f = businessQbiFixture2026();
  const r = resolveBusinessQbi2026(f);
  assertEquals(r.rows[0].allocated_se_deduction, 707);
  assertEquals(r.qbi, 9293);
  const qbi = businessQbiCalculator2026(f, 10000);
  assertEquals(qbi.evaluate(15000).deduction, 1000);
  assertEquals(qbi.evaluate(20000).deduction, 1859);
  assertEquals(qbi.evaluate(0).deduction, 400);
});
Deno.test("Active QBI minimum has a source-derived $1,000 boundary", () => {
  const f = businessQbiFixture2026();
  f.businesses[0].kind = "statutory_employee";
  f.businesses[0].receipts = [];
  f.w2s = [{
    ...wage("123456789", 999),
    box13_statutory_employee: true,
    schedule_c_business_reference: "consulting",
  }];
  assertEquals(businessQbiCalculator2026(f, 0).evaluate(0).deduction, 0);
  f.w2s[0].box1_wages = 1000;
  assertEquals(businessQbiCalculator2026(f, 0).evaluate(0).deduction, 400);
});
Deno.test("QBI owner allocations exclude statutory income and keep spouse deductions separate", () => {
  const f = businessQbiFixture2026();
  f.filing_status = FilingStatus.MFJ;
  f.spouse_tin = "987654321";
  const spouse = business("spouse", f.spouse_tin);
  spouse.receipts[0].amount = 20000;
  const statutory = business("statutory");
  statutory.kind = "statutory_employee";
  statutory.receipts = [];
  f.businesses.push(spouse, statutory);
  f.w2s = [{
    ...wage("123456789", 184500),
    box13_statutory_employee: true,
    schedule_c_business_reference: "statutory",
  }];
  f.qbi_review.businesses = f.businesses.map((b) => ({
    ...f.qbi_review.businesses[0],
    business_reference: b.business_reference,
  }));
  const r = resolveBusinessQbi2026(f);
  assertEquals(r.rows.map((b) => b.allocated_se_deduction), [134, 1413, 0]);
  assertEquals(r.qbi, 212953);
});
Deno.test("2025 Form 8995 losses offset business and REIT separately; current active income retains minimum", () => {
  const f = businessQbiFixture2026();
  f.qbi_review.prior_losses = {
    kind: "form8995_2025",
    tax_year: 2025,
    return_reference: "filed-2025",
    taxpayer_tin: "123456789",
    filing_status: FilingStatus.Single,
    ownership_and_filing_unit_unchanged: true,
    line16_business_loss_carryforward: 12000,
    line17_reit_ptp_loss_carryforward: 3000,
  };
  const e = businessQbiCalculator2026(f, 0).evaluate(50000);
  const form = e.forms.form8995 as { lines: Record<string, number> };
  assertEquals(e.deduction, 400);
  assertEquals(form.lines.line18, 2707);
  assertEquals(form.lines.line19, 3000);
  f.qbi_review.prior_losses.taxpayer_tin = "987654321";
  assertThrows(
    () => businessQbiCalculator2026(f, 0),
    Error,
    "unchanged ownership",
  );
});
Deno.test("Current business losses net for QBI but never turn into a positive minimum", () => {
  const f = businessQbiFixture2026();
  f.businesses[0].expenses = [{
    ...payment("loss", 11000),
    category: "advertising",
  }];
  const e = businessQbiCalculator2026(f, 0).evaluate(30000);
  const form = e.forms.form8995 as { lines: Record<string, number> };
  assertEquals(e.deduction, 0);
  assertEquals(form.lines.line18, 1000);
});
Deno.test("Simplified QBI respects the distinct 2026 MFS threshold and rejects unsupported evidence", () => {
  const f = businessQbiFixture2026();
  assert(businessQbiCalculator2026(f, 0).evaluate(201750));
  assertThrows(
    () => businessQbiCalculator2026(f, 0).evaluate(201751),
    Error,
    "8995-A",
  );
  f.filing_status = FilingStatus.MFS;
  assert(businessQbiCalculator2026(f, 0).evaluate(201775));
  assertThrows(
    () => businessQbiCalculator2026(f, 0).evaluate(201776),
    Error,
    "8995-A",
  );
  f.qbi_review.businesses = [];
  assertThrows(() => businessQbiCalculator2026(f, 0));
});
Deno.test("Business graph rejects unmatched statutory wages and never accepts calculated QBI totals", () => {
  const f = businessGraphFixture2026();
  assert(
    run({
      ...f,
      schedule_c: { claim: { ...f.schedule_c.claim, qbi_deduction: 999 } },
    }).diagnostics.length > 0,
  );
  const missing = {
    general: f.general,
    w2s: [{
      ...wage(),
      box13_statutory_employee: true,
      schedule_c_business_reference: "consulting",
    }],
  };
  assert(run(missing).diagnostics.some((d) => d.nodeType === "schedule_c"));
});

Deno.test("Joint business graph preserves separate SE owners and adds Medicare on combined earnings", () => {
  const f = jointBusinessGraphFixture2026();
  f.schedule_c.claim.businesses.forEach((b) => {
    b.receipts[0].amount = 15000;
  });
  const r = run(f);
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.schedule_se, undefined);
  const se = r.pending.form8959.schedule_se_medicare_sources_2026 as {
    employee_ssn: string;
    amount: number;
  }[];
  assertEquals(se.length, 2);
  assertEquals(se.map((s) => s.employee_ssn), ["123456789", "987654321"]);
  // $184,500 wages leave $65,500 of the joint $250,000 threshold for SE.
  const tax = Math.round(
    Math.max(0, se.reduce((n, s) => n + s.amount, 0) - 65500) * .009,
  );
  assert(tax > 0);
  assertEquals(r.pending.schedule2.line11_medicare_self_employment_tax, tax);
});

Deno.test("Actual Form 8919 wages stop unsupported business wage-base reconciliation", () => {
  const f = businessGraphFixture2026();
  f.w2s = [wage()];
  const source = syntheticForm8919_2026();
  const forms = source.forms!;
  const record = forms[0].employers[0].income_records[0];
  if (record.kind !== "1099nec") throw new Error("fixture");
  record.recipient_ssn = "123456789";
  const r = run({
    ...f,
    form8919: {
      tax_year: 2026,
      evidence_review_date: source.evidence_review_date,
      forms,
    },
  });
  assert(
    r.diagnostics.some((d) =>
      d.nodeType === "schedule_c" && d.message.includes("reconciliation")
    ),
    JSON.stringify(r.diagnostics),
  );
});

Deno.test("A vehicle in both business and Schedule 1-A sources requires actual interest reconciliation", () => {
  const f = businessGraphFixture2026();
  const v = vehicle();
  f.schedule_c.claim.businesses[0].vehicle = v;
  const loan = syntheticVehicleLoan2026();
  loan.vin = v.vin;
  loan.original.borrower_ssns = ["123456789"];
  loan.original.statements[0].reported_vin = v.vin;
  loan.original.statements[0].payments[0].credited_to_borrower_ssn =
    "123456789";
  const r = run({ ...f, vehicle_loans: [loan] });
  assert(
    r.diagnostics.some((d) =>
      d.nodeType === "vehicle_loan_interest" &&
      d.message.includes("reconciliation")
    ),
    JSON.stringify(r.diagnostics),
  );
});

Deno.test("MFS business QBI uses the taxpayer's filing unit despite a spouse header identity", () => {
  const f = businessGraphFixture2026();
  const r = run({
    ...f,
    general: {
      ...f.general,
      filing_status: FilingStatus.MFS,
      spouse_ssn: "987654321",
      spouse_first_name: "Synthetic",
      spouse_last_name: "Spouse",
      mfs_spouse_itemizing: false,
    },
  });
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line13b_qbi, 400);
});
