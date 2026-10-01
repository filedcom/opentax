import { assert, assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { FilingStatus, TS } from "../nodes/types.ts";
import { buildStartNode, inputNodes } from "../2025/start.ts";

const plan = buildExecutionPlan(registry);

Deno.test("Form 4972 public election accepts eligibility but not substitute 1099-R facts", () => {
  const start = buildStartNode(inputNodes);
  const election = {
    source_document_references: ["source-4972"],
    born_before_1936: true,
    entire_balance_distributed: true,
    rolled_over_any: false,
    beneficiary_distribution: false,
    participant_five_year_member: true,
    prior_election_after_1986: false,
    elect_capital_gain: true,
  };
  assertEquals(
    start.inputSchema.safeParse({ form4972: { elections: [election] } })
      .success,
    true,
  );
  for (
    const sourcedFact of [
      { lump_sum_amount: 100_000 },
      { capital_gain_amount: 30_000 },
      { recipient: TS.T },
      { recipient_share_pct: 50 },
    ]
  ) {
    assertEquals(
      start.inputSchema.safeParse({
        form4972: { elections: [{ ...election, ...sourcedFact }] },
      }).success,
      false,
    );
  }
});

Deno.test("Form 4972 public election fails closed without the elected source Form 1099-R", () => {
  const result = execute(plan, registry, {
    form4972: {
      elections: [{
        source_document_references: ["missing-source-4972"],
        born_before_1936: true,
        entire_balance_distributed: true,
        rolled_over_any: false,
        beneficiary_distribution: false,
        participant_five_year_member: true,
        prior_election_after_1986: false,
        elect_capital_gain: true,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assert(
    result.diagnostics.some((diagnostic) =>
      diagnostic.nodeType === "form4972" &&
      diagnostic.message.includes("source_forms")
    ),
  );
  assertEquals(result.pending.f1040?.form4972_tax, undefined);
});

function electedReturn(
  elect10yr: boolean,
  includeOtherPension = false,
  deathBenefit = 0,
  includedNua = 0,
  federalEstateTax = 0,
) {
  return execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Pat",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "400001107",
      taxpayer_dob: "1930-01-01",
    },
    f1099r: [
      {
        payer_name: "Example Plan",
        payer_ein: "000000009",
        source_document_reference: "example-4972-1099r",
        box1_gross_distribution: 100_000,
        box2a_taxable_amount: 100_000,
        box3_capital_gain: 30_000,
        ...(includedNua > 0 ? { box6_nua: includedNua } : {}),
        box7_distribution_code: DistributionCode.CodeA,
        ts: TS.T,
        exclude_4972: true,
      },
      ...(includeOtherPension
        ? [{
          payer_name: "Other Plan",
          payer_ein: "000000009",
          box1_gross_distribution: 1_000,
          box2a_taxable_amount: 1_000,
          box7_distribution_code: DistributionCode.Code7,
        }]
        : []),
    ],
    form4972: {
      elections: [{
        source_document_references: ["example-4972-1099r"],
        born_before_1936: true,
        entire_balance_distributed: true,
        rolled_over_any: false,
        beneficiary_distribution: false,
        participant_five_year_member: true,
        prior_election_after_1986: false,
        prior_beneficiary_election_after_1986: false,
        elect_capital_gain: true,
        elect_10yr_averaging: elect10yr,
        ...(includedNua > 0 ? { elect_include_nua: true } : {}),
        ...(deathBenefit > 0 || federalEstateTax > 0
          ? {
            beneficiary_distribution: true,
            participant_five_year_member: false,
            ...(deathBenefit > 0
              ? {
                death_benefit_exclusion: deathBenefit,
                participant_died_before_1996_08_21: true,
              }
              : {}),
          }
          : {}),
        ...(federalEstateTax > 0
          ? { federal_estate_tax: federalEstateTax }
          : {}),
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
}

function printed(
  result: ReturnType<typeof electedReturn>,
): Record<string, unknown> {
  return (result.pending.form4972?.forms as Record<string, unknown>[])[0];
}

Deno.test("Form 4972 Part II only reports its ordinary portion on 1040 lines 5a and 5b", () => {
  const result = electedReturn(false);
  assertEquals(result.diagnostics, []);
  assertEquals(printed(result).line7, 6_000);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 70_000);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 70_000);
  assertEquals(result.pending.f1040?.line9_total_income, 70_000);
});

Deno.test("Form 4972 Parts II and III keep the entire distribution off 1040 line 5b", () => {
  const result = electedReturn(true);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5b_pension_taxable ?? 0, 0);
  assertEquals(result.pending.f1040?.line9_total_income ?? 0, 0);
});

Deno.test("Form 4972 Part II ordinary income combines with a separate pension", () => {
  const result = electedReturn(false, true);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 71_000);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 71_000);
  assertEquals(result.pending.f1040?.line9_total_income, 71_000);
});

Deno.test("Form 4972 Part II death benefit reduces the 1040 ordinary-income share", () => {
  const result = electedReturn(false, false, 5_000);
  assertEquals(result.diagnostics, []);
  assertEquals(printed(result).line6, 28_500);
  assertEquals(printed(result).line7, 5_700);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 66_500);
  assertEquals(result.pending.f1040?.line9_total_income, 66_500);
});

Deno.test("Form 4972 Part II NUA election reaches Form 1040 ordinary income", () => {
  const result = electedReturn(false, false, 0, 20_000);
  assertEquals(result.diagnostics, []);
  assertEquals(printed(result).line6, 36_000);
  assertEquals(printed(result).line6_nua_capital_gain, 6_000);
  assertEquals(printed(result).line7, 7_200);
  assertEquals(printed(result).line8, undefined);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 84_000);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 84_000);
  assertEquals(result.pending.f1040?.line9_total_income, 84_000);
  assertEquals(result.pending.f1040?.form4972_tax, 7_200);
});

Deno.test("Form 4972 Part II-only estate tax reaches Schedule A without reducing pension income", () => {
  const result = electedReturn(false, false, 0, 0, 4_000);
  assertEquals(result.diagnostics, []);
  assertEquals(printed(result).line6, 28_800);
  assertEquals(printed(result).line7, 5_760);
  assertEquals(printed(result).line18, undefined);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 70_000);
  assertEquals(result.pending.schedule_a?.line_16_other_deductions, 2_800);
});

Deno.test("Form 4972 Part II-only death benefit and estate tax reach distinct Form 1040 and Schedule A lines", () => {
  const result = electedReturn(false, false, 5_000, 0, 4_000);
  assertEquals(result.diagnostics, []);
  assertEquals(printed(result).line6, 27_300);
  assertEquals(printed(result).line7, 5_460);
  assertEquals(printed(result).line18, undefined);
  assertEquals(result.pending.f1040?.line5a_pension_gross, 66_500);
  assertEquals(result.pending.f1040?.line5b_pension_taxable, 66_500);
  assertEquals(result.pending.schedule_a?.line_16_other_deductions, 2_800);
});

Deno.test("Form 4972 combined election keeps the ordinary estate-tax share on line 18", () => {
  const result = electedReturn(true, false, 0, 0, 4_000);
  assertEquals(result.diagnostics, []);
  assertEquals(printed(result).line6, 28_800);
  assertEquals(printed(result).line18, 2_800);
  assertEquals(result.pending.schedule_a?.line_16_other_deductions, undefined);
});

Deno.test("Form 4972 shared annuity keeps box 8 and box 9a percentages separate", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Pat",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "400001107",
      taxpayer_dob: "1930-01-01",
    },
    f1099r: [{
      payer_name: "Example Plan",
      payer_ein: "000000009",
      source_document_reference: "shared-annuity-4972",
      box1_gross_distribution: 20_000,
      box2a_taxable_amount: 20_000,
      box8_other: 2_000,
      box8_pct_total: 25,
      box9a_pct_total: 50,
      box7_distribution_code: DistributionCode.CodeA,
      ts: TS.T,
      exclude_4972: true,
    }],
    form4972: {
      elections: [{
        source_document_references: ["shared-annuity-4972"],
        born_before_1936: true,
        entire_balance_distributed: true,
        rolled_over_any: false,
        beneficiary_distribution: false,
        participant_five_year_member: true,
        prior_election_after_1986: false,
        elect_10yr_averaging: true,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(printed(result).line8, 40_000);
  assertEquals(printed(result).line11, 8_000);
  assertEquals(printed(result).line29, 2_365);
  assertEquals(result.pending.f1040?.form4972_tax, 2_365);
});
