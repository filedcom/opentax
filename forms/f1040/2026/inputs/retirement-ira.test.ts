import { assertEquals, assertThrows } from "@std/assert";
import { calculateRetirementSources2026 } from "./retirement-source.ts";
import { retirementIraSource2026 } from "./retirement-ira.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 retirement annual IRA owner supplies taxable income, gross, withholding and carryforward once", () => {
  const r = calculateRetirementSources2026(retirementIraSource2026());
  assertEquals(r.filed_lines, {
    line4b_ira_taxable: 14800,
    line4a_ira_gross: 16000,
  });
  assertEquals(r.cents.line25b_withheld_1099, 1000);
  assertEquals(
    r.ira_basis?.calculation.forms[0].carryforward_2027?.amount,
    2800,
  );
  assertEquals(r.rows[0].taxable, undefined);
  assertEquals(r.rows[0].calculated.iraFields.line4b_ira_taxable, undefined);
  assertEquals(r.early_owners, []);
});

Deno.test("2026 IRA partial conversion excludes converted income but includes retained withholding in early tax", () => {
  const r = calculateRetirementSources2026(retirementIraSource2026(true));
  assertEquals(r.lines.line4b_ira_taxable, 14800);
  assertEquals(r.early_owners[0].line1, 5550);
  assertEquals(r.early_owners[0].line2, 0);
  assertEquals(r.early_owners[0].line4, 555);
  assertEquals(r.early_owners[0].file_form5329, true);
  assertEquals(r.line5_early_tax, 555);
});

Deno.test("2026 IRA full conversion needs no early-payment ledger and owes no early tax", () => {
  for (const code of [Code.Code1, Code.Code2]) {
    const s = retirementIraSource2026(true), o = s.claim.ira_basis!.owners[0];
    s.claim.copies[0].box7a_distribution_codes = [code];
    s.claim.copies[0].box4_federal_withheld = 0;
    s.claim.reviews[0].early_distribution = undefined;
    o.distributions[0].cash_paid_to_owner = 0;
    o.distributions[0].conversion!.receipt.amount = 16000;
    o.roth_conversion_forms5498[0].box3_conversion_amount = 16000;
    const r = calculateRetirementSources2026(s);
    assertEquals(r.lines.line4b_ira_taxable, 14800);
    assertEquals(r.early_owners, []);
    assertEquals(r.line5_early_tax, 0);
  }
});

Deno.test("2026 IRA ordinary early withdrawal and SIMPLE first-two-year tax use basis-adjusted amounts", () => {
  for (const simple of [false, true]) {
    const s = retirementIraSource2026(true), o = s.claim.ira_basis!.owners[0];
    s.claim.copies[0].box7a_distribution_codes = [
      simple ? Code.CodeS : Code.Code1,
    ];
    const r = s.claim.reviews[0];
    r.plan_type = simple ? "simple_ira" : "traditional_ira";
    o.contributions = [];
    o.nondeductible_election = undefined;
    o.accounts[0].plan_type = r.plan_type;
    if (simple) {
      o.accounts[0].simple_first_contribution_date = "2025-01-01";
      r.early_distribution!.simple_first_contribution_date = "2025-01-01";
    }
    o.distributions[0].conversion = undefined;
    o.distributions[0].cash_paid_to_owner = 15000;
    o.roth_conversion_forms5498 = [];
    r.early_distribution!.payments[0].gross = 16000;
    const result = calculateRetirementSources2026(s);
    assertEquals(result.early_owners[0].line1, 15200);
    assertEquals(result.line5_early_tax, simple ? 3800 : 1520);
  }
});

Deno.test("2026 IRA payment-bound exception exempts only the basis-adjusted nonconversion portion", () => {
  const s = retirementIraSource2026(true),
    e = s.claim.reviews[0].early_distribution!;
  e.no_additional_tax_exception_applies_verified = undefined;
  e.exception_review = {
    record_reference: "levy-review",
    owner_tin: s.taxpayer_ssn,
    account_number: s.claim.copies[0].account_number,
    complete_exception_inventory_verified: true,
    no_other_payment_exception_applies_verified: true,
    claims: [{
      kind: "irs_levy",
      record_reference: "levy",
      payment_reference: e.payments[0].record_reference,
      levy_date: "2026-05-01",
      amount_paid_under_levy: 6000,
      irs_levy_on_this_retirement_account_verified: true,
    }],
  };
  const r = calculateRetirementSources2026(s);
  assertEquals(r.early_owners[0].line1, 5550);
  assertEquals(r.early_owners[0].line2, 5550);
  assertEquals(r.early_owners[0].exception_code, "10");
  assertEquals(r.line5_early_tax, 0);
  assertEquals(r.rows[0].exemptions[0].taxable, undefined);
  assertEquals(r.rows[0].exemptions[0].ira_amount_before_basis, 6000);
});

Deno.test("2026 IRA basis uses only corrected current copies while retaining replacement provenance", () => {
  const s = retirementIraSource2026();
  const old = structuredClone(s.claim.copies[0]);
  old.source_document_reference = "superseded-ira";
  old.box1_gross_distribution = 99999;
  old.box2a_taxable_amount = 99999;
  old.box4_federal_withheld = 3000;
  s.claim.copies[0].corrected = true;
  s.claim.copies[0].supersedes_document_reference =
    old.source_document_reference;
  s.claim.copies.push(old);
  const r = calculateRetirementSources2026(s);
  assertEquals(r.excluded_document_references, ["superseded-ira"]);
  assertEquals(r.lines.line4b_ira_taxable, 14800);
  assertEquals(r.lines.line25b_withheld_1099, 1000);
  s.claim.ira_basis!.owners[0].distributions[0].source_document_reference =
    old.source_document_reference;
  assertThrows(() => calculateRetirementSources2026(s));
});

Deno.test("2026 IRA contribution-only retirement inventory carries basis without inventing income or withholding", () => {
  const s = retirementIraSource2026(), o = s.claim.ira_basis!.owners[0];
  s.claim.copies = [];
  s.claim.reviews = [];
  o.distributions = [];
  o.roth_conversion_forms5498 = [];
  const r = calculateRetirementSources2026(s);
  assertEquals(r.filed_lines, {});
  assertEquals(
    r.ira_basis?.calculation.forms[0].carryforward_2027?.amount,
    4000,
  );
  assertEquals(r.cents.line25b_withheld_1099, 0);
  s.claim.ira_basis = undefined;
  assertThrows(() => calculateRetirementSources2026(s));
});

Deno.test("2026 IRA annual owner must include all current accounts, with consistent dated treatment evidence", () => {
  const changes: ((s: ReturnType<typeof retirementIraSource2026>) => void)[] = [
    (s) => s.claim.reviews[0].ira_basis_owner_review_reference = "other-owner",
    (s) =>
      s.claim.reviews[0]
        .no_ira_basis_or_current_nondeductible_contributions_verified = true,
    (s) =>
      s.claim.reviews[0]
        .no_roth_ira_or_designated_roth_distribution_or_ira_conversion_verified =
          true,
    (s) => s.claim.reviews[0].early_distribution!.payments[0].taxable = 5550,
    (s) =>
      s.claim.reviews[0].early_distribution!.payments[0].payment_date =
        "2026-06-02",
    (s) => s.claim.reviews[0].early_distribution!.payments[0].gross = 5000,
    (s) => s.claim.reviews[0].early_distribution = undefined,
    (s) => s.claim.ira_basis!.reviewed_on = "2027-06-01",
    (s) => {
      const extra = retirementCopy2026("missing-account", true);
      s.claim.copies.push(extra);
      s.claim.reviews.push(retirementSource2026([extra]).claim.reviews[0]);
    },
  ];
  for (const change of changes) {
    const s = retirementIraSource2026(true);
    change(s);
    assertThrows(() => calculateRetirementSources2026(s));
  }
});

Deno.test("2026 IRA spouse basis never shelters taxpayer pension early tax", () => {
  const s = retirementIraSource2026(true);
  const spouse = "555667777";
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = spouse;
  s.spouse_dob = s.taxpayer_dob;
  s.claim.ira_basis = JSON.parse(
    JSON.stringify(s.claim.ira_basis).replaceAll(s.taxpayer_ssn, spouse),
  );
  s.claim.copies[0].recipient = "spouse";
  s.claim.copies[0].recipient_tin = spouse;
  s.wage_sources![0].employee_ssn = spouse;
  const pension = retirementCopy2026("taxpayer-early-pension");
  pension.box7a_distribution_codes = [Code.Code1];
  pension.box1_gross_distribution = 1000;
  pension.box2a_taxable_amount = 800;
  pension.box4_federal_withheld = 0;
  const review = retirementSource2026([pension]).claim.reviews[0];
  review.early_distribution = {
    record_reference: "pension-review",
    complete_payment_inventory_verified: true,
    no_additional_tax_exception_applies_verified: true,
    payments: [{
      record_reference: "pension-payment",
      payment_date: "2026-01-01",
      gross: 1000,
      taxable: 800,
    }],
  };
  s.claim.copies.push(pension);
  s.claim.reviews.push(review);
  const r = calculateRetirementSources2026(s);
  assertEquals(r.early_owners.map((o) => [o.owner, o.line1, o.line4]), [[
    "taxpayer",
    800,
    80,
  ], ["spouse", 5550, 555]]);
  assertEquals(r.line5_early_tax, 635);
});
