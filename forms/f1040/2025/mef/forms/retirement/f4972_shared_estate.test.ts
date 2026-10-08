import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../mef/header.ts";
import { DistributionCode } from "../../../../nodes/inputs/f1099r/index.ts";
import {
  form4972 as node,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form4972/index.ts";
import { TS } from "../../../../nodes/types.ts";
import { projectedFields } from "../../../pdf/forms/retirement/f4972.ts";
import { buildIRS4972 } from "./f4972.ts";

const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
};

const source = {
  recipient: TS.T,
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: true,
  participant_five_year_member: false,
  prior_beneficiary_election_after_1986: false,
  lump_sum_amount: 20_000,
  recipient_share_pct: 50,
  federal_estate_tax: 2_000,
  partial_estate_tax_source: {
    administrator_statement_reference: "estate administrator 2025 allocation",
    estate_tax_return_reference: "filed estate Form 706 tax workpaper",
    full_distribution_taxable_amount: 40_000,
    full_distribution_federal_estate_tax: 2_000,
    recipient_allocated_federal_estate_tax: 1_000,
  },
  elect_10yr_averaging: true,
};

function calculated() {
  return node.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(source),
  ).outputs[0].fields;
}

function pending(tax: number) {
  return {
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
        box7_distribution_code: DistributionCode.CodeA,
        box9a_pct_total: 50,
        ts: TS.T,
        exclude_4972: true,
      }],
    },
    f1040: { form4972_tax: tax },
  };
}

Deno.test("Form 4972 shared-beneficiary estate tax reaches native line 18 and PDF", () => {
  const fields = calculated();
  const allPending = pending(fields.line30 as number);
  const xml = buildIRS4972(fields, { filer, pending: allPending });
  assertStringIncludes(
    xml,
    "<LumpDistribFederalEstateTaxAmt>2000</LumpDistribFederalEstateTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const pdf = projectedFields(fields, allPending);
  assertEquals(pdf?.line18, 2_000);
  assertEquals(pdf?.line29, 1_955);
});

Deno.test("Form 4972 shared-beneficiary estate tax rejects altered lines and final tax", () => {
  const fields = calculated();
  const allPending = pending(fields.line30 as number);
  assertThrows(
    () =>
      buildIRS4972({ ...fields, line18: 1_000 }, {
        filer,
        pending: allPending,
      }),
    Error,
    "partial-share lines differ",
  );
  assertThrows(
    () => projectedFields({ ...fields, line29: 1_000 }, allPending),
    Error,
    "partial-share lines differ",
  );
  assertThrows(
    () => buildIRS4972(fields, { filer, pending: pending(1_954) }),
    Error,
    "partial-share tax differs",
  );
});
