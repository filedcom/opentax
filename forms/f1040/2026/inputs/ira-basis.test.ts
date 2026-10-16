import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateIraBasis2026,
  type IraBasisSource2026,
} from "./ira-basis-source.ts";
import { iraBasisFixture2026 } from "./ira-basis.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { traditionalIraBasisAmounts } from "../../nodes/intermediate/forms/income/retirement/form8606/traditional-amounts.ts";

Deno.test("2026 IRA annual basis combines accounts, keeps post-year contributions out of current distribution basis and separates conversion withholding", () => {
  const r = calculateIraBasis2026(iraBasisFixture2026()).forms[0];
  assertEquals(r.partI, {
    line1: 2000,
    line2: 2000,
    line3: 4000,
    line4: 1000,
    line5: 3000,
    line6: 24000,
    line7: 6000,
    line8: 10000,
    line9: 40000,
    line10: .075,
    line11: 750,
    line12: 450,
    line13: 1200,
    line14: 2800,
    line15a: 5550,
    line15b: 0,
    line15c: 5550,
  });
  assertEquals(r.partII, { line16: 10000, line17: 750, line18: 9250 });
  assertEquals(r.taxable_ira_income, 14800);
  assertEquals(r.carryforward_2027?.amount, 2800);
  assertEquals(r.raw_gross, 16000);
  assertEquals(r.requires_form8606, true);
});
Deno.test("2026 IRA no-distribution contributions carry full basis without inventing distribution lines", () => {
  const f = iraBasisFixture2026(), o = f.claim.owners[0];
  f.current_copies = [];
  o.distributions = [];
  o.roth_conversion_forms5498 = [];
  const r = calculateIraBasis2026(f).forms[0];
  assertEquals(r.partI, {
    line1: 2000,
    line2: 2000,
    line3: 4000,
    line14: 4000,
  });
  assertEquals(r.partII, undefined);
  assertEquals(r.taxable_ira_income, 0);
  o.contributions = [];
  o.nondeductible_election = undefined;
  const priorOnly = calculateIraBasis2026(f).forms[0];
  assertEquals(priorOnly.requires_form8606, false);
  assertEquals(priorOnly.carryforward_2027?.amount, 2000);
});
Deno.test("2026 IRA distribution-only and zero-basis workpapers preserve actual taxable income", () => {
  const f = iraBasisFixture2026(), o = f.claim.owners[0];
  o.distributions[0].conversion = undefined;
  o.distributions[0].cash_paid_to_owner = 15000;
  o.roth_conversion_forms5498 = [];
  const r = calculateIraBasis2026(f).forms[0];
  assertEquals(r.partI?.line12, 1200);
  assertEquals(r.taxable_ira_income, 14800);
  assertEquals(r.partII, undefined);
  o.contributions = [];
  o.nondeductible_election = undefined;
  o.prior_basis = {
    kind: "none",
    record_reference: "no-basis-history",
    no_prior_nondeductible_basis_verified: true,
  };
  const zero = calculateIraBasis2026(f).forms[0];
  assertEquals(zero.requires_form8606, false);
  assertEquals(zero.taxable_ira_income, 16000);
});
Deno.test("2026 IRA full conversion uses Part II basis and retains a negative filed line 18 without negative taxable income", () => {
  const f = iraBasisFixture2026(), o = f.claim.owners[0];
  o.contributions = [];
  o.nondeductible_election = undefined;
  o.accounts.forEach((a) => a.year_end_statement.fair_market_value = 0);
  if (o.prior_basis.kind !== "filed_form8606") throw Error("fixture");
  o.prior_basis.line14 = 18000;
  f.current_copies[0].box4_federal_withheld = 0;
  o.distributions[0].cash_paid_to_owner = 0;
  o.distributions[0].conversion!.receipt.amount = 16000;
  o.roth_conversion_forms5498[0].box3_conversion_amount = 16000;
  const r = calculateIraBasis2026(f).forms[0];
  assertEquals(r.partI, undefined);
  assertEquals(r.partII, { line16: 16000, line17: 18000, line18: -2000 });
  assertEquals(r.taxable_ira_income, 0);
  assertEquals(r.carryforward_2027, undefined);
});
Deno.test("2026 IRA joint owners use independent basis and complete account inventories", () => {
  const f = iraBasisFixture2026();
  f.filing_status = FilingStatus.MFJ;
  f.spouse_ssn = "555667777";
  f.spouse_dob = "1966-01-01";
  const second = JSON.parse(
    JSON.stringify(f).replaceAll("400001037", "555667777").replaceAll(
      '"source_document_reference":"',
      '"source_document_reference":"spouse-',
    ),
  ) as IraBasisSource2026;
  second.current_copies[0].recipient = "spouse";
  second.claim.owners[0].distributions[0].disposition_record_reference =
    "spouse-disposition";
  f.current_copies.push(second.current_copies[0]);
  f.claim.owners.push(second.claim.owners[0]);
  const basis = f.claim.owners[1].prior_basis;
  if (basis.kind !== "filed_form8606") throw Error("fixture");
  basis.line14 = 6000;
  const r = calculateIraBasis2026(f).forms;
  assertEquals(r.map((r) => r.taxable_ira_income), [14800, 13200]);
  assertEquals(r.map((r) => r.carryforward_2027?.amount), [2800, 5200]);
});
Deno.test("2026 IRA source cents aggregate before rounding contribution and account totals", () => {
  const f = iraBasisFixture2026(), o = f.claim.owners[0];
  o.contributions[0].receipts.forEach((r) => r.amount = 1000.25);
  o.contributions[0].form5498.box1_ira_contributions = 2000.50;
  o.accounts.forEach((a) => a.year_end_statement.fair_market_value = 12000.25);
  const r = calculateIraBasis2026(f).forms[0];
  assertEquals(r.partI?.line1, 2001);
  assertEquals(r.partI?.line4, 1000);
  assertEquals(r.partI?.line6, 24001);
});
Deno.test("shared IRA filed ratio increases precision instead of spending more basis than exists", () => {
  const r = traditionalIraBasisAmounts({
    contribution: 1,
    priorBasis: 0,
    postYearContribution: 0,
    yearEndValue: 0,
    distributions: 500,
    conversions: 1000,
  });
  assertEquals(r.ratio, .0007);
  assertEquals(r.nontaxableConversion, 1);
  assertEquals(r.nontaxableDistribution, 0);
  assertEquals(r.remainingBasis, 0);
  assertThrows(() =>
    traditionalIraBasisAmounts({
      contribution: 0,
      priorBasis: 0,
      postYearContribution: 1,
      yearEndValue: 0,
      distributions: 0,
      conversions: 0,
    })
  );
});
Deno.test("2026 IRA basis rejects missing, duplicate, wrong-owner and unsupported source facts", () => {
  const changes: ((f: IraBasisSource2026) => void)[] = [
    (f) => f.claim.reviewed_on = "2026-12-31",
    (f) => f.claim.owners[0].accounts.shift(),
    (f) =>
      f.claim.owners[0].accounts.push(
        structuredClone(f.claim.owners[0].accounts[0]),
      ),
    (f) =>
      f.claim.owners[0].accounts[0].year_end_statement.owner_tin = "999887777",
    (f) => f.claim.owners[0].distributions[0].cash_paid_to_owner += 1,
    (f) => f.claim.owners[0].contributions[0].receipts[0].amount += 1,
    (f) =>
      f.claim.owners[0].contributions[0].receipts[1].received_on = "2027-04-16",
    (f) =>
      f.claim.owners[0].contributions[0].receipts[1].account_number = "wrong",
    (f) => f.claim.owners[0].nondeductible_election = undefined,
    (f) =>
      f.claim.owners[0].nondeductible_election!.own_eligible_compensation =
        1999,
    (f) => f.claim.owners[0].roth_conversion_forms5498 = [],
    (f) =>
      f.claim.owners[0].roth_conversion_forms5498[0].box3_conversion_amount +=
        1,
    (f) =>
      f.claim.owners[0].distributions[0].conversion!.receipt.received_on =
        "2027-01-01",
    (f) =>
      f.claim.owners[0].distributions[0].source_document_reference = "missing",
    (f) => f.current_copies[0].recipient_tin = "999887777",
    (f) =>
      f.current_copies[0].box7a_distribution_codes = [DistributionCode.Code4],
    (f) => f.current_copies.push(structuredClone(f.current_copies[0])),
    (f) => f.claim.owners.push(structuredClone(f.claim.owners[0])),
  ];
  // A missing unrelated zero-balance account cannot be inferred; completeness
  // is an evidence assertion. Removing the account used by the copy is detectable.
  for (const change of changes) {
    const f = iraBasisFixture2026();
    change(f);
    assertThrows(() => calculateIraBasis2026(f));
  }
});
Deno.test("2026 IRA regular-contribution cap uses the indexed age limit and exact cents", () => {
  const f = iraBasisFixture2026(), o = f.claim.owners[0];
  o.contributions[0].receipts[0].amount = 7600;
  o.contributions[0].receipts[1].amount = 1000;
  o.contributions[0].form5498.box1_ira_contributions = 8600;
  assertEquals(calculateIraBasis2026(f).forms[0].partI?.line1, 8600);
  f.taxpayer_dob = "1980-01-01";
  assertThrows(() => calculateIraBasis2026(f), Error, "2026 age");
  f.taxpayer_dob = "1966-01-01";
  o.contributions[0].receipts[0].amount += .01;
  o.contributions[0].form5498.box1_ira_contributions += .01;
  assertThrows(() => calculateIraBasis2026(f), Error, "2026 age");
});
Deno.test("2026 SIMPLE conversion requires documented two-year participation", () => {
  const f = iraBasisFixture2026(), o = f.claim.owners[0];
  o.contributions = [];
  o.nondeductible_election = undefined;
  o.accounts[0].plan_type = "simple_ira";
  o.accounts[0].simple_first_contribution_date = "2024-06-01";
  assertEquals(calculateIraBasis2026(f).forms[0].partII?.line16, 10000);
  o.accounts[0].simple_first_contribution_date = "2024-06-02";
  assertThrows(() => calculateIraBasis2026(f), Error, "two-year");
});
