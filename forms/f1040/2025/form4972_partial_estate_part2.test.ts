import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import {
  form4972 as form4972Node,
  inputSchema,
} from "../nodes/intermediate/forms/form4972/index.ts";
import { form4972 } from "./mef/forms/f4972.ts";
import { form4972Pdf } from "./pdf/forms/f4972.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function partialEstatePartIICase() {
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
    recipient_share_pct: 50,
    federal_estate_tax: 2_000,
    partial_estate_tax_source: {
      administrator_statement_reference: "estate administrator allocation 2025",
      estate_tax_return_reference: "filed estate Form 706 tax workpaper",
      full_distribution_taxable_amount: 40_000,
      full_distribution_federal_estate_tax: 2_000,
      recipient_allocated_federal_estate_tax: 1_000,
    },
    elect_capital_gain: true,
    elect_10yr_averaging: false,
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
        payer_name: "Qualified Plan",
        payer_ein: "123456789",
        box1_gross_distribution: 20_000,
        box2a_taxable_amount: 20_000,
        box3_capital_gain: 4_000,
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: "T" as const,
        exclude_4972: true,
      }],
    },
    f1040: {
      form4972_tax: 760,
      line5b_pension_taxable: 16_000,
    },
  };
  return { election, outputs, fields, pending };
}

Deno.test("Form 4972 partial beneficiary Part II allocates estate tax to capital and ordinary shares", () => {
  const { outputs, fields, pending } = partialEstatePartIICase();
  assertEquals(fields.line6, 3_800);
  assertEquals(fields.line7, 760);
  assertEquals(fields.line8, undefined);
  assertEquals(
    outputs.find((row) => row.nodeType === "schedule_a")?.fields
      .line_16_other_deductions,
    800,
  );
  assertEquals(
    outputs.find((row) => row.nodeType === "f1040")?.fields
      .line5b_form4972_ordinary,
    16_000,
  );
  const xml = form4972.build(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>3800</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<CapitalGainTimesElectionPctAmt>760</CapitalGainTimesElectionPctAmt>",
  );
  assertEquals(xml.includes("LumpSumDistriMultRecipientsCd"), false);
  const pdf = form4972Pdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line6, 3_800);
  assertEquals(pdf?.line7, 760);
});

Deno.test("Form 4972 partial estate Part II rejects changed allocation, source share and return tax", () => {
  const { election, fields, pending } = partialEstatePartIICase();
  assertThrows(() =>
    form4972Node.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        ...election,
        partial_estate_tax_source: {
          ...election.partial_estate_tax_source!,
          recipient_allocated_federal_estate_tax: 999,
        },
      }),
    )
  );
  assertThrows(() =>
    form4972.build(fields, {
      filer,
      pending: {
        ...pending,
        f1099r: {
          f1099rs: [{ ...pending.f1099r.f1099rs[0], box9a_pct_total: 40 }],
        },
      },
    })
  );
  assertThrows(() =>
    form4972Pdf.projectFields?.(fields, {
      ...pending,
      f1040: { ...pending.f1040, form4972_tax: 761 },
    })
  );
});
