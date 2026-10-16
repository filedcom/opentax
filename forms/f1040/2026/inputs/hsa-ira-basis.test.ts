import { assertEquals, assertThrows } from "@std/assert";
import {
  bindIraBasis2026 as calculate,
  type IraBasisBinding2026,
} from "./ira-basis-binding.ts";
import { hsaIraBasis2026 as fixture } from "./hsa-ira-basis.fixture.ts";
Deno.test("2026 annual IRA basis excludes the verified HSA payment from pro-rata withdrawals without spending basis", () => {
  const s = fixture(),
    before = structuredClone(s),
    r = calculate(s).calculation;
  const f = r.forms[0];
  assertEquals([f.raw_gross, f.raw_withdrawn, f.raw_qualified_hsa_funding], [
    1500,
    500,
    1000,
  ]);
  assertEquals([
    f.partI?.line7,
    f.partI?.line9,
    f.partI?.line10,
    f.partI?.line12,
    f.partI?.line15c,
  ], [500, 2000, .1, 50, 450]);
  assertEquals(f.carryforward_2027?.amount, 150);
  assertEquals(f.taxable_ira_income, 450);
  assertEquals(f.hsa_basis_preservation?.[0].basis_consumed, 0);
  assertEquals(
    r.hsa_funding?.qualified_funding[0].transfers[0].testing_period.amount,
    1000,
  );
  assertEquals(s, before);
});
Deno.test("2026 HSA-only IRA distributions retain basis without requiring Form 8606 solely for the transfer", () => {
  const s = fixture(),
    h = s.claim.hsa_funding_sources!,
    a = h.qualified_funding_review!.ira_accounts[0],
    o = s.claim.owners[0];
  a.payments.pop();
  a.form1099r.box1_gross_distribution = a.form1099r.box2a_taxable_amount = 1000;
  s.current_copies[0] = structuredClone(a.form1099r);
  o.statement_payment_ledgers![0].payments.pop();
  o.accounts[0].year_end_statement.fair_market_value = 1000;
  const r = calculate(s).calculation.forms[0];
  assertEquals(r.requires_form8606, false);
  assertEquals(r.partI, undefined);
  assertEquals(r.taxable_ira_income, 0);
  assertEquals(r.carryforward_2027?.amount, 200);
});
Deno.test("2026 IRA/HSA no-basis owner needs no invented valuation or basis allocation", () => {
  const s = fixture(), o = s.claim.owners[0];
  o.prior_basis = {
    kind: "none",
    record_reference: "no-prior-basis",
    no_prior_nondeductible_basis_verified: true,
  };
  delete o.hsa_funding_valuations;
  const r = calculate(s).calculation.forms[0];
  assertEquals(r.taxable_ira_income, 500);
  assertEquals(r.hsa_basis_preservation, [{
    payment_reference: "ira-payment",
    basis_upper_bound: 0,
    basis_consumed: 0,
  }]);
});
Deno.test("2026 IRA/HSA source binding rejects changed owners, birth dates, dependency and actual wages", () => {
  const edits: Array<(s: IraBasisBinding2026) => void> = [
    (s) => {
      s.taxpayer_dob = "1981-01-01";
    },
    (s) => {
      s.taxpayer_can_be_claimed_as_dependent = true;
    },
    (s) => {
      delete s.taxpayer_can_be_claimed_as_dependent;
    },
    (s) => {
      s.taxpayer_ssn = "400001038";
    },
    (s) => {
      s.wage_sources![0].box1_wages++;
    },
    (s) => {
      s.wage_sources = [];
    },
    (s) => {
      s.claim.reviewed_on = "2027-04-30";
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 IRA/HSA cannot exclude payments using a different current issued copy or inconsistent account classification", () => {
  const s = fixture();
  s.current_copies[0].box2b_total_distribution = true;
  assertThrows(() => calculate(s), Error, "identical resolved current");
  const t = fixture();
  t.claim.owners[0].accounts[0].plan_type = "sep_ira";
  assertThrows(
    () => calculate(t),
    Error,
    "same account and every dated payment",
  );
});
Deno.test("2026 annual IRA and HSA inventories must agree on ordinary as well as funding payment dates", () => {
  const s = fixture();
  s.claim.owners[0].statement_payment_ledgers![0].payments[1].distributed_on =
    "2026-10-01";
  assertThrows(() => calculate(s), Error, "every dated payment");
  const t = fixture();
  delete t.claim.owners[0].statement_payment_ledgers![0].payments[0]
    .hsa_receipt_reference;
  assertThrows(() => calculate(t), Error, "every dated payment");
});
Deno.test("2026 IRA HSA valuations need the actual payment date and every owned IRA account", () => {
  const edits: Array<(s: IraBasisBinding2026) => void> = [
    (s) => {
      delete s.claim.owners[0].hsa_funding_valuations;
    },
    (s) => {
      s.claim.owners[0].hsa_funding_valuations![0].as_of = "2026-12-31";
    },
    (s) => {
      s.claim.owners[0].hsa_funding_valuations![0].accounts[0].account_number =
        "other";
    },
    (s) => {
      s.claim.owners[0].hsa_funding_valuations!.push(
        structuredClone(s.claim.owners[0].hsa_funding_valuations![0]),
      );
    },
    (s) => {
      const a = structuredClone(s.claim.owners[0].accounts[0]);
      a.account_number = "second-ira";
      a.year_end_statement.source_document_reference = "second-yearend";
      s.claim.owners[0].accounts.push(a);
    },
  ];
  for (const edit of edits) {
    const s = fixture();
    edit(s);
    assertThrows(() => calculate(s));
  }
});
Deno.test("2026 IRA HSA taxable-first proof rejects one-cent basis consumption instead of silently reducing or preserving basis", () => {
  const s = fixture(),
    v = s.claim.owners[0].hsa_funding_valuations![0].accounts[0];
  v.fair_market_value = 1200;
  assertEquals(
    calculate(s).calculation.forms[0].hsa_basis_preservation?.[0]
      .taxable_amount_available,
    1000,
  );
  v.fair_market_value = 1199.99;
  assertThrows(() => calculate(s), Error, "basis-depletion settlement");
});
Deno.test("2026 IRA exclusions cannot declare HSA absence while supplying a qualified funding claim", () => {
  const s = fixture();
  s.claim.owners[0]
    .no_qcd_hsa_disaster_repayment_recharacterization_or_returned_contribution =
      true;
  assertThrows(() => calculate(s), Error, "exclusions must match");
  const t = fixture();
  delete t.claim.hsa_funding_sources;
  assertThrows(() => calculate(t), Error, "exclusions must match");
});
Deno.test("2026 IRA cannot replace a sourced HSA payment with owner cash", () => {
  const s = fixture();
  s.claim.owners[0].statement_payment_ledgers![0].payments[0]
    .cash_paid_to_owner = 1000;
  assertThrows(() => calculate(s), Error, "actual qualified funding transfer");
});

Deno.test("2026 IRA HSA taxable-first proof counts only nondeductible receipts already paid at transfer", () => {
  const s = fixture(), o = s.claim.owners[0], account = o.accounts[0];
  const owned = {
    owner_tin: o.owner_tin,
    custodian_tin: account.custodian_tin,
    account_number: account.account_number,
  };
  o.contributions = [{
    form5498: {
      ...owned,
      source_document_reference: "current-5498",
      tax_year: 2026,
      box1_ira_contributions: 300,
      no_rollover_recharacterization_or_employer_contribution_in_box1: true,
    },
    receipts: [
      {
        ...owned,
        source_document_reference: "pre-transfer-contribution",
        designated_tax_year: 2026,
        received_on: "2026-04-01",
        amount: 100,
      },
      {
        ...owned,
        source_document_reference: "post-year-contribution",
        designated_tax_year: 2026,
        received_on: "2027-02-01",
        amount: 200,
      },
    ],
  }];
  o.nondeductible_election = {
    record_reference: "election",
    owner_tin: o.owner_tin,
    all_listed_contributions_elected_nondeductible: true,
    no_ira_deduction_claimed: true,
    compensation_record_reference: "compensation",
    no_spousal_compensation_allocation: true,
    wage_document_references: s.wage_sources!.map((w) =>
      w.source_document_reference
    ),
    personal_service_business_references: [],
    listed_businesses_personal_services_material_income_factor_verified: true,
    no_self_employed_retirement_plan_deduction: true,
    no_other_compensation_or_exclusions: true,
  };
  const f = calculate(s).calculation.forms[0];
  assertEquals(f.hsa_basis_preservation?.[0].basis_upper_bound, 300);
  assertEquals([
    f.partI?.line1,
    f.partI?.line4,
    f.partI?.line5,
    f.partI?.line7,
    f.partI?.line12,
  ], [300, 200, 300, 500, 75]);
  assertEquals(f.taxable_ira_income, 425);
  assertEquals(f.carryforward_2027?.amount, 425);
});
Deno.test("2026 IRA conversion basis shares the annual pool with ordinary amounts but not HSA funding", () => {
  const s = fixture(),
    o = s.claim.owners[0],
    p = o.statement_payment_ledgers![0].payments[1];
  p.cash_paid_to_owner = 0;
  p.conversion = {
    receipt: {
      owner_tin: o.owner_tin,
      source_document_reference: "roth-receipt",
      custodian_tin: "777777777",
      account_number: "roth-ira",
      received_on: p.distributed_on,
      amount: 500,
    },
    direct_trustee_transfer_verified: true,
    not_required_minimum_distribution_verified: true,
    destination_roth_ira_verified: true,
  };
  o.roth_conversion_forms5498 = [{
    owner_tin: o.owner_tin,
    source_document_reference: "roth-5498",
    custodian_tin: "777777777",
    account_number: "roth-ira",
    tax_year: 2026,
    box3_conversion_amount: 500,
  }];
  const f = calculate(s).calculation.forms[0];
  assertEquals(
    [f.raw_qualified_hsa_funding, f.raw_withdrawn, f.raw_converted],
    [1000, 0, 500],
  );
  assertEquals(f.partII, { line16: 500, line17: 50, line18: 450 });
  assertEquals(f.carryforward_2027?.amount, 150);
});
Deno.test("2026 annual IRA reconciliation retains funding and ordinary source cents before filed basis lines", () => {
  const s = fixture(),
    h = s.claim.hsa_funding_sources!,
    a = h.qualified_funding_review!.ira_accounts[0],
    ledger = s.claim.owners[0].statement_payment_ledgers![0];
  h.claim.accounts[0].receipts[5].amount += .49;
  h.claim.accounts[0].form5498sa.box2_calendar_year_contributions += .49;
  a.payments[0].gross_amount += .49;
  a.payments[1].gross_amount += .49;
  a.form1099r.box1_gross_distribution =
    a.form1099r.box2a_taxable_amount =
      1500.98;
  s.current_copies[0] = structuredClone(a.form1099r);
  ledger.payments[0].gross += .49;
  ledger.payments[1].gross += .49;
  ledger.payments[1].cash_paid_to_owner += .49;
  const f = calculate(s).calculation.forms[0];
  assertEquals([f.raw_gross, f.raw_qualified_hsa_funding, f.raw_withdrawn], [
    1500.98,
    1000.49,
    500.49,
  ]);
  assertEquals(f.partI?.line7, 500);
  assertEquals(f.taxable_ira_income, 450);
});
