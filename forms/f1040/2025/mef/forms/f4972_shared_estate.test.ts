import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { DistributionCode } from "../../../nodes/inputs/f1099r/index.ts";
import {
  form4972 as node,
  inputSchema,
} from "../../../nodes/intermediate/forms/form4972/index.ts";
import { TS } from "../../../nodes/types.ts";
import { form4972Pdf } from "../../pdf/forms/f4972.ts";
import { form4972 as mef } from "./f4972.ts";

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
  const xml = mef.build(fields, { filer, pending: allPending });
  assertStringIncludes(
    xml,
    "<LumpDistribFederalEstateTaxAmt>2000</LumpDistribFederalEstateTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistriMultRecipientsCd>MRD</LumpSumDistriMultRecipientsCd>",
  );
  const pdf = form4972Pdf.projectFields?.(fields, allPending);
  assertEquals(pdf?.line18, 2_000);
  assertEquals(pdf?.line29, 1_955);
});

Deno.test("Form 4972 shared-beneficiary estate tax rejects altered lines and final tax", () => {
  const fields = calculated();
  const allPending = pending(fields.line30 as number);
  assertThrows(
    () =>
      mef.build({ ...fields, line18: 1_000 }, { filer, pending: allPending }),
    Error,
    "partial-share lines differ",
  );
  assertThrows(
    () => form4972Pdf.projectFields?.({ ...fields, line29: 1_000 }, allPending),
    Error,
    "partial-share lines differ",
  );
  assertThrows(
    () => mef.build(fields, { filer, pending: pending(1_954) }),
    Error,
    "partial-share tax differs",
  );
});
