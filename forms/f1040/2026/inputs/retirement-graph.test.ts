import { assertEquals, assertThrows } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import {
  retirementCopy2026,
  retirementGraph2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { syntheticSocialSecurity2026 } from "./social-security.fixture.ts";
import { marketplaceGraph2026 } from "./marketplace-graph.fixture.ts";
import { eicGraphFixture2026 } from "../nodes/eitc.fixture.ts";
import { itemizedClaim2026 } from "../schedule-a.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { agi_2026 } from "../nodes/agi.ts";

async function run(graph: Record<string, unknown>) {
  const r = await executeDraftSources2026(graph);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
Deno.test("2026 retirement sources reach income tax and withholding without counting gross as taxable twice", async () => {
  const ira = retirementCopy2026("ira", true),
    pension = retirementCopy2026("pension");
  pension.box2a_taxable_amount = 10000.25;
  const graph = retirementGraph2026([ira, pension]);
  const p = await run(graph);
  assertEquals(p.f1040.line4a_ira_gross, undefined);
  assertEquals(p.f1040.line4b_ira_taxable, 12000);
  assertEquals(p.f1040.line5a_pension_gross, 12000);
  assertEquals(p.f1040.line5b_pension_taxable, 10000);
  assertEquals(p.f1040.line9_total_income, 52000);
  assertEquals(p.f1040.line11b_agi, 52000);
  assertEquals(p.f1040.line25b_withheld_1099, 2001);
  assertEquals(p.f1040.line25d_total_withholding, 12269);
  assertEquals(p.f1040.line24c_total_tax, Number(p.f1040.line16_income_tax));
  assertEquals(
    p.f1040.line35a_refund,
    12269 - Number(p.f1040.line24c_total_tax),
  );
  const source = retirementSource2026([ira, pension]);
  assertThrows(
    () =>
      agi_2026.compute({ taxYear: 2026, formType: "f1040" }, {
        filing_status: FilingStatus.Single,
        retirement_sources_2026: source,
        line4b_ira_taxable: 999,
        line5b_pension_taxable: 10000,
      }),
    Error,
    "reconcile",
  );
});
Deno.test("2026 retirement income changes taxable Social Security and Marketplace MAGI with all withholding combined", async () => {
  const graph = retirementGraph2026();
  const { filing_status: _status, taxpayer_ssn: _tin, ...ssa } =
    syntheticSocialSecurity2026();
  ssa.statements[0].recipient_tin = "400001037";
  const p = await run({ ...graph, ssa1099: ssa });
  assertEquals(p.f1040.line6a_ss_gross, 10000);
  assertEquals(p.f1040.line6b_ss_taxable, 8500);
  assertEquals(p.f1040.line9_total_income, 50500);
  assertEquals(p.f1040.line25b_withheld_1099, 1901);
  const marketplace = marketplaceGraph2026(50600);
  marketplace.general.taxpayer_dob = "1966-01-01";
  const copy = retirementCopy2026();
  copy.box1_gross_distribution = 12000;
  copy.box2a_taxable_amount = 12000;
  const r = await run({
    ...marketplace,
    f1099r: { claim: retirementSource2026([copy]).claim },
  });
  assertEquals(r.form8962.taxpayer_modified_agi, 62600);
  assertEquals(r.form8962.net_premium_tax_credit, 765);
  copy.box1_gross_distribution = 12001;
  copy.box2a_taxable_amount = 12001;
  const over = await run({
    ...marketplace,
    f1099r: { claim: retirementSource2026([copy]).claim },
  });
  assertEquals(over.form8962.excess_advance_payment, 3000);
});
Deno.test("2026 inherited qualified-plan income changes EIC AGI without becoming wages or investment income", async () => {
  const base = eicGraphFixture2026(10000, 1), copy = retirementCopy2026();
  copy.recipient_tin = base.general.taxpayer_ssn;
  copy.box7a_distribution_codes = [Code.Code4];
  copy.box1_gross_distribution = 25000;
  copy.box2a_taxable_amount = 25000;
  const source = retirementSource2026([copy]);
  source.claim.reviews[0].death_benefit = {
    decedent_tin: "333221111",
    death_date: "2025-01-01",
    record_reference: "benefit-death",
    no_inherited_basis_or_special_tax_treatment_verified: true,
  };
  const p = await run({ ...base, f1099r: { claim: source.claim } }),
    without = await run(base);
  assertEquals(p.f1040.line11b_agi, 35000);
  assertEquals(p.eitc.wage_income_from_agi, 10000);
  assertEquals(p.eitc.unsupported_eic_activity, false);
  assertEquals(
    Number(p.f1040.line27a_eic) < Number(without.f1040.line27a_eic),
    true,
  );
  assertEquals(p.f8812.wage_income_from_agi, 10000);
});
Deno.test("2026 retirement state and local withholding reaches Schedule A and rejects a duplicate expense receipt", async () => {
  const copy = retirementCopy2026();
  copy.state_information = [{
    state: "NY",
    payer_state_id: "NY-123",
    box14_state_withheld: 2000,
    box16_state_distribution: 12000.25,
  }];
  copy.local_information = [{
    locality: "NYC",
    box17_local_withheld: 500,
    box19_local_distribution: 12000.25,
  }];
  const graph = {
    ...retirementGraph2026([copy]),
    schedule_a: { ...itemizedClaim2026 },
  };
  const p = await run(graph);
  const a = p.schedule_a.calculation_2026 as { lines: { line5a: number } };
  assertEquals(a.lines.line5a, 2500);
  const bad = await executeDraftSources2026({
    ...graph,
    schedule_a: {
      ...graph.schedule_a,
      tax_payments: [{
        kind: "state_local_income",
        payer_ssn: "400001037",
        payment_reference: "same-payment",
        source_document_reference: "retirement-copy",
        amount_paid: 2500,
        payment_date: "2026-12-01",
        qualification_record_reference: "income-tax-review",
        not_deducted_elsewhere: true,
        authority: "NY",
        payment_type: "return_payment",
        tax_only_no_penalty_or_interest: true,
        not_withheld_on_information_return: true,
        not_allocable_to_excluded_income: true,
      }],
    },
  });
  assertEquals(
    bad.diagnostics.some((d) => d.message.includes("Duplicate itemized")),
    true,
  );
});
Deno.test("2026 joint retirement keeps each filer source and permits pension rollovers alongside IRA income", async () => {
  const copy = retirementCopy2026("spouse-ira", true);
  copy.recipient = "spouse";
  copy.recipient_tin = "555667777";
  const rollover = retirementCopy2026("rollover");
  rollover.box7a_distribution_codes = [Code.CodeG];
  rollover.box2a_taxable_amount = 0;
  rollover.box4_federal_withheld = 0;
  const source = retirementSource2026([copy, rollover]);
  source.claim.reviews[1].direct_rollover = {
    record_reference: "direct-plan-transfer",
    transfer_date: "2026-06-01",
    destination_account_reference: "IRA-999",
    destination_type: "traditional_ira",
    amount_transferred: 12000.25,
    source_after_tax_basis: 0,
    eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: true,
    no_cash_received_by_filer_verified: true,
  };
  const graph = retirementGraph2026();
  const p = await run({
    ...graph,
    general: {
      ...graph.general,
      filing_status: FilingStatus.MFJ,
      spouse_first_name: "Morgan",
      spouse_last_name: "Wheat",
      spouse_ssn: "555667777",
      spouse_dob: "1966-01-01",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
    },
    f1099r: { claim: source.claim },
  });
  assertEquals(p.f1040.line4b_ira_taxable, 12000);
  assertEquals(p.f1040.line5b_pension_taxable, 0);
  assertEquals(p.f1040.line5c_rollover, true);
  assertEquals(p.f1040.line11b_agi, 42000);
});

Deno.test("2026 qualified retirement income increases NIIT MAGI without becoming net investment income", async () => {
  const { syntheticInvestmentClaim2026, syntheticInterest2026 } = await import(
    "./investment.fixture.ts"
  );
  const copy = retirementCopy2026();
  copy.box1_gross_distribution = 20000;
  copy.box2a_taxable_amount = 20000;
  const investment = syntheticInvestmentClaim2026();
  investment.f1099divs = [];
  investment.f1099ints = [{
    ...syntheticInterest2026(),
    recipient_tin: "400001037",
    box1: 10000,
    box3: 0,
    box8: 0,
  }];
  const p = await run({
    ...retirementGraph2026([copy], 190000),
    investment_income: investment,
  });
  assertEquals(p.f1040.line11b_agi, 220000);
  assertEquals(p.schedule2.line6_niit, 380);
});
