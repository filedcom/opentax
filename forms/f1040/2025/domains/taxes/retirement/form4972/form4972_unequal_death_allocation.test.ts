import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { DistributionCode } from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import { form4972 as mef } from "../../../../mef/forms/taxes/retirement/f4972.ts";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { form4972Pdf } from "../../../../pdf/forms/taxes/retirement/f4972.ts";
import { registry } from "../../../../registry.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};
const allocation = {
  participant_ssn: "444556666",
  elected_recipient_ssn: "123456789",
  recipients: [
    { recipient_ssn: "123456789", share_pct: 25, excluded_amount: 1_250 },
    { recipient_ssn: "987654321", share_pct: 75, excluded_amount: 3_750 },
  ],
};
const source = {
  payer_name: "Qualified Plan",
  payer_ein: "123456789",
  recipient_ssn: "123456789",
  source_document_reference: "issued-1099r-25pct-2025",
  form4972_plan: {
    participant_name: "Pat Participant",
    participant_ssn: "444556666",
    plan_reference: "plan-2025",
    full_balance_statement_reference: "full-balance-2025",
    all_qualified_distributions_included: true,
  },
  box1_gross_distribution: 10_000,
  box2a_taxable_amount: 10_000,
  box3_capital_gain: 2_000,
  box7_distribution_code: DistributionCode.CodeA,
  box9a_pct_total: 25,
  ts: "T" as const,
  exclude_4972: true,
};
const election = {
  source_document_references: ["issued-1099r-25pct-2025"],
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: true,
  participant_five_year_member: false,
  participant_died_before_1996_08_21: true,
  prior_beneficiary_election_after_1986: false,
  death_benefit_exclusion: 5_000,
  death_benefit_recipient_allocated_amount: 1_250,
  death_benefit_exclusion_source_reference:
    "plan administrator participant-wide allocation 2025",
  death_benefit_allocation: allocation,
  elect_capital_gain: true,
  elect_10yr_averaging: true,
};

function finalized() {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
      taxpayer_dob: "1930-01-01",
    },
    f1099r: [source],
    form4972: { elections: [election] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  return result.pending;
}

Deno.test("Form 4972 unequal beneficiary share reconciles full exclusion to Form 1040, native, and PDF", () => {
  const pending = finalized();
  const form = (pending.form4972?.forms as Record<string, unknown>[])[0];
  assertEquals(form.line6, 1_750);
  assertEquals(form.line7, 350);
  assertEquals(form.line8, 32_000);
  assertEquals(form.line9, 4_000);
  assertEquals(pending.f1040?.form4972_tax, form.line30);
  assertEquals(pending.f1040?.line16_income_tax, form.line30);
  const xml = mef.build(pending.form4972!, { filer, pending })[0];
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>1750</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriDeathBnftExclAmt>4000</LumpSumDistriDeathBnftExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const pdf = form4972Pdf.instances?.(pending.form4972!, filer, pending);
  assertEquals(pdf?.[0].line6, 1_750);
  assertEquals(pdf?.[0].line9, 4_000);
  assertEquals(pdf?.[0].line30, form.line30);
});

Deno.test("Form 4972 unequal beneficiary allocation rejects schedule, box, identity, and return tampering", () => {
  const pending = finalized();
  const changed = (form4972: Record<string, unknown>) =>
    mef.build(form4972, { filer, pending: { ...pending, form4972 } });
  for (
    const allocationTamper of [
      { ...allocation, participant_ssn: "999887777" },
      { ...allocation, elected_recipient_ssn: "987654321" },
      {
        ...allocation,
        recipients: [
          allocation.recipients[0],
          { ...allocation.recipients[1], share_pct: 74 },
        ],
      },
      {
        ...allocation,
        recipients: [
          { ...allocation.recipients[0], excluded_amount: 1_000 },
          allocation.recipients[1],
        ],
      },
    ]
  ) {
    const form4972 = {
      ...pending.form4972,
      elections: [{ ...election, death_benefit_allocation: allocationTamper }],
    };
    assertThrows(() => changed(form4972));
  }
  for (
    const sourceTamper of [
      { recipient_ssn: "999887777" },
      { box9a_pct_total: 20 },
      {
        form4972_plan: {
          ...source.form4972_plan,
          participant_ssn: "999887777",
        },
      },
    ]
  ) {
    const altered = {
      ...pending,
      f1099r: { f1099rs: [{ ...source, ...sourceTamper }] },
    };
    assertThrows(() =>
      mef.build(pending.form4972!, { filer, pending: altered })
    );
    assertThrows(() =>
      form4972Pdf.instances?.(pending.form4972!, filer, altered)
    );
  }
  const altered = {
    ...pending,
    f1040: { ...pending.f1040, form4972_tax: 1 },
  };
  assertThrows(() => mef.build(pending.form4972!, { filer, pending: altered }));
  assertThrows(() =>
    form4972Pdf.instances?.(pending.form4972!, filer, altered)
  );
});
