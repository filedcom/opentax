import { assertEquals, assertThrows } from "@std/assert";
import { calculateRetirementSources2026 } from "./retirement-source.ts";
import { retirementIraLedgerSource2026 } from "./retirement-ira-ledger.fixture.ts";
import { retirementIraSource2026 } from "./retirement-ira.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";

const parts = (s: ReturnType<typeof retirementIraLedgerSource2026>) => ({
  owner: s.claim.ira_basis!.owners[0],
  ledger: s.claim.ira_basis!.owners[0].statement_payment_ledgers![0],
  review: s.claim.reviews[0],
  copy: s.claim.copies[0],
});

Deno.test("2026 IRA dated ledger reconciles payment cash, each withholding jurisdiction and conversion receipts before annual basis", () => {
  const s = retirementIraLedgerSource2026(),
    r = calculateRetirementSources2026(s);
  const f = r.ira_basis!.calculation.forms[0];
  assertEquals(f.raw_gross, 16000);
  assertEquals(f.raw_converted, 10000);
  assertEquals(f.raw_withdrawn, 6000);
  assertEquals(
    f.distributions[0].payments.map((
      p,
    ) => [p.record_reference, p.payment_date, p.nonconversion]),
    [
      ["ira-payment-may", "2026-05-31", 4000],
      ["ira-payment-june", "2026-06-01", 2000],
    ],
  );
  assertEquals(r.lines.line4b_ira_taxable, 14800);
  assertEquals(r.lines.line25b_withheld_1099, 1000);
  assertEquals(f.carryforward_2027?.amount, 2800);
  assertEquals(r.line5_early_tax, 555);
});

Deno.test("2026 IRA ledger applies a documented levy to only its actual nonconversion payment after basis", () => {
  const s = retirementIraLedgerSource2026(),
    { review, copy } = parts(s),
    e = review.early_distribution!;
  e.no_additional_tax_exception_applies_verified = undefined;
  e.exception_review = {
    record_reference: "levy-review",
    owner_tin: s.taxpayer_ssn,
    account_number: copy.account_number,
    complete_exception_inventory_verified: true,
    no_other_payment_exception_applies_verified: true,
    claims: [{
      kind: "irs_levy",
      record_reference: "levy-document",
      payment_reference: "ira-payment-june",
      levy_date: "2026-06-01",
      amount_paid_under_levy: 2000,
      irs_levy_on_this_retirement_account_verified: true,
    }],
  };
  const r = calculateRetirementSources2026(s);
  assertEquals([
    r.early_owners[0].line1,
    r.early_owners[0].line2,
    r.early_owners[0].line3,
    r.line5_early_tax,
  ], [5550, 1850, 3700, 370]);
  assertEquals(r.early_owners[0].exception_code, "10");
});

Deno.test("2026 IRA ledger age exception follows each payment's 59-and-one-half anniversary", () => {
  const s = retirementIraLedgerSource2026(),
    { review } = parts(s),
    e = review.early_distribution!;
  s.taxpayer_dob = "1966-12-01";
  e.no_additional_tax_exception_applies_verified = undefined;
  e.exception_review = {
    record_reference: "age-review",
    owner_tin: s.taxpayer_ssn,
    account_number: s.claim.copies[0].account_number,
    complete_exception_inventory_verified: true,
    no_other_payment_exception_applies_verified: true,
    claims: [{
      kind: "age59_half",
      record_reference: "birth-and-payment-record",
      payment_reference: "ira-payment-june",
      actual_payment_date_and_birth_record_verified: true,
    }],
  };
  const r = calculateRetirementSources2026(s);
  assertEquals(r.early_owners[0].line2, 1850);
  assertEquals(r.early_owners[0].exception_code, "12");
  assertEquals(r.line5_early_tax, 370);
  e.exception_review.claims[0].payment_reference = "ira-payment-may";
  assertThrows(() => calculateRetirementSources2026(s), Error, "Age exception");
});

Deno.test("2026 IRA ledger full conversions omit early tax and reconcile multiple destination Forms 5498", () => {
  const s = retirementIraLedgerSource2026(),
    { owner, ledger, copy, review } = parts(s);
  copy.box4_federal_withheld = 0;
  copy.state_information = [];
  copy.local_information = [];
  ledger.payments.forEach((p) => {
    p.cash_paid_to_owner = p.federal_withheld = 0;
    p.state_withholding = [];
    p.local_withholding = [];
    p.conversion!.receipt.amount = p.gross;
  });
  ledger.payments[1].conversion!.receipt.account_number = "second-roth";
  owner.roth_conversion_forms5498[0].box3_conversion_amount = 10000;
  owner.roth_conversion_forms5498.push({
    ...owner.roth_conversion_forms5498[0],
    source_document_reference: "second-roth5498",
    account_number: "second-roth",
    box3_conversion_amount: 6000,
  });
  review.early_distribution = undefined;
  const r = calculateRetirementSources2026(s);
  assertEquals(r.lines.line4b_ira_taxable, 14800);
  assertEquals(r.early_owners, []);
  assertEquals(r.line5_early_tax, 0);
  owner.roth_conversion_forms5498[1].box3_conversion_amount -= .01;
  assertThrows(() => calculateRetirementSources2026(s), Error, "reconcile");
});

Deno.test("2026 IRA ledger conversion-only payments cannot be reused as early-tax exception claims", () => {
  const s = retirementIraLedgerSource2026(),
    { ledger, copy, review } = parts(s);
  const first = ledger.payments[0];
  first.gross = first.conversion!.receipt.amount;
  first.cash_paid_to_owner = first.federal_withheld = 0;
  first.state_withholding = [];
  first.local_withholding = [];
  copy.box1_gross_distribution = copy.box2a_taxable_amount = 12000;
  copy.box4_federal_withheld = 400;
  copy.state_information![0].box14_state_withheld = 75;
  copy.local_information![0].box17_local_withheld = 40;
  review.early_distribution!.payments.shift();
  const r = calculateRetirementSources2026(s);
  assertEquals(r.ira_basis!.calculation.forms[0].raw_withdrawn, 2000);
  // 3000 / (24000+2000+10000) = .083: only the 2000 cash/withholding payment participates.
  assertEquals(r.early_owners[0].line1, 1834);
  assertEquals(r.line5_early_tax, 183);
  review.early_distribution!.payments[0].record_reference =
    first.record_reference;
  assertThrows(() => calculateRetirementSources2026(s), Error, "actual dated");
});

Deno.test("2026 IRA ledger aggregates cents before annual distribution, conversion and withholding rounding", () => {
  const s = retirementIraLedgerSource2026(), { ledger, copy, owner } = parts(s);
  ledger.payments.forEach((p) => {
    p.gross += .25;
    p.conversion!.receipt.amount += .25;
    p.federal_withheld += .25;
    p.cash_paid_to_owner -= .25;
  });
  copy.box1_gross_distribution = copy.box2a_taxable_amount = 16000.50;
  copy.box4_federal_withheld = 1000.50;
  owner.roth_conversion_forms5498[0].box3_conversion_amount = 10000.50;
  const r = calculateRetirementSources2026(s);
  assertEquals(r.lines.line4a_ira_gross, 16001);
  assertEquals(r.lines.line4b_ira_taxable, 14801);
  assertEquals(r.lines.line25b_withheld_1099, 1001);
  assertEquals(r.early_owners[0].line1, 5550);
});

Deno.test("2026 IRA ledger rejects omitted, duplicate, substituted and unreconciled payment facts", () => {
  const changes:
    ((s: ReturnType<typeof retirementIraLedgerSource2026>) => void)[] = [
      (s) => parts(s).ledger.payments.pop(),
      (s) =>
        parts(s).ledger.payments[1].record_reference =
          parts(s).ledger.payments[0].record_reference,
      (s) => parts(s).ledger.payments[0].federal_withheld += 1,
      (s) => parts(s).ledger.payments[0].state_withholding![0].withheld += 1,
      (s) => parts(s).ledger.payments[0].state_withholding![0].state = "CA",
      (s) =>
        parts(s).ledger.payments[0].local_withholding![0].locality =
          "Other locality",
      (s) =>
        parts(s).ledger.payments[0].local_withholding!.push({
          locality: "Test locality",
          withheld: 0,
        }),
      (s) => parts(s).ledger.payments[0].gross += .01,
      (s) => parts(s).ledger.payments[0].cash_paid_to_owner += .01,
      (s) => parts(s).ledger.payments[0].cash_paid_to_owner = 3215.001,
      (s) => parts(s).ledger.payments[0].distributed_on = "2025-12-31",
      (s) => parts(s).copy.box13_payment_date = "2026-06-01",
      (s) =>
        parts(s).ledger.payments[0].conversion!.receipt.received_on =
          "2026-05-30",
      (s) =>
        parts(s).ledger.payments[0].conversion!.receipt.owner_tin = "999887777",
      (s) =>
        parts(s).ledger.payments[0].conversion!.receipt
          .source_document_reference =
            parts(s).ledger.payments[1].conversion!.receipt
              .source_document_reference,
      (s) =>
        parts(s).owner.distributions.push(
          retirementIraSource2026().claim.ira_basis!.owners[0].distributions[0],
        ),
      (s) => parts(s).review.early_distribution!.payments.pop(),
      (s) =>
        parts(s).review.early_distribution!.payments[0].record_reference =
          "invented-payment",
      (s) =>
        parts(s).review.early_distribution!.payments[0].payment_date =
          "2026-06-01",
      (s) => parts(s).review.early_distribution!.payments[0].taxable = 3700,
    ];
  for (const change of changes) {
    const s = retirementIraLedgerSource2026();
    change(s);
    assertThrows(() => calculateRetirementSources2026(s));
  }
});

Deno.test("2026 IRA ledger normal code requires every actual payment to follow the age anniversary", () => {
  const s = retirementIraLedgerSource2026(),
    { copy, review, ledger } = parts(s);
  s.taxpayer_dob = "1966-12-01";
  copy.box7a_distribution_codes = [Code.Code7];
  review.early_distribution = undefined;
  assertThrows(
    () => calculateRetirementSources2026(s),
    Error,
    "payment-date age",
  );
  ledger.payments[0].distributed_on = "2026-06-01";
  assertEquals(calculateRetirementSources2026(s).line5_early_tax, 0);
});

Deno.test("2026 SIMPLE ledger requires separate correctly coded statements across the two-year anniversary", () => {
  const s = retirementIraLedgerSource2026(),
    { owner, ledger, copy, review } = parts(s);
  owner.contributions = [];
  owner.nondeductible_election = undefined;
  owner.roth_conversion_forms5498 = [];
  owner.accounts[0].plan_type = review.plan_type = "simple_ira";
  owner.accounts[0].simple_first_contribution_date =
    review.early_distribution!
      .simple_first_contribution_date =
      "2024-06-01";
  ledger.payments.forEach((p, i) => {
    p.cash_paid_to_owner += p.conversion!.receipt.amount;
    p.conversion = undefined;
    review.early_distribution!.payments[i].gross = p.gross;
  });
  copy.box7a_distribution_codes = [Code.CodeS];
  assertThrows(() => calculateRetirementSources2026(s), Error, "two-year");
  const secondCopy = structuredClone(copy),
    secondLedger = structuredClone(ledger),
    secondReview = structuredClone(review);
  const secondPayment = ledger.payments.pop()!;
  secondCopy.source_document_reference =
    secondCopy.statement_identifier =
      "simple-after-anniversary";
  secondCopy.box7a_distribution_codes = [Code.Code1];
  secondCopy.box1_gross_distribution = secondCopy.box2a_taxable_amount = 6000;
  secondCopy.box4_federal_withheld = 400;
  secondCopy.state_information![0].box14_state_withheld = 75;
  secondCopy.local_information![0].box17_local_withheld = 40;
  copy.box1_gross_distribution = copy.box2a_taxable_amount = 10000;
  copy.box4_federal_withheld = 600;
  copy.state_information![0].box14_state_withheld = 125;
  copy.local_information![0].box17_local_withheld = 60;
  secondLedger.source_document_reference = secondCopy.source_document_reference;
  secondLedger.record_reference = "simple-after-ledger";
  secondLedger.payments = [secondPayment];
  secondReview.source_document_reference = secondCopy.source_document_reference;
  secondReview.early_distribution!.payments = [
    review.early_distribution!.payments.pop()!,
  ];
  s.claim.copies.push(secondCopy);
  s.claim.reviews.push(secondReview);
  owner.statement_payment_ledgers!.push(secondLedger);
  const r = calculateRetirementSources2026(s);
  assertEquals(r.lines.line4b_ira_taxable, 15200);
  assertEquals(r.early_owners[0].simple_taxable_cents, 9500);
  assertEquals(r.line5_early_tax, 2945);
});
