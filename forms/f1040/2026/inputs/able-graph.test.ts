import { assert, assertEquals, assertThrows } from "@std/assert";
import { executeDraftSources2026 } from "../execute.ts";
import { ableGraph2026 } from "./able-graph.fixture.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import type { calculateSaversCredit2026 } from "./savers-credit-source.ts";
import { calculateForm5329Sources2026 } from "./form5329-source.ts";
import { earlyRetirementSource2026 } from "./retirement-early.fixture.ts";
import { form1062TaxFixture2026 } from "./form1062-tax.fixture.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import { calculateForm1062Tax2026 } from "./form1062-tax.ts";
import { syntheticSocialSecurity2026 } from "./social-security.fixture.ts";
import { marketplaceGraph2026 } from "./marketplace-graph.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { ableDistribution2026, ableSource2026 } from "./able.fixture.ts";
async function run(g: Record<string, unknown>) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
Deno.test("2026 ABLE graph binds beneficiary cash and gross withdrawals separately from taxable earnings", async () => {
  const g = ableGraph2026(true);
  const a = g.able_accounts.claim.accounts[0];
  a.beneficiary_payments[0].amount = 3000;
  a.form5498qa.box1_contributions = 3000;
  const p = await run(g);
  const saver = p.form8880.calculation_2026 as ReturnType<
    typeof calculateSaversCredit2026
  >;
  assertEquals([
    saver.columns[0].line1,
    saver.columns[0].line4,
    saver.lines.line12,
  ], [3000, 2000, 500]);
  assertEquals(p.schedule1.line8q_able_taxable_earnings, 200);
  assertEquals(p.schedule1.line10_total_additional_income, 200);
  assertEquals(p.f1040.line11b_agi, 24200);
  assertEquals(p.schedule2.line5_form5329_early_tax, 20);
  assertEquals(p.f1040.line20_nonrefundable_credits, 500);
  assertEquals(p.f1040.line23_other_taxes, 20);
  const zero = ableGraph2026(true);
  zero.able_accounts.claim.accounts[0].current_year_distributions!
    .qualified_expenses[0].amount = 2000;
  const z = await run(zero), zs = z.form8880.calculation_2026 as typeof saver;
  assertEquals(z.f1040.line11b_agi, 24000);
  assertEquals(zs.columns[0].line4, 2000);
  assertEquals(zs.lines.line12, 0);
  assertEquals(
    (z.form5329.calculation_2026 as ReturnType<
      typeof calculateForm5329Sources2026
    >).owners,
    [],
  );
});
Deno.test("2026 ABLE source runs without a saver claim and rejects unsupported intake or stale inventory", async () => {
  const b = ableGraph2026(true), { form8880: _claim, f8812: _child, ...g } = b;
  assertEquals((await run(g)).f1040.line11b_agi, 24200);
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...g,
      able_accounts: {
        ...g.able_accounts,
        wage_sources: [],
        taxpayer_ssn: "999887777",
      },
    })
  );
  for (
    const mutate of [
      (x: typeof b) => {
        x.form8880.claim.able_inventory_reference = "stale";
      },
      (x: typeof b) => {
        x.form8880.claim.no_able_contributions_or_current_able_distributions =
          true;
      },
      (x: typeof b) => {
        x.able_accounts.claim.accounts[0].form5498qa.beneficiary_ssn =
          "999887777";
      },
      (x: typeof b) => {
        x.able_accounts.claim.reviewed_on = "2027-04-16";
      },
    ]
  ) {
    const bad = structuredClone(b);
    mutate(bad);
    assert((await executeDraftSources2026(bad)).diagnostics.length > 0);
  }
});
Deno.test("2026 ABLE income changes Social Security and Marketplace MAGI before tax", async () => {
  const g = ableGraph2026(true),
    { form8880: _saver, f8812: _child, ...base } = g;
  const { filing_status: _status, taxpayer_ssn: _tin, ...ssa } =
    syntheticSocialSecurity2026();
  ssa.statements[0].recipient_tin = g.general.taxpayer_ssn;
  const without = await run({
    ...base,
    able_accounts: undefined,
    ssa1099: ssa,
  });
  const withAble = await run({ ...base, ssa1099: ssa });
  assert(
    Number(withAble.f1040.line6b_ss_taxable) >
      Number(without.f1040.line6b_ss_taxable),
  );
  const m = marketplaceGraph2026(62400);
  const r = await run({
    ...m,
    able_accounts: {
      claim: JSON.parse(
        JSON.stringify(g.able_accounts.claim).replaceAll(
          g.general.taxpayer_ssn,
          m.general.taxpayer_ssn,
        ),
      ),
    },
  });
  assertEquals(r.form8962.taxpayer_modified_agi, 62600);
});
Deno.test("2026 ABLE taxable NIIT boundary requires classification only above the filing-status threshold", async () => {
  const at = ableGraph2026(true, 199800);
  assertEquals((await run(at)).f1040.line11b_agi, 200000);
  const over = await executeDraftSources2026(ableGraph2026(true, 199801));
  assert(over.diagnostics.some((d) => d.message.includes("section 1411")));
});
Deno.test("2026 owner Form 5329 merges retirement Part I and ABLE Part II and rejects stale sources", async () => {
  const g = ableGraph2026(true), rs = earlyRetirementSource2026(false, 1000);
  rs.claim.copies[0].recipient_tin = g.general.taxpayer_ssn;
  g.form8880.claim.retirement_inventory_reference = rs.claim.record_reference;
  const p = await run({ ...g, f1099r: { claim: rs.claim } });
  const r = p.form5329.calculation_2026 as ReturnType<
    typeof calculateForm5329Sources2026
  >;
  assertEquals(r.owners.length, 1);
  assertEquals(r.owners[0].part1?.line4, 100);
  assertEquals(r.owners[0].part2?.line8, 20);
  assertEquals(r.owners[0].file_form5329, true);
  assertEquals(r.form5329_not_required, false);
  assertEquals(p.schedule2.line5_form5329_early_tax, 120);
  assertEquals(p.f1040.line23_other_taxes, 120);
  const bad = structuredClone(r.source_input);
  bad.able_sources_2026!.taxpayer_dob = "1981-01-01";
  assertThrows(
    () => calculateForm5329Sources2026(bad),
    Error,
    "owners and birth",
  );
  const stale = structuredClone(r.source_input);
  stale.retirement_sources_2026!.wage_sources[0].box1_wages++;
  assertThrows(
    () => calculateForm5329Sources2026(stale),
    Error,
    "wage and business",
  );
});
Deno.test("2026 joint Form 5329 sums the printed owner tax instead of a combined code-1 shortcut", () => {
  const a = ableSource2026(), rs = earlyRetirementSource2026(false, 5);
  a.taxpayer_dob = rs.taxpayer_dob;
  a.wage_sources = rs.wage_sources;
  a.filing_status = rs.filing_status = FilingStatus.MFJ;
  a.spouse_ssn = rs.spouse_ssn = "400001038";
  a.spouse_dob = rs.spouse_dob = "1980-02-01";
  delete a.claim.accounts[0].no_current_year_able_distributions_confirmed;
  a.claim.accounts[0].current_year_distributions = ableDistribution2026(a);
  a.claim.accounts[0].current_distribution_copy_after_corrections_verified =
    true;
  const c = structuredClone(rs.claim.copies[0]);
  c.recipient = "spouse";
  c.recipient_tin = a.spouse_ssn;
  c.source_document_reference = "spouse-copy";
  c.statement_identifier = "spouse-copy";
  c.account_number = "spouse-account";
  const review = structuredClone(rs.claim.reviews[0]);
  review.source_document_reference = c.source_document_reference;
  review.early_distribution!.record_reference = "spouse-ledger";
  review.early_distribution!.payments[0].record_reference = "spouse-payment";
  rs.claim.copies.push(c);
  rs.claim.reviews.push(review);
  const r = calculateForm5329Sources2026({
    filing_status: a.filing_status,
    taxpayer_ssn: a.taxpayer_ssn,
    spouse_ssn: a.spouse_ssn,
    taxpayer_dob: a.taxpayer_dob,
    spouse_dob: a.spouse_dob,
    retirement_sources_2026: rs,
    able_sources_2026: a,
  });
  assertEquals(
    r.owners.map(
      (o) => [o.owner, o.part1?.line4, o.part2?.line8, o.file_form5329],
    ),
    [["taxpayer", 1, 20, true], ["spouse", 1, undefined, true]],
  );
  assertEquals(r.schedule2_line5, 22);
});
Deno.test("2026 Form 1062 retains ABLE additional tax outside the deferred regular-tax comparison", () => {
  const g = {
    ...landGraphFixture2026(5000, [], 24000),
    ...ableGraph2026(true),
  };
  const { input } = form1062TaxFixture2026(g),
    r = calculateForm1062Tax2026(input);
  assertEquals(r.lines.line2, 0);
  assertEquals(r.lines.line10, 0);
  assertEquals(r.unchanged_return_facts.other_taxes, 20);
  const bad = structuredClone(input);
  bad.schedule2.line5_form5329_early_tax = 21;
  assertThrows(() => calculateForm1062Tax2026(bad), Error, "Form 5329 sources");
  const omitted = structuredClone(input);
  delete omitted.form5329;
  assertThrows(
    () => calculateForm1062Tax2026(omitted),
    Error,
    "Form 5329 sources",
  );
});
