import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { prepareForm3800DocumentParts } from "../../../../mef/forms/credits/f3800/f3800.ts";
import { testFiler } from "../../../../mef/execution/test-filer.ts";
import { form3800PartIIIFields } from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";

const statement = {
  source_document_reference: "k1-trust-2025",
  statement_reference: "trust-solar-stmt",
  reviewed_on: "2026-02-01",
  reviewer_reference: "review-3468",
  issuer_pdf_sha256: "a".repeat(64),
  issuer_ein: "123456789",
  beneficiary_ssn: "123456789",
  facility_type: "solar",
  facility_address: {
    line1: "1 Sun St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  construction_started_on: "2024-06-01",
  placed_in_service_on: "2025-03-01",
  net_output_kw_ac: 500,
  beneficiary_allocated_qualified_basis: 10_000,
  beneficiary_allocated_credit: 3_000,
  beneficiary_nonpassive_activity_reviewed: true,
  generation_emissions_rate_zero: true,
  no_prior_or_current_incompatible_section38_credit: true,
  no_interconnection_property: true,
  no_domestic_content_or_energy_community_bonus: true,
  no_subsidized_financing_or_private_activity_bonds: true,
  no_elective_payment_or_transfer: true,
  no_cooperative_credit: true,
  not_section48d_lessee_confirmed: true,
};
const entry = {
  source_type: "trust" as const,
  source_ein: "123456789",
  source_document_reference: "k1-trust-2025",
  source_statement_reference: "trust-solar-stmt",
  credit_amount: 3_000,
  subject_to_passive_activity_limit: false as const,
};
const taxContext = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 40_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 20_000,
  standardCredit: 3_000,
  specifiedCredit: 0,
  standardCarryforward: 0,
  specifiedCarryforward: 0,
};
const f3800 = {
  f3468_trust_part_v_credit_entries: [entry],
  tax_context: taxContext,
  allowed_credit: 3_000,
};
const pending = {
  f3800,
  f1040: { line16_income_tax: 40_000, line20_nonrefundable_credits: 3_000 },
  schedule3: { line6a_total: 3_000, line7_total: 3_000, line8_total: 3_000 },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  k1_trust: {
    k1_trusts: [{
      estate_trust_name: "Solar Trust",
      entity_type: "trust",
      estate_trust_ein: "123456789",
      source_document_reference: "k1-trust-2025",
      beneficiary_ssn: "123456789",
      box14_code_m_clean_electricity_investment_information: true,
      box14_code_m_form3468_part_v_statement: statement,
    }],
  },
  f3468: {
    trust_part_v_source_reviews: [statement],
    trust_part_v_claims: [{
      source_type: "trust",
      source_ein: "123456789",
      source_document_reference: "k1-trust-2025",
      statement,
    }],
  },
};

Deno.test("Form 3800 PDF binds line 1v and Part V to reviewed trust Form 3468", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: {
      form6251: ["IRS6251_1"],
      f3468: ["IRS3468_1"],
    },
  });
  if (!prepared) throw new Error("Expected prepared Form 3800 line 1v");
  const [fields] = form3800Pdf.instances!(
    f3800,
    testFiler(),
    pending,
    prepared,
  );
  assertEquals(fields[form3800PartIIIFields("1v").c], "123456789");
  assertEquals(fields[form3800PartIIIFields("1v").e], 3_000);
  assertThrows(
    () =>
      form3800Pdf.instances!(
        {
          ...f3800,
          f3468_trust_part_v_credit_entries: [{
            ...entry,
            credit_amount: 3_001,
          }],
        },
        testFiler(),
        pending,
        prepared,
      ),
    Error,
    "line 1v differs",
  );
  assertThrows(() =>
    form3800Pdf.instances!(f3800, testFiler(), {
      ...pending,
      f3468: {
        ...pending.f3468,
        trust_part_v_source_reviews: [{
          ...statement,
          beneficiary_allocated_credit: 2_999,
        }],
      },
    }, prepared), Error);
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), pending, {
        ...prepared,
        currentDetails: prepared.currentDetails.map((detail) =>
          detail.line === "1v" ? { ...detail, credit: 2_999 } : detail
        ),
      }),
    Error,
    "line 1v differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), pending, {
        ...prepared,
        currentRows: prepared.currentRows.map((row) =>
          row.line === "1v"
            ? {
              ...row,
              metadata: { ...row.metadata, entity: { ein: "987654321" } },
            }
            : row
        ),
      }),
    Error,
    "line 1v differs",
  );
});
