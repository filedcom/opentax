import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildIRS4972 } from "./mef/forms/f4972.ts";
import { projectedFields } from "./pdf/forms/f4972.ts";
import { type FilerIdentity, FilingStatus } from "./mef/types.ts";
import { DistributionCode } from "../nodes/inputs/f1099r/index.ts";
import { form4972 } from "../nodes/intermediate/forms/form4972/index.ts";
import { TS } from "../nodes/types.ts";
import { reconcileForm4972FullShare } from "./form4972_full_share_reconciliation.ts";

const plan = {
  participant_name: "Ada Taxpayer",
  participant_ssn: "123456789",
  plan_reference: "Plan-2025-A",
  full_balance_statement_reference: "Administrator final-balance statement",
  all_qualified_distributions_included: true as const,
};
const sources = [30_000, 40_000].map((amount, index) => ({
  payer_name: "Plan trustee",
  payer_ein: "12-3456789",
  box1_gross_distribution: amount,
  box2a_taxable_amount: amount,
  box7_distribution_code: DistributionCode.CodeA,
  box9a_pct_total: 100,
  ts: TS.T,
  exclude_4972: true,
  source_document_reference: `1099-R-${index + 1}`,
  form4972_plan: plan,
}));
const election = {
  recipient: TS.T,
  lump_sum_amount: 70_000,
  multiple_1099r: {
    ...plan,
    source_document_references: ["1099-R-1", "1099-R-2"] as [string, string],
  },
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  alternate_payee_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
  elect_10yr_averaging: true,
};

Deno.test("Form 4972 two-source lines and Form 1040 tax reconcile", () => {
  const outputs = form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    election,
  ).outputs;
  const fields = outputs.find((output) => output.nodeType === "form4972")!
    .fields;
  const tax =
    outputs.find((output) => output.nodeType === "income_tax_calculation")!
      .fields.form4972_tax;
  const pending = {
    f1099r: { f1099rs: sources },
    f1040: { form4972_tax: tax },
  };
  const owner = { name: "Ada Taxpayer", ssn: "123456789" };
  reconcileForm4972FullShare(fields, pending, owner);
  const filer: FilerIdentity = {
    primarySSN: "123456789",
    fullName: "Ada Taxpayer",
    nameLine1: "TAXPAYER ADA",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  };
  const xml = buildIRS4972(fields, { filer, pending });
  assertStringIncludes(xml, "<SSN>123456789</SSN>");
  const projected = projectedFields({ ...fields }, {
    ...pending,
    general: {
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
    },
  });
  assertEquals(projected?.line30, fields.line30);
  assertThrows(
    () =>
      reconcileForm4972FullShare(fields, {
        ...pending,
        f1099r: {
          f1099rs: [sources[0], {
            ...sources[1],
            box2a_taxable_amount: 39_999,
          }],
        },
      }, owner),
    Error,
    "summed boxes 2a",
  );
  assertThrows(
    () => reconcileForm4972FullShare({ ...fields, line30: 1 }, pending, owner),
    Error,
    "calculated lines",
  );
  assertThrows(
    () =>
      reconcileForm4972FullShare(fields, pending, {
        ...owner,
        ssn: "987654321",
      }),
    Error,
    "matching owner",
  );
});

Deno.test("Form 4972 combines two box 3 gains under Part II and Part III", () => {
  const capitalSources = [
    { ...sources[0], box3_capital_gain: 5_000 },
    { ...sources[1], box3_capital_gain: 7_000 },
  ];
  const capitalElection = {
    ...election,
    elect_capital_gain: true,
    capital_gain_amount: 12_000,
  };
  const outputs = form4972.compute(
    { taxYear: 2025, formType: "f1040" },
    capitalElection,
  ).outputs;
  const fields = outputs.find((output) => output.nodeType === "form4972")!
    .fields;
  const tax =
    outputs.find((output) => output.nodeType === "income_tax_calculation")!
      .fields.form4972_tax;
  const pending = {
    f1099r: { f1099rs: capitalSources },
    f1040: { form4972_tax: tax },
  };
  const owner = { name: "Ada Taxpayer", ssn: "123456789" };
  reconcileForm4972FullShare(fields, pending, owner);
  assertEquals(fields.line6, 12_000);
  assertEquals(fields.line7, 2_400);
  assertEquals(fields.line8, 58_000);
  const filer: FilerIdentity = {
    primarySSN: "123456789",
    fullName: "Ada Taxpayer",
    nameLine1: "TAXPAYER ADA",
    nameControl: "TAXP",
    filingStatus: FilingStatus.Single,
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  };
  const xml = buildIRS4972(fields, { filer, pending });
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>12000</CapitalGainElectionAmt>",
  );
  const projected = projectedFields({ ...fields }, {
    ...pending,
    general: {
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123456789",
    },
  });
  assertEquals(projected?.line6, 12_000);
  assertEquals(projected?.line30, fields.line30);
  assertThrows(
    () =>
      reconcileForm4972FullShare(fields, {
        ...pending,
        f1099r: {
          f1099rs: [capitalSources[0], {
            ...capitalSources[1],
            box3_capital_gain: 6_999,
          }],
        },
      }, owner),
    Error,
    "summed boxes 2a, 3, and 6",
  );
  assertThrows(
    () => reconcileForm4972FullShare({ ...fields, line7: 1 }, pending, owner),
    Error,
    "calculated lines",
  );
});
