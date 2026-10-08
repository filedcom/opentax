import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { DistributionCode } from "../../../../nodes/inputs/f1099r/index.ts";
import {
  form4972 as form4972Node,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form4972/index.ts";
import { buildIRS4972 } from "../../../mef/forms/retirement/f4972.ts";
import { projectedFields } from "../../../pdf/forms/retirement/f4972.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function partialNuaEstatePartIIICase() {
  const election = inputSchema.parse({
    recipient: "T",
    born_before_1936: true,
    entire_balance_distributed: true,
    rolled_over_any: false,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    lump_sum_amount: 20_000,
    box6_nua: 4_000,
    elect_include_nua: true,
    recipient_share_pct: 50,
    federal_estate_tax: 2_000,
    partial_estate_tax_source: {
      administrator_statement_reference:
        "estate administrator NUA allocation 2025",
      estate_tax_return_reference: "filed estate Form 706 NUA tax workpaper",
      full_distribution_taxable_amount: 48_000,
      full_distribution_federal_estate_tax: 2_000,
      recipient_allocated_federal_estate_tax: 1_000,
    },
    elect_capital_gain: false,
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
        box6_nua: 4_000,
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: "T" as const,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: fields.line30 },
  };
  return { election, fields, pending };
}

Deno.test("Form 4972 partial NUA/estate Part III grosses up NUA and prorates final tax", () => {
  const { fields, pending } = partialNuaEstatePartIIICase();
  assertEquals(fields.line6, undefined);
  assertEquals(fields.line8, 48_000);
  assertEquals(fields.line8_nua_included, 8_000);
  assertEquals(fields.line18, 2_000);
  assertEquals(fields.line30, fields.line29);
  const xml = buildIRS4972(fields, { filer, pending });
  assertStringIncludes(xml, 'netUnrealizedAppreciationAmt="8000"');
  assertStringIncludes(
    xml,
    "<LumpDistribFederalEstateTaxAmt>2000</LumpDistribFederalEstateTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const pdf = projectedFields(fields, pending);
  assertEquals(pdf?.line8, 48_000);
  assertEquals(pdf?.line18, 2_000);
  assertEquals(pdf?.line29, fields.line29);
});

Deno.test("Form 4972 partial NUA/estate Part III rejects source and final tax changes", () => {
  const { election, fields, pending } = partialNuaEstatePartIIICase();
  assertThrows(() =>
    form4972Node.compute(
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
    projectedFields(fields, {
      ...pending,
      f1040: { form4972_tax: (fields.line30 as number) + 1 },
    })
  );
});
