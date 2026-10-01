import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972 as form4972Node,
  inputSchema,
} from "../nodes/intermediate/forms/form4972/index.ts";
import { buildIRS4972 } from "./mef/forms/f4972.ts";
import { form4972 as mef } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";
import { projectedFields } from "./pdf/forms/f4972.ts";
import { registry } from "./registry.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function partialNuaDeathCase() {
  const election = inputSchema.parse({
    recipient: "T",
    born_before_1936: true,
    entire_balance_distributed: true,
    rolled_over_any: false,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    participant_died_before_1996_08_21: true,
    prior_beneficiary_election_after_1986: false,
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    box6_nua: 4_000,
    elect_include_nua: true,
    recipient_share_pct: 50,
    death_benefit_exclusion: 5_000,
    death_benefit_recipient_allocated_amount: 2_500,
    death_benefit_exclusion_source_reference:
      "plan administrator death-benefit allocation 2025",
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  const outputs = form4972Node.compute(
    { taxYear: 2025, formType: "f1040" },
    election,
  ).outputs;
  const fields = outputs.find((row) => row.nodeType === "form4972")!.fields;
  const pending = {
    general: {
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
    },
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Stock Bonus Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 24_000,
        box2a_taxable_amount: 20_000,
        box3_capital_gain: 4_000,
        box6_nua: 4_000,
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: "T" as const,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: fields.line30 },
  };
  return { election, fields, outputs, pending };
}

Deno.test("Form 4972 partial NUA/death worksheets reach Form 1040, native and PDF", () => {
  const { fields, outputs, pending } = partialNuaDeathCase();
  // NUA capital share: 4,000 / 20,000 × 4,000 = 800.
  // Death worksheet capital share: 2,500 × 4,800 / 24,000 = 500.
  assertEquals(fields.line6_nua_capital_gain, 800);
  assertEquals(fields.line6, 4_300);
  assertEquals(fields.line7, 860);
  assertEquals(fields.line8, 38_400);
  assertEquals(fields.line8_nua_included, 6_400);
  assertEquals(fields.line9, 4_000);
  assertEquals(fields.line10, 34_400);
  assertEquals(fields.line30, Number(fields.line7) + Number(fields.line29));
  assertEquals(
    outputs.find((row) => row.nodeType === "income_tax_calculation")?.fields
      .form4972_tax,
    fields.line30,
  );
  const xml = buildIRS4972(fields, { filer, pending });
  assertStringIncludes(xml, ">4300</CapitalGainElectionAmt>");
  assertStringIncludes(
    xml,
    "<LumpSumDistriDeathBnftExclAmt>4000</LumpSumDistriDeathBnftExclAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const pdf = projectedFields(fields, pending);
  assertEquals(pdf?.line6, 4_300);
  assertEquals(pdf?.line8, 38_400);
  assertEquals(pdf?.line9, 4_000);
  assertEquals(pdf?.line30, fields.line30);
});

Deno.test("Form 4972 partial NUA/death source copy and election join on the finalized return", () => {
  const { election, pending } = partialNuaDeathCase();
  const source = pending.f1099r.f1099rs[0];
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
      taxpayer_dob: "1930-01-01",
    },
    f1099r: [{
      ...source,
      source_document_reference: "1099-R-beneficiary-2025",
    }],
    form4972: {
      elections: [{
        source_document_references: ["1099-R-beneficiary-2025"],
        born_before_1936: election.born_before_1936,
        entire_balance_distributed: election.entire_balance_distributed,
        rolled_over_any: election.rolled_over_any,
        beneficiary_distribution: election.beneficiary_distribution,
        participant_five_year_member: election.participant_five_year_member,
        participant_died_before_1996_08_21:
          election.participant_died_before_1996_08_21,
        prior_beneficiary_election_after_1986:
          election.prior_beneficiary_election_after_1986,
        elect_include_nua: election.elect_include_nua,
        death_benefit_exclusion: election.death_benefit_exclusion,
        death_benefit_recipient_allocated_amount:
          election.death_benefit_recipient_allocated_amount,
        death_benefit_exclusion_source_reference:
          election.death_benefit_exclusion_source_reference,
        elect_capital_gain: election.elect_capital_gain,
        elect_10yr_averaging: election.elect_10yr_averaging,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const finalized = result.pending;
  const fields = (finalized.form4972?.forms as Record<string, unknown>[])[0];
  assertEquals(finalized.f1040?.form4972_tax, fields.line30);
  assertEquals(finalized.f1040?.line5b_pension_taxable ?? 0, 0);
  assertStringIncludes(
    mef.build(finalized.form4972!, { filer, pending: finalized })[0],
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  assertEquals(
    form4972Pdf.instances?.(finalized.form4972!, filer, finalized)?.[0].line9,
    4_000,
  );
});

Deno.test("Form 4972 partial NUA/death rejects altered allocation, source and return tax", () => {
  const { election, fields, pending } = partialNuaDeathCase();
  assertThrows(() =>
    form4972Node.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        ...election,
        death_benefit_recipient_allocated_amount: 2_000,
      }),
    )
  );
  assertThrows(() =>
    buildIRS4972(fields, {
      filer,
      pending: {
        ...pending,
        f1099r: {
          f1099rs: [{ ...pending.f1099r.f1099rs[0], box6_nua: 3_000 }],
        },
      },
    })
  );
  assertThrows(() =>
    buildIRS4972(fields, {
      filer,
      pending: {
        ...pending,
        f1099r: {
          f1099rs: [{
            ...pending.f1099r.f1099rs[0],
            box1_gross_distribution: 23_000,
          }],
        },
      },
    })
  );
  assertThrows(() => projectedFields({ ...fields, line9: 3_500 }, pending));
  assertThrows(() =>
    projectedFields(fields, {
      ...pending,
      f1040: { form4972_tax: Number(fields.line30) + 1 },
    })
  );
});
