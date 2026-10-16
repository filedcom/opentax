import { assert, assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  retirementCopy2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import {
  form4852IraGraph2026,
  form4852IraWithdrawals2026,
} from "./form4852-ira.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateRetirementSources2026 } from "./retirement-source.ts";
import { calculateIraBasis2026 } from "./ira-basis-source.ts";
async function calculate(g = form4852IraGraph2026()) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    r: r.pending.f1099r.calculation_2026 as ReturnType<
      typeof calculateRetirementSources2026
    >,
  };
}
Deno.test("2026 substitute IRA binds annual basis conversions and retained cash before early tax", async () => {
  const { p, r } = await calculate();
  assertEquals(p.f1040.line4a_ira_gross, 16000);
  assertEquals(p.f1040.line4b_ira_taxable, 14800);
  assertEquals(p.f1040.line25b_withheld_1099, 1000);
  assertEquals(p.schedule2.line5_form5329_early_tax, 555);
  const f = r.ira_basis!.calculation.forms[0];
  assertEquals(f.carryforward_2027?.amount, 2800);
  assertEquals(
    f.distributions[0].payments.map(
      (p) => [p.gross, p.converted, p.nonconversion],
    ),
    [[10000, 6000, 4000], [6000, 4000, 2000]],
  );
  assertEquals(r.rows[0].copy.state_information, []);
  assertEquals(
    (p.schedule_a.information_return_tax_sources as {
      state_withheld: number;
    }[]).map((s) => s.state_withheld),
    [300],
  );
});
Deno.test("2026 substitute IRA binds payment-date age exceptions to the nonconverted amounts", async () => {
  const g = form4852IraGraph2026();
  g.general.taxpayer_dob = "1966-12-01";
  const e = g.f1099r.claim.reviews[0].early_distribution!;
  delete e.no_additional_tax_exception_applies_verified;
  e.exception_review = {
    record_reference: "age-review",
    owner_tin: g.general.taxpayer_ssn,
    account_number: g.f4852.claim.records[0].kind === "1099r"
      ? g.f4852.claim.records[0].account_number
      : "",
    complete_exception_inventory_verified: true,
    no_other_payment_exception_applies_verified: true,
    claims: [{
      kind: "age59_half",
      record_reference: "actual-birth-record",
      payment_reference: "ira-payment-june",
      actual_payment_date_and_birth_record_verified: true,
    }],
  };
  const { p } = await calculate(g);
  assertEquals(p.schedule2.line5_form5329_early_tax, 370);
});
Deno.test("2026 substitute IRA rejects per-payment drift even when annual withholding totals agree", async () => {
  for (
    const field of [
      "distributed_on",
      "record_reference",
      "gross",
      "federal_withheld",
      "state",
      "locality",
      "state_withheld",
      "local_withheld",
    ] as const
  ) {
    const g = form4852IraGraph2026(),
      payments =
        g.f1099r.claim.ira_basis!.owners[0].statement_payment_ledgers![0]
          .payments;
    if (field === "distributed_on") payments[0].distributed_on = "2026-05-30";
    else if (field === "record_reference") {
      payments[0].record_reference = "unmatched-payment";
    } else if (field === "state") {
      payments[0].state_withholding![0].state = "CA";
    } else if (field === "locality") {
      payments[0].local_withholding![0].locality = "Other locality";
    } else if (field === "state_withheld" || field === "local_withheld") {
      const values = field === "state_withheld"
        ? payments.map((p) => p.state_withholding![0])
        : payments.map((p) => p.local_withholding![0]);
      values[0].withheld++;
      values[1].withheld--;
    } else {
      payments[0][field]++;
      payments[1][field]--;
    }
    const result = await executeDraftSources2026(g);
    assert(
      result.diagnostics.some((d) =>
        d.message.includes("every dated Form 4852 payment")
      ),
      field,
    );
  }
});
Deno.test("2026 substitute IRA replay rejects stale owners copies and chronology", async () => {
  const { r } = await calculate(),
    original = r.ira_basis!.calculation.source_input;
  const copy = structuredClone(original);
  copy.current_copies[0].box4_federal_withheld++;
  assertThrows(
    () => calculateIraBasis2026(copy),
    Error,
    "actual Form 4852 owners",
  );
  const date = structuredClone(original);
  date.claim.reviewed_on = "2027-03-14";
  assertThrows(
    () => calculateIraBasis2026(date),
    Error,
    "actual Form 4852 owners",
  );
  const owner = structuredClone(original);
  owner.taxpayer_ssn = "400001099";
  assertThrows(
    () => calculateIraBasis2026(owner),
    Error,
    "actual Form 4852 owners",
  );
  const detached = structuredClone(r.source_input);
  delete detached.form4852_sources_2026;
  assertThrows(() => calculateRetirementSources2026(detached));
});
Deno.test("2026 substitute IRA single-payment source retains actual state and local withholding", async () => {
  const g = form4852IraGraph2026(), owner = g.f1099r.claim.ira_basis!.owners[0];
  const first = owner.statement_payment_ledgers![0].payments[0];
  owner.distributions = [{
    source_document_reference: "ira-distribution",
    disposition_record_reference: "single-disposition",
    distributed_on: "2026-06-01",
    cash_paid_to_owner: 4700,
    no_unlisted_distribution_or_conversion: true,
    conversion: {
      ...first.conversion!,
      receipt: {
        ...first.conversion!.receipt,
        source_document_reference: "single-conversion-receipt",
        received_on: "2026-06-02",
        amount: 10000,
      },
    },
  }];
  delete owner.statement_payment_ledgers;
  g.f1099r.claim.reviews[0].early_distribution!.payments = [{
    record_reference: "single-nonconversion",
    payment_date: "2026-06-01",
    gross: 6000,
  }];
  const s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.distribution_sources = [{
    ...s.distribution_sources[0],
    distribution_reference: "single-actual-payment",
    paid_on: "2026-06-01",
    gross_distribution: 16000,
    federal_withheld: 1000,
    state_tax_withheld: 200,
    local_tax_withheld: 100,
  }];
  const { p } = await calculate(g);
  assertEquals(p.f1040.line4b_ira_taxable, 14800);
  assertEquals(p.schedule2.line5_form5329_early_tax, 555);
  s.distribution_sources[0].paid_on = "2026-06-02";
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("every dated Form 4852 payment")
    ),
  );
});
Deno.test("2026 substitute IRA uses annual basis for ordinary nonconverted withdrawals", async () => {
  const { p, r } = await calculate(form4852IraWithdrawals2026());
  assertEquals(p.f1040.line4b_ira_taxable, 14800);
  assertEquals(p.schedule2.line5_form5329_early_tax, 1480);
  assertEquals(r.ira_basis!.calculation.forms[0].distributions[0].converted, 0);
});
Deno.test("2026 substitute SIMPLE IRA shares basis and applies its evidenced two-year rate", async () => {
  const g = form4852IraWithdrawals2026(),
    o = g.f1099r.claim.ira_basis!.owners[0];
  const a = o.accounts[0], s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  a.plan_type = "simple_ira";
  a.simple_first_contribution_date = "2025-01-01";
  const r = g.f1099r.claim.reviews[0];
  r.plan_type = "simple_ira";
  r.early_distribution!.simple_first_contribution_date =
    a.simple_first_contribution_date;
  for (const row of o.contributions) {
    row.form5498.custodian_tin = o.accounts[1].custodian_tin;
    row.form5498.account_number = o.accounts[1].account_number;
    row.receipts.forEach((p) => {
      p.custodian_tin = o.accounts[1].custodian_tin;
      p.account_number = o.accounts[1].account_number;
    });
  }
  s.amounts.distribution_code = "S";
  s.distribution_sources.forEach((p) => {
    p.distribution_code = "S";
    p.account_type = "simple_ira";
  });
  const { p } = await calculate(g);
  assertEquals(p.f1040.line4b_ira_taxable, 14800);
  assertEquals(p.schedule2.line5_form5329_early_tax, 3700);
});
Deno.test("2026 joint substitute basis belongs to the actual spouse across contribution and conversion evidence", async () => {
  const g = JSON.parse(
    JSON.stringify(form4852IraGraph2026()).replaceAll("400001037", "400001045"),
  ) as ReturnType<typeof form4852IraGraph2026>;
  Object.assign(g.general, {
    taxpayer_ssn: "400001037",
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",
    spouse_last_name: "Wheat",
    spouse_ssn: "400001045",
    spouse_dob: "1980-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  const { p, r } = await calculate(g);
  assertEquals(p.f1040.line4b_ira_taxable, 14800);
  assertEquals(r.rows[0].owner_tin, "400001045");
  assertEquals(r.ira_basis!.calculation.forms[0].owner_tin, "400001045");
  assertEquals(r.early_owners[0].owner, "spouse");
});
Deno.test("2026 substitute IRA basis coexists with a separately corrected issued IRA", async () => {
  const g = form4852IraGraph2026(), o = g.f1099r.claim.ira_basis!.owners[0];
  g.general.taxpayer_dob = "1966-01-01";
  delete g.f1099r.claim.reviews[0].early_distribution;
  const current = retirementCopy2026("other-current", true),
    old = structuredClone(current);
  old.source_document_reference = "other-retired";
  old.box1_gross_distribution = old.box2a_taxable_amount = 99000;
  current.corrected = true;
  current.supersedes_document_reference = old.source_document_reference;
  g.f1099r.claim.copies = [old, current];
  const review = retirementSource2026([current]).claim.reviews[0];
  delete review.no_ira_basis_or_current_nondeductible_contributions_verified;
  review.ira_basis_owner_review_reference = o.record_reference;
  g.f1099r.claim.reviews.push(review);
  o.accounts.push({
    custodian_tin: current.payer_tin,
    account_number: current.account_number,
    plan_type: "traditional_ira",
    year_end_statement: {
      owner_tin: o.owner_tin,
      source_document_reference: "other-yearend",
      as_of: "2026-12-31",
      fair_market_value: 1000,
    },
  });
  o.distributions.push({
    source_document_reference: current.source_document_reference,
    disposition_record_reference: "other-disposition",
    distributed_on: "2026-07-01",
    cash_paid_to_owner: 11000,
    no_unlisted_distribution_or_conversion: true,
  });
  const { p, r } = await calculate(g);
  assertEquals(p.f1040.line4a_ira_gross, 28000);
  assertEquals(p.f1040.line25b_withheld_1099, 2000);
  assertEquals(
    r.ira_basis!.calculation.source_input.current_copies.map((c) =>
      c.source_document_reference
    ),
    ["other-current", "ira-distribution"],
  );
});
Deno.test("2026 substitute IRA permits retained zero-withholding jurisdiction rows without inventing tax", async () => {
  const g = form4852IraGraph2026(), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.amounts.state_tax_withheld = s.amounts.local_tax_withheld = 0;
  s.distribution_sources.forEach((p) => {
    p.state_tax_withheld = 0;
    p.local_tax_withheld = 0;
  });
  for (
    const p of g.f1099r.claim.ira_basis!.owners[0].statement_payment_ledgers![0]
      .payments
  ) {
    p.cash_paid_to_owner += p.state_withholding![0].withheld +
      p.local_withholding![0].withheld;
    p.state_withholding![0].withheld = p.local_withholding![0].withheld = 0;
  }
  const { p } = await calculate(g);
  assertEquals(p.f1040.line4b_ira_taxable, 14800);
  assertEquals(p.schedule2.line5_form5329_early_tax, 555);
  assertEquals(p.schedule_a.information_return_tax_sources ?? [], []);
});
