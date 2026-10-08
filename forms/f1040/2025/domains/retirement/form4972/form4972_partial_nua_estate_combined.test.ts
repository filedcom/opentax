import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { DistributionCode } from "../../../../nodes/inputs/f1099r/index.ts";
import {
  form4972 as calculator,
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

function combinedCase() {
  const election = inputSchema.parse({
    recipient: "T",
    born_before_1936: true,
    entire_balance_distributed: true,
    rolled_over_any: false,
    beneficiary_distribution: true,
    participant_five_year_member: false,
    prior_beneficiary_election_after_1986: false,
    lump_sum_amount: 20_000,
    capital_gain_amount: 4_000,
    box6_nua: 4_000,
    elect_include_nua: true,
    recipient_share_pct: 50,
    federal_estate_tax: 2_000,
    partial_estate_tax_source: {
      administrator_statement_reference: "estate administrator NUA allocation",
      estate_tax_return_reference: "filed estate Form 706 tax workpaper",
      full_distribution_taxable_amount: 48_000,
      full_distribution_federal_estate_tax: 2_000,
      recipient_allocated_federal_estate_tax: 1_000,
    },
    elect_capital_gain: true,
    elect_10yr_averaging: true,
  });
  const outputs = calculator.compute(
    { taxYear: 2025, formType: "f1040" },
    election,
  ).outputs;
  const fields = outputs.find((row) => row.nodeType === "form4972")!.fields;
  const specialTax = outputs.find((row) =>
    row.nodeType === "income_tax_calculation"
  )?.fields.form4972_tax;
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
    f1040: { form4972_tax: specialTax },
  };
  return { election, outputs, fields, pending };
}

Deno.test("partial beneficiary NUA and estate tax use recipient capital tax and full Part III estate tax", () => {
  const { outputs, fields, pending } = combinedCase();
  assertEquals(fields.line6_nua_capital_gain, 800);
  assertEquals(fields.line6, 4_600);
  assertEquals(fields.line7, 920);
  assertEquals(fields.line8, 38_400);
  assertEquals(fields.line8_nua_included, 6_400);
  assertEquals(fields.line18, 1_600);
  assertEquals(fields.line30, Number(fields.line7) + Number(fields.line29));
  assertEquals(
    outputs.find((row) => row.nodeType === "income_tax_calculation")?.fields
      .form4972_tax,
    fields.line30,
  );
  const xml = buildIRS4972(fields, { filer, pending });
  assertStringIncludes(xml, "<CapitalGainElectionAmt");
  assertStringIncludes(xml, ">4600</CapitalGainElectionAmt>");
  assertStringIncludes(
    xml,
    "<LumpDistribFederalEstateTaxAmt>1600</LumpDistribFederalEstateTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const printed = projectedFields(fields, pending);
  assertEquals(printed?.line6, 4_600);
  assertEquals(printed?.line18, 1_600);
  assertEquals(printed?.line30, fields.line30);
});

Deno.test("partial beneficiary combined NUA/estate election rejects changed allocation, source, or tax", () => {
  const { election, fields, pending } = combinedCase();
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
  for (
    const changed of [
      {
        ...pending,
        f1099r: {
          f1099rs: [{ ...pending.f1099r.f1099rs[0], box6_nua: 3_000 }],
        },
      },
      { ...pending, f1040: { form4972_tax: Number(fields.line30) + 1 } },
    ]
  ) {
    assertThrows(() => buildIRS4972(fields, { filer, pending: changed }));
    assertThrows(() => projectedFields(fields, changed));
  }
  assertThrows(() =>
    buildIRS4972({ ...fields, line6: 4_400 }, { filer, pending })
  );
  assertThrows(() => projectedFields({ ...fields, line18: 1_700 }, pending));
});
