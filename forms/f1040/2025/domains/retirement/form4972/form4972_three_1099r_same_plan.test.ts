import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { DistributionCode } from "../../../../nodes/inputs/f1099r/index.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import { form4972 as mef } from "../../../mef/forms/retirement/f4972.ts";
import { form4972Pdf } from "../../../pdf/forms/retirement/f4972.ts";

const plan = {
  participant_name: "Ada Taxpayer",
  participant_ssn: "123456789",
  plan_reference: "Old Plan A",
  full_balance_statement_reference:
    "2025 administrator final-balance statement",
  all_qualified_distributions_included: true as const,
};
const copies = [
  [20_000, 2_000],
  [25_000, 3_000],
  [30_000, 4_000],
].map(([amount, gain], index) => ({
  payer_name: "Old Plan",
  payer_ein: "123456789",
  source_document_reference: `1099-R-A-${index + 1}`,
  form4972_plan: plan,
  box1_gross_distribution: amount,
  box2a_taxable_amount: amount,
  box3_capital_gain: gain,
  box9a_pct_total: 100,
  box7_distribution_code: DistributionCode.CodeA,
  ts: "T",
  exclude_4972: true,
}));
const election = {
  source_document_references: ["1099-R-A-1", "1099-R-A-2", "1099-R-A-3"],
  participant_name: plan.participant_name,
  participant_ssn: plan.participant_ssn,
  plan_reference: plan.plan_reference,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
};
const filer = {
  primarySSN: "123456789",
  fullName: "Ada Taxpayer",
  nameLine1: "Ada Taxpayer",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};
const general = {
  filing_status: "single",
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "123456789",
  taxpayer_dob: "1930-01-01",
};
const executionPlan = buildExecutionPlan(registry);
function filedReturn(sourceCopies = copies) {
  return execute(executionPlan, registry, {
    general,
    f1099r: sourceCopies,
    form4972: { elections: [election] },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("three same-plan 1099-R copies produce one Form 4972 and one Form 1040 special tax", () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const forms = pending.form4972?.forms as Record<string, unknown>[];
  assertEquals(forms.length, 1);
  assertEquals(forms[0].lump_sum_amount, 75_000);
  assertEquals(forms[0].capital_gain_amount, 9_000);
  assertEquals(forms[0].line6, 9_000);
  assertEquals(forms[0].line7, 1_800);
  assertEquals(forms[0].line8, 66_000);
  assertEquals(pending.f1040?.form4972_tax, forms[0].line30);
  assertEquals(pending.f1040?.line5b_pension_taxable ?? 0, 0);
  const [xml] = mef.build(pending.form4972!, { filer, pending });
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>9000</CapitalGainElectionAmt>",
  );
  const [pdf] = form4972Pdf.instances?.(pending.form4972!, filer, pending) ??
    [];
  assertEquals(pdf?.line6, 9_000);
  assertEquals(pdf?.line30, forms[0].line30);
});

Deno.test("three-copy Form 4972 rejects a missing or changed source and final tax", () => {
  const pending = filedReturn().pending;
  const changed = [
    copies.slice(0, 2),
    copies.map((copy, index) =>
      index === 2 ? { ...copy, box3_capital_gain: 3_999 } : copy
    ),
    copies.map((copy, index) =>
      index === 2
        ? { ...copy, form4972_plan: { ...plan, plan_reference: "Other Plan" } }
        : copy
    ),
  ];
  for (const sourceCopies of changed) {
    const altered = { ...pending, f1099r: { f1099rs: sourceCopies } };
    assertThrows(() =>
      mef.build(pending.form4972!, { filer, pending: altered })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(pending.form4972!, filer, altered)
    );
  }
  const wrongTax = { ...pending, f1040: { ...pending.f1040, form4972_tax: 1 } };
  assertThrows(() =>
    mef.build(pending.form4972!, { filer, pending: wrongTax })
  );
  assertThrows(() =>
    form4972Pdf.instances?.(pending.form4972!, filer, wrongTax)
  );
});
