import { test } from "bun:test";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { DistributionCode } from "../../../../../nodes/inputs/income/retirement/f1099r/index.ts";
import {
  form4972,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/retirement/form4972/index.ts";
import { FilingStatus as ReturnStatus, TS } from "../../../../../nodes/types.ts";
import { buildIRS4972 } from "../../../../mef/forms/taxes/retirement/f4972.ts";
import { f1040_2026 } from "../../../../../2026/index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { assertForm4972AmtJoin } from "./form4972_amt_reconciliation.ts";
import { reconcileForm4972Collection } from "./form4972_collection_reconciliation.ts";
import { reconcileForm4972FullShare } from "./form4972_full_share_reconciliation.ts";
import { scheduleALine16EstateTax } from "../../../deductions/itemized/schedule-a/schedule_a_line16_estate_source.ts";
import {
  participantCollectionCases,
  participantCollectionInputs,
} from "./form4972_participant_collection.fixture.ts";

// Form 4972 (2026 draft) keeps the born-before-1936 test and the 1986 rate
// schedule, so the reconcilers recompute under the return's own year.
const ty2026 = { taxYear: 2026, formType: "f1040" } as const;

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

test("TY2026 two-source Form 4972 reconciles under the return's year", () => {
  const plan = {
    participant_name: "Ada Taxpayer",
    participant_ssn: "123456789",
    plan_reference: "Plan-A",
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
  const outputs = form4972.compute(ty2026, {
    recipient: TS.T,
    lump_sum_amount: 70_000,
    multiple_1099r: {
      ...plan,
      source_document_references: ["1099-R-1", "1099-R-2"] as [
        string,
        string,
      ],
    },
    born_before_1936: true,
    entire_balance_distributed: true,
    rolled_over_any: false,
    beneficiary_distribution: false,
    alternate_payee_distribution: false,
    participant_five_year_member: true,
    prior_election_after_1986: false,
    elect_10yr_averaging: true,
  }).outputs;
  const fields = outputs.find((row) => row.nodeType === "form4972")!.fields;
  const tax = outputs.find((row) => row.nodeType === "income_tax_calculation")!
    .fields.form4972_tax;
  const pending = { f1099r: { f1099rs: sources }, f1040: { form4972_tax: tax } };
  const owner = { name: "Ada Taxpayer", ssn: "123456789" };
  reconcileForm4972FullShare(fields, pending, owner, ty2026);
  assertThrows(() =>
    reconcileForm4972FullShare({ ...fields, line30: 1 }, pending, owner, ty2026)
  );
});

test("TY2026 partial estate Part II builds IRS4972 and Schedule A line 16", () => {
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
      administrator_statement_reference: "estate administrator allocation",
      estate_tax_return_reference: "filed estate Form 706 tax workpaper",
      full_distribution_taxable_amount: 40_000,
      full_distribution_federal_estate_tax: 2_000,
      recipient_allocated_federal_estate_tax: 1_000,
    },
    elect_capital_gain: true,
    elect_10yr_averaging: false,
  });
  const outputs = form4972.compute(ty2026, election).outputs;
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
    f1040: { form4972_tax: 760, line5b_pension_taxable: 16_000 },
  };
  const xml = buildIRS4972(fields, { filer, pending, taxYear: 2026 });
  assertStringIncludes(
    xml,
    "<CapitalGainTimesElectionPctAmt>760</CapitalGainTimesElectionPctAmt>",
  );
  assertThrows(() =>
    buildIRS4972(fields, {
      filer,
      pending: { ...pending, f1040: { ...pending.f1040, form4972_tax: 761 } },
      taxYear: 2026,
    })
  );
  const line16 = outputs.find((row) => row.nodeType === "schedule_a")!.fields
    .line_16_other_deductions;
  const estate = {
    ...pending,
    form4972: { forms: [fields] },
    schedule_a: { line_16_other_deductions: line16 },
    f1040: { ...pending.f1040, line12e_itemized_deductions: 30_000 },
    standard_deduction: { itemized_deductions: 30_000 },
  };
  assertEquals(scheduleALine16EstateTax(estate, line16, ty2026), 800);
});

test("TY2026 Form 4972 AMT join uses the 50% exemption phase-out", () => {
  // Rev. Proc. 2025-32 §4.10 and P.L. 119-21 §70107(b): $90,100 single
  // exemption phased out at 50% above $500,000.
  const filed = (exemption: number) => ({
    f1040: {
      filing_status: ReturnStatus.Single,
      form4972_tax: 500,
      line16_income_tax: 4_500,
    },
    form6251: {
      filing_status: ReturnStatus.Single,
      amti: 600_000,
      exemption,
      taxable_excess: 600_000 - exemption,
      line11_amt: 0,
      form4972_tax: 500,
      regular_tax: 3_900,
      schedule2_line1z_tax: 100,
      schedule3_line1_foreign_tax_credit: 200,
      form8978_negative_line14: 0,
    },
  });
  assertForm4972AmtJoin(500, filed(40_100), ty2026);
  assertThrows(() => assertForm4972AmtJoin(500, filed(65_100), ty2026));
});

test("TY2026 participant collection recomputes each participant under TY2026", () => {
  const id = participantCollectionCases[0];
  const result = f1040_2026.executeReturn(participantCollectionInputs(id));
  assertEquals(result.diagnostics, [], id);
  const pending = normalizeAllPending(result.pending);
  const scoped = reconcileForm4972Collection(
    pending.form4972,
    pending,
    extractFilerIdentity(pending.f1040)!,
    ty2026,
  );
  assertEquals(scoped.length > 0 && scoped.every((entry) => entry.tax > 0), true);
});
