import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { DistributionCode } from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { registry } from "../../../../registry.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { form4972 as native } from "../../../../mef/forms/taxes/retirement/f4972.ts";
import { form4972Pdf } from "../../../../pdf/forms/taxes/retirement/f4972.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";

const plan = {
  participant_name: "Ada Taxpayer",
  participant_ssn: "123456789",
  plan_reference: "Old Stock Bonus Plan",
  full_balance_statement_reference: "2025 plan administrator final balance",
  all_qualified_distributions_included: true as const,
};
const copies = [
  { amount: 20_000, gain: 2_000, nua: 10_000, gross: 30_000 },
  { amount: 30_000, gain: 3_000, nua: 0, gross: 30_000 },
].map(({ amount, gain, nua, gross }, index) => ({
  payer_name: "Old Stock Bonus Plan",
  payer_ein: "123456789",
  recipient_ssn: plan.participant_ssn,
  source_document_reference: `2025-1099-R-stock-${index + 1}`,
  form4972_plan: plan,
  box1_gross_distribution: gross,
  box2a_taxable_amount: amount,
  box3_capital_gain: gain,
  box6_nua: nua,
  box9a_pct_total: 100,
  box7_distribution_code: DistributionCode.CodeA,
  ts: "T" as const,
  exclude_4972: true,
}));
const election = {
  source_document_references: copies.map((copy) =>
    copy.source_document_reference
  ),
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
  elect_include_nua: true,
  elect_10yr_averaging: true,
};

Deno.test("two same-plan 1099-R copies aggregate exact NUA worksheet through Form 1040, native, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
      taxpayer_dob: "1930-01-01",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      digital_assets: false,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    f1099r: copies,
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: "2025 residency and income review",
        no_form2555_filed: true,
        form2555_review_source_reference: "2025 foreign-income return review",
        no_form4563_filed: true,
        form4563_review_source_reference: "2025 Samoa-source income review",
      },
    },
    form4972: { elections: [election] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const forms = pending.form4972;
  const returnFields = pending.f1040;
  assert(forms && Array.isArray(forms.forms) && returnFields);
  const form = forms.forms[0] as Record<string, unknown>;
  assertEquals(form.lump_sum_amount, 50_000);
  assertEquals(form.capital_gain_amount, 5_000);
  assertEquals(form.box6_nua, 10_000);
  assertEquals(form.line6_nua_capital_gain, 1_000);
  assertEquals(form.line6, 6_000);
  assertEquals(form.line8_nua_included, 9_000);
  assertEquals(form.line8, 54_000);
  assertEquals(returnFields.form4972_tax, form.line30);
  assertEquals(returnFields.line16_income_tax, form.line30);
  assertEquals(returnFields.line13b_additional_deductions, 6_000);
  const filer = extractFilerIdentity(returnFields);
  const [xml] = native.build(forms, { filer, pending });
  assert(xml.includes(">6000</CapitalGainElectionAmt>"));
  assert(xml.includes("<LumpSumDistriOrdinaryIncmAmt"));
  assert(xml.includes(">54000</LumpSumDistriOrdinaryIncmAmt>"));
  const [pdf] =
    form4972Pdf.instances?.(forms, filer, normalizeAllPending(pending)) ?? [];
  assertEquals(pdf?.line6, 6_000);
  assertEquals(pdf?.line8, 54_000);
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assert(bundle.xml.includes("<IRS4972"));

  for (
    const altered of [
      { ...copies[0], box6_nua: 9_999 },
      { ...copies[0], box3_capital_gain: 1_999 },
      {
        ...copies[0],
        form4972_plan: { ...plan, plan_reference: "Other plan" },
      },
    ]
  ) {
    const changed = {
      ...pending,
      f1099r: { f1099rs: [altered, copies[1]] },
    };
    assertThrows(
      () => native.build(forms, { filer, pending: changed }),
      Error,
    );
    assertThrows(
      () => form4972Pdf.instances?.(forms, filer, normalizeAllPending(changed)),
      Error,
    );
  }
  const changedReturn = {
    ...pending,
    f1040: { ...returnFields, form4972_tax: Number(form.line30) + 1 },
  };
  assertThrows(
    () => native.build(forms, { filer, pending: changedReturn }),
    Error,
  );
  assertThrows(
    () =>
      form4972Pdf.instances?.(forms, filer, normalizeAllPending(changedReturn)),
    Error,
  );
});
