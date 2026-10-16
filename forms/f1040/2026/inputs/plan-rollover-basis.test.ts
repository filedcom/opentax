import { assert, assertEquals, assertThrows } from "@std/assert";
import { planRolloverBasisGraph2026 as fixture } from "./plan-rollover-basis.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateRetirementSources2026 as calculate } from "./retirement-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { bindIraBasis2026 } from "./ira-basis-binding.ts";
import { hsaIraBasis2026 } from "./hsa-ira-basis.fixture.ts";

async function run(g = fixture()) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    r: r.pending.f1099r.calculation_2026 as ReturnType<typeof calculate>,
  };
}
Deno.test("2026 joint plan basis follows the spouse through the receiving IRA and Form 8606", async () => {
  const g = fixture(),
    id = "400001045",
    o = g.f1099r!.claim.ira_basis!.owners[0];
  Object.assign(g.general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",
    spouse_last_name: "Wheat",
    spouse_ssn: id,
    spouse_dob: "1980-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  const s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.owner_tin = id;
  s.distribution_sources.forEach((p) => p.owner_ssn = id);
  g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments.forEach((p) =>
    p.destinations.forEach((d) => d.owner_tin = id)
  );
  Object.assign(g.f1099r!.claim.copies[0], {
    recipient: "spouse",
    recipient_name: "Alex Wheat",
    recipient_tin: id,
  });
  o.owner_tin = id;
  if (o.prior_basis.kind !== "filed_form8606") throw Error();
  o.prior_basis.owner_tin = id;
  o.accounts[0].year_end_statement.owner_tin = id;
  const { r } = await run(g), f = r.ira_basis!.calculation.forms[0];
  assertEquals(f.owner_tin, id);
  assertEquals(f.partI?.line15c, 9000);
  assertEquals(r.plan_transfers!.basis_records[0].owner_tin, id);
});
Deno.test("2026 receiving SIMPLE account must complete its two-year period before the plan receipt", async () => {
  const g = fixture(), o = g.f1099r!.claim.ira_basis!.owners[0];
  g.f1099r!.claim.copies = [];
  g.f1099r!.claim.reviews.pop();
  o.distributions = [];
  o.accounts[0].plan_type = "simple_ira";
  o.accounts[0].simple_first_contribution_date = "2024-05-03";
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("eligible receiving IRA")
    ),
  );
  o.accounts[0].simple_first_contribution_date = "2024-05-02";
  const { r } = await run(g);
  assertEquals(
    r.ira_basis!.calculation.forms[0].carryforward_2027?.amount,
    4000,
  );
});
Deno.test("2026 multiple after-tax receipts retain cents and round their combined IRA basis once", async () => {
  const g = fixture(), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  const p = g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments[0];
  p.destinations[0].after_tax_basis = 1000.25;
  p.destinations[1].after_tax_basis = 1000.25;
  p.after_tax_basis =
    s.amounts.employee_contributions =
    s
      .distribution_sources[0].employee_contributions =
      2000.50;
  const { r } = await run(g), f = r.ira_basis!.calculation.forms[0];
  assertEquals(f.plan_rollover_basis_additions.map((a) => a.amount), [
    1000.25,
    1000.25,
  ]);
  assertEquals(f.partI?.line2, 4001);
});
Deno.test("2026 IRA HSA proof counts plan basis only after the actual rollover receipt", async () => {
  const { r } = await run();
  for (const after of [false, true]) {
    const h = hsaIraBasis2026(), o = h.claim.owners[0], a = o.accounts[0];
    h.plan_transfers_2026 = structuredClone(r.plan_transfers!.source_input);
    const t = h.plan_transfers_2026;
    delete t.form4852_sources_2026;
    t.taxpayer_dob = h.taxpayer_dob;
    t.entries[0].ledger.payments[0].destinations.forEach((d) => {
      d.custodian_tin = a.custodian_tin;
      d.account_number = a.account_number;
      d.received_on = after ? "2026-06-02" : "2026-05-02";
    });
    o.plan_rollover_receipt_references = ["ira-basis-receipt", "ira-receipt"];
    if (o.prior_basis.kind !== "filed_form8606") throw Error();
    delete o.prior_basis.no_intervening_basis_changes_verified;
    o.prior_basis.no_other_intervening_basis_changes_verified = true;
    o.accounts[0].year_end_statement.fair_market_value = 15000;
    if (!after) {
      assertThrows(
        () => bindIraBasis2026(h),
        Error,
        "basis-depletion settlement",
      );
      o.hsa_funding_valuations![0].accounts[0].fair_market_value = 4000;
    }
    const f = bindIraBasis2026(h).calculation.forms[0];
    assertEquals(
      f.hsa_basis_preservation?.[0].basis_upper_bound,
      after ? 200 : 2200,
    );
    assertEquals(f.partI?.line2, 2200);
  }
});
Deno.test("2026 after-tax plan receipts enter IRA basis once before same-year withdrawals", async () => {
  const { p, r } = await run(), f = r.ira_basis!.calculation.forms[0];
  assertEquals([
    f.partI?.line1,
    f.partI?.line2,
    f.partI?.line7,
    f.partI?.line12,
    f.partI?.line14,
    f.partI?.line15c,
  ], [0, 4000, 10000, 1000, 3000, 9000]);
  assertEquals(f.plan_rollover_basis_additions, [{
    receipt_reference: "ira-basis-receipt",
    received_on: "2026-05-02",
    amount: 2000,
  }]);
  assertEquals(f.carryforward_2027?.amount, 3000);
  assertEquals([
    p.f1040.line4a_ira_gross,
    p.f1040.line4b_ira_taxable,
    p.f1040.line5a_pension_gross,
    p.f1040.line5b_pension_taxable,
    p.schedule2.line5_form5329_early_tax,
    p.f1040.line25b_withheld_1099,
  ], [10000, 9000, 16000, 0, 900, 1000]);
  assertEquals(
    r.plan_transfers!.basis_records[0].account_number,
    "receiving-ira",
  );
});
Deno.test("2026 issued plan statements use the same receiving basis route", async () => {
  const { r } = await run(), s = structuredClone(r.source_input);
  delete s.form4852_sources_2026;
  delete s.claim.reviews[0].form4852_taxability_review_reference;
  s.claim.reviews[0].payer_determined_pension_taxability_verified = true;
  const f = calculate(s).ira_basis!.calculation.forms[0];
  assertEquals(f.partI?.line15c, 9000);
  assertEquals(f.carryforward_2027?.amount, 3000);
});
Deno.test("2026 plan basis requires the actual receiving account and complete unique receipt evidence", async () => {
  const edits: Array<(g: ReturnType<typeof fixture>) => void> = [
    (g) =>
      g.f1099r!.claim.ira_basis!.owners[0].plan_rollover_receipt_references!
        .pop(),
    (g) =>
      g.f1099r!.claim.ira_basis!.owners[0].plan_rollover_receipt_references!
        .push("ira-basis-receipt"),
    (g) =>
      g.f1099r!.claim.ira_basis!.owners[0].accounts[0].account_number =
        "wrong-account",
    (g) => {
      delete g.f1099r!.claim.ira_basis;
    },
    (g) => {
      const b = g.f1099r!.claim.ira_basis!.owners[0].prior_basis;
      if (b.kind === "filed_form8606") {
        b.no_intervening_basis_changes_verified = true;
      }
    },
    (g) => g.f1099r!.claim.ira_basis!.reviewed_on = "2027-02-01",
  ];
  for (const edit of edits) {
    const g = fixture();
    edit(g);
    assert(
      (await executeDraftSources2026(g)).diagnostics.some((d) =>
        d.nodeType === "f1099r"
      ),
    );
  }
});
Deno.test("2026 rollover alone preserves increased IRA basis without inventing a contribution or filing Form 8606", async () => {
  const g = fixture();
  g.f1099r!.claim.copies = [];
  g.f1099r!.claim.reviews.pop();
  g.f1099r!.claim.ira_basis!.owners[0].distributions = [];
  const { r } = await run(g), f = r.ira_basis!.calculation.forms[0];
  assertEquals(f.requires_form8606, false);
  assertEquals(f.partI, undefined);
  assertEquals(f.carryforward_2027?.amount, 4000);
});
Deno.test("2026 next-year plan receipt retains a future basis event without changing current IRA basis", async () => {
  const g = fixture(), o = g.f1099r!.claim.ira_basis!.owners[0];
  g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments[0]
    .destinations[0].received_on = "2027-01-04";
  o.plan_rollover_receipt_references = ["ira-receipt"];
  if (o.prior_basis.kind !== "filed_form8606") throw Error();
  delete o.prior_basis.no_other_intervening_basis_changes_verified;
  o.prior_basis.no_intervening_basis_changes_verified = true;
  const { r } = await run(g), f = r.ira_basis!.calculation.forms[0];
  assertEquals(
    [f.partI?.line2, f.partI?.line15c, f.carryforward_2027?.amount],
    [2000, 9500, 1500],
  );
  assertEquals(r.plan_transfers!.basis_records[0].basis_year, 2027);
  assertEquals(r.plan_transfers!.basis_records[0].basis_amount, 2000);
});
Deno.test("2026 non-Roth plan receipts preserve separate destination basis without adding IRA basis", async () => {
  const g = fixture(), o = g.f1099r!.claim.ira_basis!.owners[0];
  g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments[0]
    .destinations[0].destination_type = "eligible_non_roth_plan";
  o.plan_rollover_receipt_references = ["ira-receipt"];
  if (o.prior_basis.kind !== "filed_form8606") throw Error();
  delete o.prior_basis.no_other_intervening_basis_changes_verified;
  o.prior_basis.no_intervening_basis_changes_verified = true;
  const { r } = await run(g);
  assertEquals(r.ira_basis!.calculation.forms[0].partI?.line2, 2000);
  assertEquals(
    r.plan_transfers!.basis_records[0].destination_type,
    "eligible_non_roth_plan",
  );
});
Deno.test("2026 aggregate non-Roth rollover reviews cannot silently drop after-tax basis", async () => {
  const { r } = await run(), s = structuredClone(r.source_input);
  delete s.form4852_sources_2026;
  const review = s.claim.reviews[0];
  delete review.form4852_taxability_review_reference;
  delete review.direct_rollover_payments;
  review.payer_determined_pension_taxability_verified = true;
  review.direct_rollover = {
    record_reference: "aggregate",
    transfer_date: "2026-05-01",
    destination_account_reference: "receiving-ira",
    destination_type: "traditional_ira",
    amount_transferred: 16000.25,
    source_after_tax_basis: 2000,
    eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: true,
    no_cash_received_by_filer_verified: true,
  };
  delete s.claim.ira_basis;
  s.claim.copies = s.claim.copies.filter((c) => !c.box7b_ira_sep_simple);
  s.claim.reviews = [review];
  assertThrows(
    () => calculate(s),
    Error,
    "dated payment and destination receipts",
  );
});
