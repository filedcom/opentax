import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972 as calculator,
  inputSchema,
} from "../nodes/intermediate/forms/form4972/index.ts";
import { buildIRS4972 } from "./mef/forms/f4972.ts";
import { projectedFields } from "./pdf/forms/f4972.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function partialAnnuityEstateCase() {
  const election = inputSchema.parse({
    recipient: "T",
    born_before_1936: true,
    entire_balance_distributed: true,
    rolled_over_any: false,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    lump_sum_amount: 20_000,
    recipient_share_pct: 50,
    annuity_actuarial_value: 3_000,
    annuity_share_pct: 25,
    federal_estate_tax: 2_000,
    partial_estate_tax_source: {
      administrator_statement_reference: "estate-administrator-annuity-2025",
      estate_tax_return_reference: "estate-706-annuity-workpaper-2025",
      full_distribution_taxable_amount: 40_000,
      full_distribution_federal_estate_tax: 2_000,
      recipient_allocated_federal_estate_tax: 1_000,
    },
    elect_capital_gain: false,
    elect_10yr_averaging: true,
  });
  const outputs = calculator.compute(
    { taxYear: 2025, formType: "f1040" },
    election,
  ).outputs;
  const fields = outputs.find((row) => row.nodeType === "form4972")!.fields;
  const tax = outputs.find((row) => row.nodeType === "income_tax_calculation")!
    .fields.form4972_tax;
  const pending = {
    general: {
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
    },
    f1099r: {
      f1099rs: [{
        payer_name: "Qualified Pension Plan",
        payer_ein: "123456789",
        recipient_ssn: "123456789",
        source_document_reference: "1099-R-partial-annuity-2025",
        form4972_plan: {
          participant_name: "Pat Participant",
          participant_ssn: "444556666",
          plan_reference: "pat-annuity-plan-2025",
          full_balance_statement_reference: "pat-annuity-balance-2025",
          all_qualified_distributions_included: true,
        },
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 20_000,
        box7_distribution_code: DistributionCode.CodeA,
        box8_other: 3_000,
        box8_pct_total: 25,
        box9a_pct_total: 50,
        ts: "T" as const,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: tax },
  };
  return { election, outputs, fields, pending };
}

Deno.test("partial beneficiary annuity and estate tax reconcile to Form 1040, native, and PDF", () => {
  const { fields, outputs, pending } = partialAnnuityEstateCase();
  assertEquals(fields.line8, 40_000);
  assertEquals(fields.line11, 12_000);
  assertEquals(fields.line18, 2_000);
  assertEquals(
    outputs.find((row) => row.nodeType === "income_tax_calculation")?.fields
      .form4972_tax,
    fields.line30,
  );
  const xml = buildIRS4972(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<AnnuityActuarialValueAmt>12000</AnnuityActuarialValueAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpDistribFederalEstateTaxAmt>2000</LumpDistribFederalEstateTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const pdf = projectedFields(fields, pending);
  assertEquals(pdf.line11, 12_000);
  assertEquals(pdf.line18, 2_000);
  assertEquals(pdf.line30, pending.f1040.form4972_tax);
});

Deno.test("partial annuity and estate route rejects source, allocation, form, and return drift", () => {
  const { election, fields, pending } = partialAnnuityEstateCase();
  assertThrows(() =>
    calculator.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        ...election,
        partial_estate_tax_source: {
          ...election.partial_estate_tax_source!,
          recipient_allocated_federal_estate_tax: 900,
        },
      }),
    )
  );
  assertThrows(() =>
    calculator.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        ...election,
        capital_gain_amount: 2_000,
        elect_capital_gain: true,
      }),
    )
  );
  assertThrows(() =>
    buildIRS4972(fields, {
      filer,
      pending: {
        ...pending,
        f1099r: {
          f1099rs: [{ ...pending.f1099r.f1099rs[0], box8_pct_total: 50 }],
        },
      },
    })
  );
  assertThrows(() => projectedFields({ ...fields, line18: 1_999 }, pending));
  assertThrows(() =>
    projectedFields(fields, {
      ...pending,
      f1040: { form4972_tax: (fields.line30 as number) + 1 },
    })
  );
});
