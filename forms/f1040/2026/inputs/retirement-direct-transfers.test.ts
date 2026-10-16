import { assert, assertEquals, assertThrows } from "@std/assert";
import { directTransfersGraph2026 } from "./retirement-direct-transfers.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateRetirementSources2026 } from "./retirement-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
async function run(g = directTransfersGraph2026()) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    r: r.pending.f1099r.calculation_2026 as ReturnType<
      typeof calculateRetirementSources2026
    >,
  };
}
Deno.test("2026 substitute plan transfers reconcile multiple payments and Roth/non-Roth destinations", async () => {
  const { p, r } = await run();
  assertEquals(p.f1040.line5a_pension_gross, 16000);
  assertEquals(p.f1040.line5b_pension_taxable, 4000);
  assertEquals(p.f1040.line5c_rollover, true);
  assertEquals(p.f1040.line25b_withheld_1099 ?? 0, 0);
  assertEquals(p.schedule2.line5_form5329_early_tax ?? 0, 0);
  assertEquals(r.rows[0].direct_transfers!.payments.map((p) => p.taxable), [
    4000.25,
    0,
  ]);
  assertEquals(r.rows[0].direct_transfers!.receipt_references.length, 3);
});
Deno.test("2026 direct transfer ledger also handles issued statements without duplicating code-G income", async () => {
  const { r } = await run(), s = structuredClone(r.source_input);
  delete s.form4852_sources_2026;
  delete s.claim.reviews[0].form4852_taxability_review_reference;
  s.claim.reviews[0].payer_determined_pension_taxability_verified = true;
  const result = calculateRetirementSources2026(s);
  assertEquals(result.filed_lines, {
    line5a_pension_gross: 16000,
    line5b_pension_taxable: 4000,
    line5c_rollover: true,
  });
});
Deno.test("2026 direct transfer source cannot replace dated destination evidence with an aggregate review", async () => {
  const { r } = await run(), s = structuredClone(r.source_input);
  delete s.claim.reviews[0].direct_rollover_payments;
  s.claim.reviews[0].direct_rollover = {
    record_reference: "aggregate",
    transfer_date: "2026-05-01",
    destination_account_reference: "account",
    destination_type: "roth_ira",
    amount_transferred: 16000.25,
    source_after_tax_basis: 2000,
    eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: true,
    no_cash_received_by_filer_verified: true,
  };
  assertThrows(
    () => calculateRetirementSources2026(s),
    Error,
    "dated payment and destination receipts",
  );
  s.claim.reviews[0].direct_rollover_payments =
    r.source_input.claim.reviews[0].direct_rollover_payments;
  assertThrows(
    () => calculateRetirementSources2026(s),
    Error,
    "two competing reviews",
  );
});
Deno.test("2026 direct transfers reject changed payment dates and amounts despite unchanged annual totals", async () => {
  for (
    const field of [
      "paid_on",
      "payment_reference",
      "gross",
      "after_tax_basis",
    ] as const
  ) {
    const g = directTransfersGraph2026(),
      p = g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments;
    if (field === "paid_on") p[0].paid_on = "2026-05-02";
    else if (field === "payment_reference") {
      p[0].payment_reference = "unmatched-payment";
    } else {
      p[0][field]--;
      p[1][field]++;
    }
    assert(
      (await executeDraftSources2026(g)).diagnostics.some((d) =>
        d.nodeType === "f1099r"
      ),
      field,
    );
  }
});
Deno.test("2026 direct transfer receipts require ownership chronology and exact destination allocations", async () => {
  for (
    const field of [
      "owner_tin",
      "received_on",
      "amount",
      "after_tax_basis",
      "receipt_reference",
    ] as const
  ) {
    const g = directTransfersGraph2026(),
      d = g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments[0]
        .destinations;
    if (field === "owner_tin") d[0].owner_tin = "400001099";
    else if (field === "received_on") d[0].received_on = "2026-04-30";
    else if (field === "receipt_reference") {
      d[0].receipt_reference = d[1].receipt_reference;
    } else d[0][field]++;
    assert(
      (await executeDraftSources2026(g)).diagnostics.some((d) =>
        d.nodeType === "f1099r"
      ),
      field,
    );
  }
});
Deno.test("2026 direct transfer ledger rejects after-tax non-Roth destinations pending basis integration", async () => {
  const g = directTransfersGraph2026();
  g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments[0]
    .destinations[0].destination_type = "traditional_ira";
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("destination basis integration")
    ),
  );
});
Deno.test("2026 direct transfers keep joint spouse ownership through every destination receipt", async () => {
  const g = directTransfersGraph2026(), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  Object.assign(g.general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",
    spouse_last_name: "Wheat",
    spouse_ssn: "400001045",
    spouse_dob: "1980-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  s.owner_tin = "400001045";
  s.distribution_sources.forEach((p) => p.owner_ssn = s.owner_tin);
  g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments.forEach((p) =>
    p.destinations.forEach((d) => d.owner_tin = s.owner_tin)
  );
  const { p, r } = await run(g);
  assertEquals(p.f1040.line5b_pension_taxable, 4000);
  assertEquals(r.rows[0].owner_tin, s.owner_tin);
});
Deno.test("2026 direct transfer receipts cannot be reused across distinct issued statements", async () => {
  const { r } = await run(), s = structuredClone(r.source_input);
  delete s.form4852_sources_2026;
  delete s.claim.reviews[0].form4852_taxability_review_reference;
  s.claim.reviews[0].payer_determined_pension_taxability_verified = true;
  const copy = structuredClone(s.claim.copies[0]);
  copy.source_document_reference = "second-issued";
  copy.statement_identifier = "second-issued";
  copy.account_number = "second-account";
  const review = structuredClone(s.claim.reviews[0]);
  review.source_document_reference = copy.source_document_reference;
  review.record_reference = "second-treatment";
  s.claim.copies.push(copy);
  s.claim.reviews.push(review);
  assertThrows(
    () => calculateRetirementSources2026(s),
    Error,
    "reused across retirement statements",
  );
});
Deno.test("2026 direct transfers distinguish fully deferred and fully Roth destination inventories", async () => {
  for (const roth of [false, true]) {
    const g = directTransfersGraph2026(), s = g.f4852.claim.records[0];
    if (s.kind !== "1099r") throw Error();
    const payments =
      g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments;
    for (const p of payments) {
      p.destinations.forEach((d) => {
        d.destination_type = roth ? "roth_ira" : "eligible_non_roth_plan";
        if (!roth) d.after_tax_basis = 0;
      });
      if (!roth) p.after_tax_basis = 0;
    }
    s.amounts.taxable_amount = roth ? 14000.25 : 0;
    s.amounts.employee_contributions = roth ? 2000 : 0;
    s.distribution_sources[0].taxable_amount = roth ? 8000.25 : 0;
    s.distribution_sources[1].taxable_amount = roth ? 6000 : 0;
    if (!roth) s.distribution_sources[0].employee_contributions = 0;
    const { p } = await run(g);
    assertEquals(p.f1040.line5b_pension_taxable, roth ? 14000 : 0);
    assertEquals(p.f1040.line5a_pension_gross, 16000);
    assertEquals(p.f1040.line5c_rollover, true);
  }
});
Deno.test("2026 direct transfers retain next-year receipt evidence only through the completed review", async () => {
  const g = directTransfersGraph2026(), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  const p = g.f1099r!.claim.reviews[0].direct_rollover_payments!.payments[0];
  p.paid_on = s.distribution_sources[0].paid_on = "2026-12-30";
  p.destinations.forEach((d) => d.received_on = "2027-01-04");
  await run(g);
  p.destinations[0].received_on = "2027-03-16";
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("timely receipt")
    ),
  );
});
Deno.test("2026 direct transfer dates cannot precede the actual recipient birth date", async () => {
  const g = directTransfersGraph2026();
  g.general.taxpayer_dob = "2026-06-15";
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("payment date or basis conflicts")
    ),
  );
});
