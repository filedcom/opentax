/**
 * XSD Validation Tests — validates generated MeF XML against the IRS
 * 2025v5.4 Return1040.xsd schema using xmllint as a subprocess.
 *
 * Purpose: catch namespace errors, element ordering violations, and type
 * mismatches before IRS submission. All scenarios must produce XML that
 * xmllint accepts with exit code 0.
 */

import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { registry } from "../registry.ts";
import { buildMefBundle, buildMefXml } from "./builder.ts";
import type { MefFormsPending } from "./types.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { EnergyType } from "../../nodes/inputs/f8835/index.ts";
import { fuelClaimSchema } from "../../nodes/inputs/f4136/index.ts";
import {
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../nodes/intermediate/forms/form8582cr/index.ts";
import { TargetGroup } from "../../nodes/inputs/f5884/index.ts";
import { calculateForm8874Recapture } from "../../nodes/inputs/f8874/recapture_node.ts";
import {
  calculateForm8396,
  CertifiedInterestDocumentKind,
  form8396SourceSchema,
  QualifiedHomeState,
} from "../../nodes/intermediate/forms/form8396/calculation.ts";
import { BondType } from "../../nodes/inputs/f8912/index.ts";
import { SS_WAGE_BASE_2025 } from "../../nodes/config/2025.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import {
  SCENARIO_1040_01_FACTS,
  SCENARIO_1040_02_FACTS,
  SCENARIO_1040_13_FACTS,
} from "../../e2e/ats/ty2025_cases.ts";

// ── Constants ────────────────────────────────────────────────────────────────

const XSD_PATH = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

// Skip XSD tests when the IRS schema files are not present locally.
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // .research/docs not checked in; skip on machines without the IRS schema bundle
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function filedPrior8582(activityId: string, amount: number) {
  return {
    tax_year: 2024,
    activity_id: activityId,
    filed_part_vii_column_c: amount,
    source_document_reference: `2024 filed Form 8582 Part VII, ${activityId}`,
  };
}

const plan = buildExecutionPlan(registry);
const nonApplicableBelowFpl = {
  basis: "not_applicable",
  exception_routes_reviewed: true,
  no_one_can_claim_taxpayer: true,
  all_covered_individuals_lawfully_present: true,
  no_shared_policy: true,
  no_self_employed_health_insurance_deduction: true,
  no_alternative_marriage_calculation: true,
} as const;

function noAptcSlcspDeterminations(premiums: number[], slcsps: number[]) {
  return premiums.flatMap((premium, index) =>
    premium > 0
      ? [{
        month: index + 1,
        basis: "no_aptc",
        corrected_slcsp: slcsps[index],
        determination_source: "marketplace_tool",
      }]
      : []
  );
}

function noAptcPaymentEvidence(premiums: number[], slcsps: number[]) {
  return premiums.flatMap((premium, index) =>
    premium > 0
      ? [{
        month: index + 1,
        marketplace_slcsp: slcsps[index],
        marketplace_method: "marketplace_tool",
        marketplace_reference: `Marketplace determination ${index + 1}`,
        marketplace_determined_on: "2026-02-01",
        marketplace_record_sha256: "a".repeat(64),
        premium_paid: premium,
        premium_paid_in_full_on: "2026-04-01",
        premium_payment_reference: `Premium payment ${index + 1}`,
        premium_payment_record_sha256: "b".repeat(64),
      }]
      : []
  );
}

Deno.test({
  name: "XSD: TY2025 Schedule 2 tax lines retain schema order",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line23_other_taxes: 1_400 },
    schedule2: {
      uncollected_fica: 100,
      line17b_mortgage_subsidy_recapture: 1_000,
      line17c_hsa_penalty: 300,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<MortgSbsdyRecaptureTaxAmt>1000</MortgSbsdyRecaptureTaxAmt>",
  );
  await validateXsd(xml, "TY2025 Schedule 2 lines 17b and 17c");
});

Deno.test({
  name: "XSD: New Markets recapture source reaches Schedule 2 NMCR",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = {
    recaptures: [{
      notice_reference: "2025 CDE notice",
      investment_reference: "2022 QEI designation",
      cde_name: "Community Development Entity",
      cde_ein: "123456789",
      notice_taxpayer_tin: "111223333",
      initial_investment_date: "2022-06-01",
      qualified_equity_investment_amount: 100_000,
      notice_credit_amount: 25_000,
      recapture_event_date: "2025-07-01",
      recapture_event: "cde_redeemed_investment",
      prior_years: [{
        tax_year: 2024,
        original_return_due_date: "2025-04-15",
        section38_credit_allowed_as_filed: 3_000,
        section38_credit_allowed_without_this_qei: 0,
        recomputation_reference: "2024 Form 3800 recomputation",
      }],
      carryover_ledger_reference: "2024 QEI carryover ledger",
      carryover_vintages: [],
    }],
  } as const;
  const nmcr = calculateForm8874Recapture({
    recaptures: source.recaptures.map((recapture) => ({
      ...recapture,
      prior_years: [...recapture.prior_years],
      carryover_vintages: [...recapture.carryover_vintages],
    })),
  });
  const xml = buildMefXml({
    f1040: { line23_other_taxes: nmcr },
    schedule2: { line17a_new_markets_credit_recapture: nmcr },
    f8874_recapture: source,
  } as MefFormsPending, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<OtherCreditsCd>NMCR</OtherCreditsCd>");
  await validateXsd(xml, "TY2025 Schedule 2 NMCR");
});

Deno.test({
  name: "XSD: Form 8611 building recapture links to Schedule 2 line 16",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line23_other_taxes: 9_090 },
    schedule2: { line16_lihtc_recapture: 9_090 },
    f8611: {
      f8611s: [{
        source_document_reference: "2025 Building A recapture worksheet",
        recapture_year: 2025,
        building_bin: "TX1234567",
        building_us_address: {
          line1: "10 Housing Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        placed_in_service_date: "2017-08-01",
        financed_with_tax_exempt_bonds: false,
        calculation: {
          source_type: "own_credit",
          recapture_event_type: "DISPOSITION",
          credit_period_start_year: 2017,
          recapture_required_after_exceptions: true,
          line1_prior_form8586_credits: 30_000,
          line2_worksheets: [],
          line6_qualified_basis_decrease_ratio: 1,
          line7_prior_accelerated_recapture_amount: 0,
          line11_interest_from_prior_years: 100,
          prior_unused_credits: 1_000,
          unused_additions_to_qualified_basis_credits: 0,
        },
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS8611 ");
  assertStringIncludes(
    xml,
    'referenceDocumentName="IRS8611">9090</RecaptureTaxAmt>',
  );
  await validateXsd(xml, "Form 8611 building recapture and Schedule 2");
});

Deno.test("Form 8611 source reaches Schedule 2, Form 1040, and its MeF attachment", () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f8611: [{
      source_document_reference: "2025 Building A recapture worksheet",
      recapture_year: 2025,
      building_bin: "TX1234567",
      building_us_address: {
        line1: "10 Housing Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      placed_in_service_date: "2017-08-01",
      financed_with_tax_exempt_bonds: false,
      calculation: {
        source_type: "own_credit",
        recapture_event_type: "DISPOSITION",
        credit_period_start_year: 2017,
        recapture_required_after_exceptions: true,
        line1_prior_form8586_credits: 30_000,
        line2_worksheets: [],
        line6_qualified_basis_decrease_ratio: 1,
        line7_prior_accelerated_recapture_amount: 0,
        line11_interest_from_prior_years: 100,
        prior_unused_credits: 1_000,
        unused_additions_to_qualified_basis_credits: 0,
      },
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.schedule2 as { line16_lihtc_recapture?: number })
      .line16_lihtc_recapture,
    9_090,
  );
  assertEquals(
    (result.pending.f1040 as { line23_other_taxes?: number })
      .line23_other_taxes,
    9_090,
  );
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS8611 ");
  assertStringIncludes(
    xml,
    'referenceDocumentName="IRS8611">9090</RecaptureTaxAmt>',
  );
});

const f965Source = {
  reporting_year: 2025,
  amended_report: false,
  f965s: [{
    entry_type: "original",
    source_document_reference: "2018 filed Form 965-A and 2025 payment ledger",
    tax_year_of_inclusion: 2018,
    net_tax_with_965: 52_000,
    net_tax_without_965: 20_000,
    installment_election: true,
    net_tax_adjustment: 0,
    paid_by_installment_year: [
      2_560,
      2_560,
      2_560,
      2_560,
      2_560,
      4_800,
      6_400,
      8_000,
    ],
    current_year_payment: 8_000,
    current_year_payment_reference: "2025 IRS payment confirmation",
  }],
  s_corp_calculations: [],
  s_corp_deferred_rows: [],
  transfer_agreements: [],
};

Deno.test("section 965 payment reaches Schedule 2 but not Form 1040 line 23", () => {
  const result = runReturn({
    general: singleGeneral(),
    f965: f965Source,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.schedule2 as { line20_965_tax_installment?: number })
      .line20_965_tax_installment,
    8_000,
  );
  assertEquals(
    (result.pending.f1040 as { line23_other_taxes?: number })
      .line23_other_taxes ?? 0,
    0,
  );
});

Deno.test({
  name: "XSD: Form 965-A cumulative payment record and Schedule 2 line 20",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line23_other_taxes: 0 },
    schedule2: { line20_965_tax_installment: 8_000 },
    f965: f965Source,
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS965A ");
  assertStringIncludes(xml, "<PaidYear8Amt>8000</PaidYear8Amt>");
  await validateXsd(xml, "Form 965-A cumulative payment record");
});

Deno.test({
  name: "XSD: Form 965-A netted transfer and multiple transferee statements",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const pdfBytes = await pdf.save();
  const syntheticPdfBase64 = btoa(
    Array.from(pdfBytes, (byte) => String.fromCharCode(byte)).join(""),
  );
  const f965 = {
    ...f965Source,
    f965s: [{
      ...f965Source.f965s[0],
      net_tax_adjustment: 100,
      net_tax_adjustment_kind: "netted_adjustment_and_transfer",
      transfer_agreement_file_name: "Form965C.pdf",
      counterparty_tax_id: { kind: "ein", value: "987654321" },
      netted_adjustment_and_transfer: {
        adjustment_amount: 200,
        transferred_out_amount: -100,
        explanation: "IRS examination adjustment followed by transfer",
        source_document_reference: "2025 signed transfer agreement",
      },
    }, {
      entry_type: "triggered_s_corp",
      source_document_reference: "2025 consent-triggering transaction",
      tax_year_of_inclusion: 2025,
      triggering_event_date: "2025-06-01",
      installment_election: true,
      triggered_liability: 1_000,
      net_tax_adjustment: 0,
      paid_by_installment_year: Array(8).fill(0),
      current_year_payment: 0,
      requires_965e_consent: true,
      consent_agreement_file_name: "Form965E.pdf",
      separate_965h_election_reference: "2025 separate section 965(h) election",
    }],
    s_corp_deferred_rows: [{
      election_or_transfer_year: 2018,
      source_document_reference: "2025 signed Form 965-D agreements",
      corporation_name: "Example S Corp",
      corporation_ein: "123456789",
      beginning_deferred_liability: 10_000,
      triggered_liability: 0,
      transferred_liability: -6_000,
      transfer_agreement_links: [{
        counterparty_tax_id: { kind: "ein", value: "123123123" },
        file_name: "Form965D1.pdf",
      }, {
        counterparty_tax_id: { kind: "ssn", value: "321321321" },
        file_name: "Form965D2.pdf",
      }],
      counterparty_tax_id: { kind: "ein", value: "123123123" },
      multiple_transferees: [
        {
          tax_id: { kind: "ein", value: "123123123" },
          transferred_amount: 2_000,
        },
        {
          tax_id: { kind: "ssn", value: "321321321" },
          transferred_amount: 4_000,
        },
      ],
    }, {
      election_or_transfer_year: 2018,
      source_document_reference: "2018 deferral and 2025 consent transaction",
      corporation_name: "Consent S Corp",
      corporation_ein: "456789123",
      beginning_deferred_liability: 1_000,
      triggered_liability: 1_000,
      transferred_liability: 0,
    }, {
      election_or_transfer_year: 2025,
      source_document_reference: "2025 S corporation transfer in",
      corporation_name: "Acquired S Corp",
      corporation_ein: "789456123",
      beginning_deferred_liability: 0,
      triggered_liability: 0,
      transferred_liability: 500,
      counterparty_tax_id: { kind: "ein", value: "987654321" },
      transfer_agreement_links: [{
        counterparty_tax_id: { kind: "ein", value: "987654321" },
        file_name: "Form965DIn.pdf",
      }],
    }],
    transfer_agreements: [{
      agreement_type: "965-C",
      file_name: "Form965C.pdf",
      signed_pdf_base64: syntheticPdfBase64,
      source_document_reference: "Synthetic signed Form 965-C test fixture",
    }, {
      agreement_type: "965-D",
      file_name: "Form965D1.pdf",
      signed_pdf_base64: syntheticPdfBase64,
      source_document_reference: "Synthetic first Form 965-D test fixture",
    }, {
      agreement_type: "965-D",
      file_name: "Form965D2.pdf",
      signed_pdf_base64: syntheticPdfBase64,
      source_document_reference: "Synthetic second Form 965-D test fixture",
    }, {
      agreement_type: "965-E",
      file_name: "Form965E.pdf",
      signed_pdf_base64: syntheticPdfBase64,
      source_document_reference: "Synthetic Form 965-E test fixture",
    }, {
      agreement_type: "965-D",
      file_name: "Form965DIn.pdf",
      signed_pdf_base64: syntheticPdfBase64,
      source_document_reference:
        "Synthetic transfer-in Form 965-D test fixture",
    }],
  };
  const bundle = await buildMefBundle({
    f1040: { line23_other_taxes: 0 },
    schedule2: { line20_965_tax_installment: 8_000 },
    f965,
  }, {
    filer: extractFilerIdentity(singleGeneral()),
    attachments: [],
  });
  const { xml } = bundle;
  assertEquals(bundle.attachments.length, 5);
  assertEquals(bundle.attachments[0].bytes, pdfBytes);
  assertStringIncludes(xml, "<NetAdjustmentTransferStmt ");
  assertStringIncludes(xml, "<MultipleTransfereeStmt ");
  assertStringIncludes(xml, "<BinaryAttachment ");
  assertStringIncludes(
    xml,
    "<SCorporationEIN>789456123</SCorporationEIN><DeferredNetTaxLiabTrnsfrAmt>500</DeferredNetTaxLiabTrnsfrAmt>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentName="BinaryAttachment NetAdjustmentTransferStatement MultipleTransfereeStatement"',
  );
  await validateXsd(xml, "Form 965-A linked native transfer statements");
});

Deno.test({
  name: "XSD: Form 8912 allowed credit links to Schedule 3 line 6k",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: {
      line16_income_tax: 1_000,
      line20_nonrefundable_credits: 100,
      form8912_source_lines: { line1: 100, line2: 0, line3: 0, line4: 100 },
    },
    schedule3: { line6k_tax_credit_bonds: 100, line8_total: 100 },
    form6251: { line11_amt: 0 },
    f8912: {
      f8912s: [{
        reported_bonds: [{
          bond_type: BondType.QECB,
          issue_date: "2017-12-31",
          issuer_name: "Town Energy Authority",
          issuer_ein: "123456789",
          unique_identifier_code: "O",
          unique_identifier: "BOND1097",
          monthly_credit_amounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100],
          credit_amount: 100,
          purchase_accrued_interest: 0,
          sale_accrued_interest: 0,
          taxable_interest_reported_elsewhere: 100,
          issuer_elected_direct_payment: false,
          is_pass_through_creb_credit: false,
        }],
        unreported_bonds: [],
        carryforwards: [],
      }],
      allowed_credit: 100,
      unused_credit: 0,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS8912 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS8912"');
  await validateXsd(xml, "Form 8912 Schedule 3 line 6k");
});

Deno.test({
  name: "XSD: Form 8859 allowed carryforward links to Schedule 3 line 6h",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line16_income_tax: 1_000, line20_nonrefundable_credits: 830 },
    schedule3: {
      line6h_dc_homebuyer_credit: 830,
      line7_total: 830,
      line8_total: 830,
    },
    f8859: {
      f8859s: [{ carryforward_amount: 1_200 }],
      line1_carryforward: 1_200,
      line2_limit: 830,
      line3_allowed_credit: 830,
      line4_carryforward: 370,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS8859 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS8859"');
  await validateXsd(xml, "Form 8859 Schedule 3 line 6h");
});

Deno.test({
  name: "XSD: Form 8396 credit limit and Schedule A interest reduction",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = form8396SourceSchema.parse({
    qualified_home_address_if_different: {
      line1: "123 Main St",
      city: "Austin",
      state: QualifiedHomeState.TX,
      zip: "78701",
    },
    certificate_issuer_name: "Austin Housing Finance Corporation",
    certificate_number: "MCC-2022-104",
    certificate_issue_date: "2022-03-15",
    current_year_claim: true,
    interest_evidence: {
      kind: CertifiedInterestDocumentKind.Form1098,
      document_reference: "2025 Form 1098 loan A",
      reported_interest_paid: 15_000,
      taxpayer_interest_paid: 15_000,
      original_mortgage_amount: 200_000,
      certified_indebtedness_amount: 200_000,
    },
    interest_reporting_line: "8a",
    mcc_rate: 0.25,
    home_is_main_residence: true,
    home_in_issuer_jurisdiction: true,
    interest_paid_to_related_person: false,
    certificate_is_reissued: false,
    nonspouse_coowner: false,
    prior_2024_form8396: {
      document_reference: "Filed 2024 Form 8396",
      line14_2023_carryforward: 0,
      line16_2022_carryforward: 0,
      line17_2024_carryforward: 300,
    },
  });
  const lines = calculateForm8396(source, 1_100);
  const xml = buildMefXml({
    f1098: {
      f1098s: [{
        source_document_reference: "2025 Form 1098 loan A",
        box1_mortgage_interest: 15_000,
      }],
    },
    f1040: {
      line12e_itemized_deductions: 13_000,
      line16_income_tax: 1_500,
      line20_nonrefundable_credits: 1_100,
    },
    schedule3: {
      line6g_mortgage_interest_credit: 1_100,
      line7_total: 1_100,
      line8_total: 1_100,
    },
    schedule_a: {
      line_8a_mortgage_interest_1098: 15_000,
      form8396_interest_credit_reduction: 2_000,
      form8396_interest_reporting_line: "8a",
    },
    form8396: {
      ...source,
      ...lines,
      credit_limit_worksheet_line1: 1_500,
      credit_limit_worksheet_line2: 400,
    },
  } as MefFormsPending, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<MortgageInterestCreditAmt>1100</MortgageInterestCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<RptHomeMortgIntAndPointsAmt>13000</RptHomeMortgIntAndPointsAmt>",
  );
  await validateXsd(xml, "Form 8396 with Schedule A interest reduction");
});

Deno.test("Form 8396 allocates a smaller certified loan through the full return graph", () => {
  const source = form8396SourceSchema.parse({
    certificate_issuer_name: "Austin Housing Finance Corporation",
    certificate_number: "MCC-2025-101",
    certificate_issue_date: "2025-01-15",
    current_year_claim: true,
    interest_evidence: {
      kind: CertifiedInterestDocumentKind.Form1098,
      document_reference: "2025 Form 1098 loan B",
      reported_interest_paid: 7_500,
      taxpayer_interest_paid: 7_500,
      original_mortgage_amount: 125_000,
      certified_indebtedness_amount: 100_000,
    },
    interest_reporting_line: "8a",
    mcc_rate: 0.2,
    home_is_main_residence: true,
    home_in_issuer_jurisdiction: true,
    interest_paid_to_related_person: false,
    certificate_is_reissued: false,
    nonspouse_coowner: false,
  });
  const result = runReturn({
    general: singleGeneral(),
    w2: [{ box1_wages: 60_000, box2_fed_withheld: 5_000 }],
    f1098: [{
      source_document_reference: "2025 Form 1098 loan B",
      box1_mortgage_interest: 7_500,
      box1_current_year_deductible_interest: 7_500,
      box1_deduction_workpaper_reference:
        "2025 Pub. 936 loan B workpaper before Form 8396 reduction",
    }],
    form8396: source,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8396?.line1, 6_000);
  assertEquals(result.pending.form8396?.line3, 1_200);
  assertEquals(
    result.pending.schedule3?.line6g_mortgage_interest_credit,
    1_200,
  );
});

Deno.test({
  name: "XSD: Form 8834 passive credit links to Schedule 3 line 6i",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line16_income_tax: 1_000, line20_nonrefundable_credits: 450 },
    schedule3: {
      line6i_qualified_electric_vehicle_credit: 450,
      line7_total: 450,
      line8_total: 450,
    },
    f8834: {
      f8834s: [{
        source_form: "8582-CR",
        source_activity_id: "rental-a",
        allowed_passive_activity_credit: 600,
      }],
      line1_source_credit: 600,
      line2_regular_tax: 1_000,
      line3a_foreign_tax_credit: 100,
      line3b_other_credits: 150,
      line3c_total_credits: 250,
      line4_net_regular_tax: 750,
      line5_tentative_minimum_tax: 300,
      line6_adjusted_regular_tax: 450,
      line7_allowed_credit: 450,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS8834 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS8834"');
  await validateXsd(xml, "Form 8834 Schedule 3 line 6i");
});

Deno.test({
  name: "XSD: Form 4136 fuel credit links to refundable Schedule 3 line 12",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 43 },
    schedule3: {
      line12_fuel_tax_credit: 42.6,
      line15_total: 42.6,
    },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Farm",
        principal_activity_code: "111000",
        equipment_make: "Example",
        equipment_model: "Tractor",
        equipment_type: "farm tractor",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [
        {
          line: "1a",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
          not_highway_vehicle: true,
          not_noncommercial_motorboat: true,
        },
        {
          line: "3b",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 400,
          undyed_fuel_confirmed: true,
        },
      ],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS4136 ");
  assertStringIncludes(xml, 'referenceDocumentName="IRS4136"');
  await validateXsd(xml, "Form 4136 Schedule 3 line 12");
});

Deno.test({
  name:
    "XSD: Form 4136 vendor diesel sale and government-buyer statement validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 36 },
    schedule3: { line12_fuel_tax_credit: 36.45, line15_total: 36.45 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Fuel Vendor",
        principal_activity_code: "457100",
        equipment_make: "Example",
        equipment_model: "Pump",
        equipment_type: "diesel dispenser",
        sales_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [{
        line: "6a",
        unit: "gallons",
        qualified_quantity: 150,
        actual_fuel_cost: 400,
        undyed_fuel_confirmed: true,
        vendor_registration_number: "UV123456789",
        vendor_tax_settlement: "tax_excluded_price",
        government_sales: [{
          sale_date: "2025-06-12",
          buyer_name: "Example City",
          buyer_ein: "123456789",
          gallons: 150,
          certificate_p_record_reference: "Certificate P-2025-1",
          certificate_p_unexpired_at_claim_confirmed: true,
          certificate_information_believed_true: true,
          state_credit_card_not_used_confirmed: true,
          exclusive_government_use_confirmed: true,
        }],
      }],
    },
    f4136_diesel_government_sales_statement: {},
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<SlsUndyedDslStLclGovtGrp>");
  assertStringIncludes(xml, "<ToWhomDieselFuelSoldStatement ");
  await validateXsd(xml, "Form 4136 government diesel sales");
});

Deno.test({
  name:
    "XSD: Form 4136 diesel-water emulsion use, bus, and export groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const claims = [
    { line: "14a", type_of_use: "02", qualified_quantity: 100 },
    { line: "14a", type_of_use: "05", qualified_quantity: 100 },
    { line: "14b", type_of_use: undefined, qualified_quantity: 100 },
  ].map((claim) => ({
    ...claim,
    unit: "gallons",
    actual_fuel_cost: 250,
    not_highway_vehicle: true,
    emulsion_water_percentage: 14,
    emulsion_epa_additive_record_reference: "EPA additive record 2025-1",
    export_proof: {
      kind: "carrier_bill_of_lading",
      record_reference: "Export file 2025-014",
    },
  }));
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 52 },
    schedule3: { line12_fuel_tax_credit: 51.9, line15_total: 51.9 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Emulsion Buyer",
        principal_activity_code: "111000",
        equipment_make: "Example",
        equipment_model: "Equipment",
        equipment_type: "farm equipment",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: fuelClaimSchema.array().parse(claims),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<BusNontxUseDieselWtrEmlsnGrp>");
  assertStringIncludes(xml, "<ExpNontxUseDslWtrEmulsionGrp>");
  await validateXsd(xml, "Form 4136 diesel-water emulsion");
});

Deno.test({
  name: "XSD: Form 4136 registered vendor line 6b bus sales validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 170 },
    schedule3: { line12_fuel_tax_credit: 170, line15_total: 170 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Bus Fuel Vendor",
        principal_activity_code: "457100",
        equipment_make: "Example",
        equipment_model: "Pump",
        equipment_type: "diesel dispenser",
        sales_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [{
        line: "6b",
        unit: "gallons",
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
        undyed_fuel_confirmed: true,
        vendor_registration_number: "UB123456789",
        vendor_tax_settlement: "tax_excluded_price",
        intercity_local_bus_sales: [{
          sale_date: "2025-03-15",
          buyer_name: "Example Bus Operator",
          buyer_address: "10 Transit Lane, Wilmington, DE 19801",
          gallons: 1_000,
          certain_intercity_or_local_bus_use_confirmed: true,
          waiver_n: {
            kind: "single_purchase",
            record_reference: "Waiver N-001",
            invoice_or_delivery_ticket_number: "INV-001",
            waived_gallons: 1_000,
            signed_by_buyer_confirmed: true,
            held_unexpired_when_claimed_confirmed: true,
          },
        }],
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<SlsUndyedDieselUseBusesGrp>");
  await validateXsd(xml, "Form 4136 registered vendor line 6b");
});

Deno.test({
  name:
    "XSD: Form 4136 registered kerosene vendor lines 7a through 7c validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const base = {
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    undyed_fuel_confirmed: true,
    vendor_tax_settlement: "tax_excluded_price",
  };
  const cases = [
    {
      line: "7a",
      registration: "UV123456789",
      credit: 24.3,
      expected: "<ToWhomKeroseneFuelSoldStmt ",
      details: {
        government_sales: [{
          sale_date: "2025-06-12",
          buyer_name: "Example City",
          buyer_ein: "123456789",
          gallons: 100,
          certificate_p_record_reference: "Certificate P-2025-7",
          certificate_p_unexpired_at_claim_confirmed: true,
          certificate_information_believed_true: true,
          state_credit_card_not_used_confirmed: true,
          exclusive_government_use_confirmed: true,
        }],
      },
    },
    {
      line: "7b",
      registration: "UP123456789",
      credit: 24.3,
      expected:
        "<SlsUndyedKrsnBlockPumpGalsQty>100</SlsUndyedKrsnBlockPumpGalsQty>",
      details: {
        blocked_pump_sales: [{
          sale_date: "2025-06-13",
          buyer_name: "Example Home Heating",
          buyer_address: "10 Main Street, Wilmington, DE 19801",
          gallons: 100,
          pump_location_reference: "Pump UP-1",
          fixed_location_confirmed: true,
          nontaxable_use_notice_confirmed: true,
          pump_access_method:
            "locked_after_each_sale_and_unlocked_only_on_request",
          buyer_nontaxable_use_confirmed: true,
          no_reason_to_doubt_nontaxable_use_confirmed: true,
        }],
      },
    },
    {
      line: "7c",
      registration: "UB123456789",
      credit: 17,
      expected: "<SlsUndyedKrsnUseBusGalsQty>100</SlsUndyedKrsnUseBusGalsQty>",
      details: {
        intercity_local_bus_sales: [{
          sale_date: "2025-07-15",
          buyer_name: "Example Bus Operator",
          buyer_address: "10 Transit Lane, Wilmington, DE 19801",
          gallons: 100,
          certain_intercity_or_local_bus_use_confirmed: true,
          waiver_n: {
            kind: "account_period",
            record_reference: "Waiver N-007",
            account_or_order_number: "BUS-2025",
            effective_date: "2025-07-01",
            expiration_date: "2026-06-30",
            signed_by_buyer_confirmed: true,
            held_unexpired_when_claimed_confirmed: true,
          },
        }],
      },
    },
  ];
  for (const scenario of cases) {
    const xml = buildMefXml({
      f1040: { line31_additional_payments: Math.round(scenario.credit) },
      ...(scenario.line === "7a"
        ? { f4136_kerosene_government_sales_statement: {} }
        : {}),
      schedule3: {
        line12_fuel_tax_credit: scenario.credit,
        line15_total: scenario.credit,
      },
      f4136: {
        claimant_context: "business",
        additional_activities: [],
        primary_activity_has_most_credit: true,
        business: {
          qualifying_business_activity: true,
          business_name: "Example Kerosene Vendor",
          principal_activity_code: "457100",
          equipment_make: "Example",
          equipment_model: "Pump",
          equipment_type: "kerosene dispenser",
          sales_records_confirmed: true,
          no_duplicate_excise_claim: true,
        },
        claims: [fuelClaimSchema.parse({
          ...base,
          ...scenario.details,
          line: scenario.line,
          vendor_registration_number: scenario.registration,
        })],
      },
    }, extractFilerIdentity(singleGeneral()));
    assertStringIncludes(xml, scenario.expected);
    await validateXsd(xml, `Form 4136 line ${scenario.line}`);
  }
});

Deno.test({
  name: "XSD: Form 4136 commercial aviation vendor lines 8a and 8b validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const claims = [
    { line: "8a", excise_tax_rate_per_gallon: 0.219 },
    { line: "8b", excise_tax_rate_per_gallon: 0.244 },
  ].map((claim, index) => ({
    ...claim,
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price",
    aviation_vendor_sales: [{
      sale_record_reference: index ? "AV-002" : "AV-001",
      sale_date: index ? "2025-07-12" : "2025-06-12",
      buyer_name: "Example Airline",
      buyer_address: "10 Airport Road, Wilmington, DE 19801",
      gallons: 100,
      commercial_aviation_nonforeign_trade_confirmed: true,
      waiver_l: {
        kind: "single_purchase",
        record_reference: index ? "Waiver L-002" : "Waiver L-001",
        invoice_or_delivery_ticket_number: index ? "AV-002" : "AV-001",
        waived_gallons: 100,
        signed_by_buyer_confirmed: true,
        held_unexpired_when_claimed_confirmed: true,
      },
    }],
  }));
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 38 },
    schedule3: { line12_fuel_tax_credit: 37.5, line15_total: 37.5 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Aviation Vendor",
        principal_activity_code: "424720",
        equipment_make: "Example",
        equipment_model: "Fuel Truck",
        equipment_type: "aviation refueler",
        sales_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: fuelClaimSchema.array().parse(claims),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<KrsnUseCmrclAvnTxdAt219Grp>");
  assertStringIncludes(xml, "<KrsnUseCmrclAvnTxdAt244Grp>");
  await validateXsd(xml, "Form 4136 aviation vendor lines 8a and 8b");
});

Deno.test({
  name: "XSD: Form 4136 nonexempt noncommercial aviation line 8c validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 3 },
    schedule3: { line12_fuel_tax_credit: 2.5, line15_total: 2.5 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Aviation Vendor",
        principal_activity_code: "424720",
        equipment_make: "Example",
        equipment_model: "Fuel Truck",
        equipment_type: "aviation refueler",
        sales_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [{
        line: "8c",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
        excise_tax_rate_per_gallon: 0.244,
        vendor_registration_number: "UA123456789",
        vendor_tax_settlement: "tax_excluded_price",
        nonexempt_noncommercial_aviation_sales: [{
          sale_record_reference: "AV-Q-001",
          sale_date: "2025-06-12",
          buyer_name: "Example Aircraft Owner",
          buyer_address: "10 Airport Road, Wilmington, DE 19801",
          gallons: 100,
          nonexempt_noncommercial_aviation_confirmed: true,
          certificate_q: {
            kind: "single_purchase",
            record_reference: "Certificate Q-001",
            invoice_or_delivery_ticket_number: "AV-Q-001",
            certified_gallons: 100,
            signed_by_buyer_confirmed: true,
            held_unexpired_when_claimed_confirmed: true,
          },
        }],
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<KrsnNnxmptUseNonCmrclAvnGrp>");
  await validateXsd(xml, "Form 4136 aviation vendor line 8c");
});

Deno.test({
  name: "XSD: Form 4136 noncommercial aviation lines 8d through 8f validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const claims = [
    { line: "8d", type_of_use: "09", taxRate: 0.244 },
    { line: "8e", type_of_use: "10", taxRate: 0.219 },
  ].map((route, index) => ({
    line: route.line,
    type_of_use: route.type_of_use,
    unit: "gallons",
    qualified_quantity: 1_000,
    actual_fuel_cost: 3_000,
    excise_tax_rate_per_gallon: route.taxRate,
    vendor_registration_number: "UA123456789",
    vendor_tax_settlement: "tax_excluded_price",
    nontaxable_noncommercial_aviation_sales: [{
      proof_kind: "waiver_l",
      sale_record_reference: `AV-${index + 1}`,
      sale_date: "2025-06-12",
      buyer_name: "Example Aircraft Operator",
      buyer_address: "10 Airport Road, Wilmington, DE 19801",
      gallons: 1_000,
      noncommercial_aviation_confirmed: true,
      type_of_use: route.type_of_use,
      waiver_l_selected_use_code: route.type_of_use,
      waiver_l: {
        kind: "single_purchase",
        record_reference: `Waiver L-${index + 1}`,
        invoice_or_delivery_ticket_number: `AV-${index + 1}`,
        waived_gallons: 1_000,
        signed_by_buyer_confirmed: true,
        held_unexpired_when_claimed_confirmed: true,
      },
    }],
  }));
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 462 },
    schedule3: { line12_fuel_tax_credit: 462, line15_total: 462 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Aviation Vendor",
        principal_activity_code: "424720",
        equipment_make: "Example",
        equipment_model: "Fuel Truck",
        equipment_type: "aviation refueler",
        sales_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: fuelClaimSchema.array().parse([...claims, {
        line: "8f",
        unit: "gallons",
        qualified_quantity: 1_000,
        actual_fuel_cost: 3_000,
        vendor_registration_number: "UA123456789",
        vendor_tax_settlement: "tax_excluded_price",
        foreign_trade_lust_tax_paid_confirmed: true,
        foreign_trade_aviation_sale_references: ["AV-1"],
      }]),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<KrsnOthNontxTxdAt244Grp>");
  assertStringIncludes(xml, "<KrsnOthNontxTxdAt219Grp>");
  assertStringIncludes(xml, "<LUSTTxSlsKrsnAvnFrgnTrdGrp>");
  await validateXsd(xml, "Form 4136 aviation vendor lines 8d-8f");
});

Deno.test({
  name: "XSD: Form 4136 government aviation line 8e type 14 validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 218 },
    schedule3: { line12_fuel_tax_credit: 218, line15_total: 218 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Aviation Vendor",
        principal_activity_code: "424720",
        equipment_make: "Example",
        equipment_model: "Fuel Truck",
        equipment_type: "aviation refueler",
        sales_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [{
        line: "8e",
        type_of_use: "14",
        unit: "gallons",
        qualified_quantity: 1_000,
        actual_fuel_cost: 3_000,
        excise_tax_rate_per_gallon: 0.219,
        vendor_registration_number: "UV123456789",
        vendor_tax_settlement: "tax_excluded_price",
        nontaxable_noncommercial_aviation_sales: [{
          proof_kind: "certificate_p",
          sale_record_reference: "AV-GOV-001",
          sale_date: "2025-06-12",
          buyer_name: "Example City",
          buyer_address: "20 City Hall Road, Wilmington, DE 19801",
          buyer_ein: "123456789",
          gallons: 1_000,
          noncommercial_aviation_confirmed: true,
          type_of_use: "14",
          certificate_p_record_reference: "Certificate P-001",
          certificate_p_unexpired_at_claim_confirmed: true,
          certificate_information_believed_true: true,
          state_credit_card_not_used_confirmed: true,
          exclusive_government_use_confirmed: true,
        }],
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>14</NontaxableUseOfFuelTypeCd>",
  );
  assertStringIncludes(
    xml,
    "<KeroseneForAvnRegistrationNum>UV123456789</KeroseneForAvnRegistrationNum>",
  );
  await validateXsd(xml, "Form 4136 government aviation line 8e type 14");
});

Deno.test({
  name:
    "XSD: Form 4136 registered card issuer lines 13a-13c and high-rate statement validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const claims = ["13a", "13b", "13c"].map((line, index) => ({
    line,
    unit: "gallons",
    qualified_quantity: 1_000,
    actual_fuel_cost: 3_000,
    undyed_fuel_confirmed: true,
    excise_tax_rate_per_gallon: 0.244,
    credit_card_issuer_registration_number: "CC123456789",
    credit_card_sales: [{
      sale_record_reference: `CARD-${index + 1}`,
      purchase_date: "2025-06-12",
      buyer_name: "Example City",
      buyer_address: "20 City Hall Road, Wilmington, DE 19801",
      buyer_ein: "123456789",
      card_account_number: "CITY-2025",
      gallons: 1_000,
      actual_fuel_cost: 3_000,
      card_issued_to_government_buyer_confirmed: true,
      exclusive_government_use_confirmed: true,
      buyer_tax_arrangement: "tax_not_collected",
      vendor_tax_arrangement: "tax_repaid",
      certificate_r: {
        record_reference: "Certificate R-001",
        account_number: "CITY-2025",
        effective_date: "2025-01-01",
        expiration_date: "2026-12-31",
        signed_by_buyer_confirmed: true,
        held_unexpired_when_claimed_confirmed: true,
        information_believed_true_confirmed: true,
      },
    }],
  }));
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 729 },
    schedule3: { line12_fuel_tax_credit: 729, line15_total: 729 },
    f4136_credit_card_users_statement: {},
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Card Issuer",
        business_ein: "987654321",
        principal_activity_code: "522210",
        equipment_make: "Payment",
        equipment_model: "Card Network",
        equipment_type: "fleet card platform",
        sales_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: fuelClaimSchema.array().parse(claims),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<NontxUseFuelsCrCardUsersStmt ");
  assertStringIncludes(xml, "<CreditRt>0.243</CreditRt>");
  assertStringIncludes(xml, 'keroseneTaxRateCd="TAXEDAT244"');
  await validateXsd(xml, "Form 4136 card issuer lines 13a-13c");
});

Deno.test({
  name:
    "XSD: Form 4136 exported dyed fuel and gasoline blendstock groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const claims = [
    { line: "16a", exported_fuel_kind: "dyed_diesel" },
    { line: "16a", exported_fuel_kind: "gasoline_blendstock" },
    { line: "16b", exported_fuel_kind: "dyed_kerosene" },
  ].map((claim) => ({
    ...claim,
    unit: "gallons",
    qualified_quantity: 1_000,
    actual_fuel_cost: 2_500,
    excise_tax_rate_per_gallon: 0.001,
    exporter_of_record_confirmed: true,
    export_proof: {
      kind: "carrier_bill_of_lading",
      record_reference: "Export file 2025-016",
    },
  }));
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 3 },
    schedule3: { line12_fuel_tax_credit: 3, line15_total: 3 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Fuel Exporter",
        principal_activity_code: "424700",
        equipment_make: "Example",
        equipment_model: "Tanker",
        equipment_type: "fuel transport",
        export_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: fuelClaimSchema.array().parse(claims),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<ExpDyedDieselGasTxdAt001Grp>");
  assertStringIncludes(xml, "<ExportedDyedKeroseneGrp>");
  await validateXsd(xml, "Form 4136 exported dyed fuel");
});

Deno.test({
  name: "XSD: Form 4136 registered blender line 15a and certification validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 46 },
    schedule3: { line12_fuel_tax_credit: 46, line15_total: 46 },
    f4136_emulsion_blending_statement: {},
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        business_name: "Example Emulsion Blender",
        principal_activity_code: "324110",
        equipment_make: "Example",
        equipment_model: "Mixer",
        equipment_type: "fuel blender",
        production_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [{
        line: "15a",
        unit: "gallons",
        qualified_quantity: 1_000,
        actual_fuel_cost: 2_500,
        undyed_fuel_confirmed: true,
        excise_tax_rate_per_gallon: 0.244,
        blender_registration_number: "M123456789",
        blender_produced_confirmed: true,
        blender_input_diesel_gallons: 1_000,
        blender_trade_or_business_disposition: "used_in_business",
        emulsion_water_percentage: 14,
        emulsion_epa_additive_record_reference: "EPA additive record 2025-1",
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<EmulsionBlndCreditGrp>");
  assertStringIncludes(xml, "<DslWaterFuelEmulsionBlndgStmt ");
  await validateXsd(xml, "Form 4136 registered blender line 15a");
});

Deno.test({
  name: "XSD: Form 4136 all non-bus line 11 fuel groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const lines = [
    "11a",
    "11b",
    "11c",
    "11d",
    "11e",
    "11f",
    "11g",
    "11h",
  ] as const;
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 164 },
    schedule3: {
      line12_fuel_tax_credit: 164.4,
      line15_total: 164.4,
    },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Fuel Business",
        principal_activity_code: "447100",
        equipment_make: "Example",
        equipment_model: "Equipment",
        equipment_type: "business equipment",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: lines.map((line) => ({
        line,
        type_of_use: "02",
        unit: line === "11a" || line === "11c"
          ? "GGE" as const
          : line === "11g"
          ? "DGE" as const
          : "gallons" as const,
        qualified_quantity: 100,
        actual_fuel_cost: 300,
        not_highway_vehicle: true,
      })),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<NontxLiquefiedNaturalGasGrp>");
  await validateXsd(xml, "Form 4136 line 11 alternative fuels");
});

Deno.test({
  name: "XSD: Form 4136 other-use and exported gasoline validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 37 },
    schedule3: { line12_fuel_tax_credit: 36.7, line15_total: 36.7 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Fuel Business",
        principal_activity_code: "447100",
        equipment_make: "Example",
        equipment_model: "Equipment",
        equipment_type: "business equipment",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [
        {
          line: "1c",
          type_of_use: "05",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
          not_noncommercial_motorboat: true,
        },
        {
          line: "1d",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
          export_proof: {
            kind: "carrier_bill_of_lading",
            record_reference: "Export file 2025-001",
          },
        },
      ],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<OtherNontaxableUseGasolineDtl>");
  assertStringIncludes(xml, "<ExportedNontaxableUseGasGrp>");
  await validateXsd(xml, "Form 4136 other-use and exported gasoline");
});

Deno.test({
  name: "XSD: Form 4136 home kerosene exception has no business fields",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 24 },
    schedule3: { line12_fuel_tax_credit: 24.3, line15_total: 24.3 },
    f4136: {
      claimant_context: "home_kerosene",
      claimant_is_ultimate_purchaser: true,
      home_purchase_outside_blocked_pump: true,
      home_use_heating_lighting_or_cooking: true,
      purchase_records_confirmed: true,
      no_duplicate_excise_claim: true,
      claims: [{
        line: "4a",
        type_of_use: "08",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
        undyed_fuel_confirmed: true,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<NontaxableUseOfFuelTypeCd>08</NontaxableUseOfFuelTypeCd>",
  );
  await validateXsd(xml, "Form 4136 home kerosene exception");
});

Deno.test({
  name:
    "XSD: Form 4136 aviation gasoline commercial, export, and LUST groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 345 },
    schedule3: { line12_fuel_tax_credit: 345, line15_total: 345 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Aviation Business",
        principal_activity_code: "481111",
        equipment_make: "Example",
        equipment_model: "Aircraft",
        equipment_type: "commercial aircraft",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [
        {
          line: "2a",
          unit: "gallons",
          qualified_quantity: 1_000,
          actual_fuel_cost: 3_000,
          commercial_aviation_nonforeign_trade_confirmed: true,
        },
        {
          line: "2c",
          unit: "gallons",
          qualified_quantity: 1_000,
          actual_fuel_cost: 3_000,
          export_proof: {
            kind: "carrier_bill_of_lading",
            record_reference: "Export file 2025-002",
          },
        },
        {
          line: "2d",
          unit: "gallons",
          qualified_quantity: 1_000,
          actual_fuel_cost: 3_000,
          foreign_trade_lust_tax_paid_confirmed: true,
        },
      ],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<CommercialAviationUseGasGrp>");
  assertStringIncludes(xml, "<ExportedNontaxAviationGasGrp>");
  assertStringIncludes(xml, "<LUSTTxAvnFuelFrgnTradeGrp>");
  await validateXsd(xml, "Form 4136 aviation gasoline fixed-use lines");
});

Deno.test({
  name: "XSD: Form 4136 diesel train, bus, and export groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 66 },
    schedule3: { line12_fuel_tax_credit: 65.7, line15_total: 65.7 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Rail Business",
        principal_activity_code: "482111",
        equipment_make: "Example",
        equipment_model: "Locomotive",
        equipment_type: "train equipment",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [
        {
          line: "3c",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
          undyed_fuel_confirmed: true,
          train_use_confirmed: true,
        },
        {
          line: "3d",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
          undyed_fuel_confirmed: true,
          certain_intercity_or_local_bus_use_confirmed: true,
          right_to_claim_not_waived: true,
        },
        {
          line: "3e",
          unit: "gallons",
          qualified_quantity: 100,
          actual_fuel_cost: 300,
          undyed_fuel_confirmed: true,
          export_proof: {
            kind: "carrier_bill_of_lading",
            record_reference: "Export file 2025-003",
          },
        },
      ],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<TrainsUseUndyedDieselFuelGrp>");
  assertStringIncludes(xml, "<BusesUseUndyedDieselFuelGrp>");
  assertStringIncludes(xml, "<ExportedUndyedDieselFuelGrp>");
  await validateXsd(xml, "Form 4136 diesel train, bus, and export lines");
});

Deno.test({
  name: "XSD: Form 4136 kerosene bus, export, and reduced-tax groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 68 },
    schedule3: { line12_fuel_tax_credit: 67.5, line15_total: 67.5 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Kerosene Business",
        principal_activity_code: "447100",
        equipment_make: "Example",
        equipment_model: "Equipment",
        equipment_type: "business equipment",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: (["4c", "4d", "4e", "4f"] as const).map((line) => ({
        line,
        type_of_use: line === "4e" || line === "4f" ? "02" : undefined,
        unit: "gallons" as const,
        qualified_quantity: 100,
        actual_fuel_cost: 300,
        undyed_fuel_confirmed: true,
        right_to_claim_not_waived: true,
        certain_intercity_or_local_bus_use_confirmed: true,
        export_proof: {
          kind: "carrier_bill_of_lading",
          record_reference: "Export file 2025-004",
        },
        not_highway_vehicle: true,
        excise_tax_rate_per_gallon: line === "4e"
          ? 0.044
          : line === "4f"
          ? 0.219
          : undefined,
      })),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<BusesUseUndyedKeroseneGrp>");
  assertStringIncludes(xml, "<ExportedUndyedKeroseneGrp>");
  assertStringIncludes(xml, "<NontxUseUndyedKrsnTxdAt044Grp>");
  assertStringIncludes(xml, "<NontxUseUndyedKrsnTxdAt219Grp>");
  await validateXsd(xml, "Form 4136 kerosene lines 4c through 4f");
});

Deno.test({
  name: "XSD: Form 4136 aviation kerosene commercial and LUST groups validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 376 },
    schedule3: { line12_fuel_tax_credit: 376, line15_total: 376 },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Aviation Business",
        principal_activity_code: "481111",
        equipment_make: "Example",
        equipment_model: "Aircraft",
        equipment_type: "commercial aircraft",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: (["5a", "5b", "5e"] as const).map((line) => ({
        line,
        unit: "gallons" as const,
        qualified_quantity: 1_000,
        actual_fuel_cost: 3_000,
        commercial_aviation_nonforeign_trade_confirmed: true,
        foreign_trade_lust_tax_paid_confirmed: true,
        right_to_claim_not_waived: true,
        excise_tax_rate_per_gallon: line === "5a"
          ? 0.244
          : line === "5b"
          ? 0.219
          : undefined,
      })),
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<KrsnUsedInCmrclAvnTxdAt244Grp>");
  assertStringIncludes(xml, "<KrsnUsedInCmrclAvnTxdAt219Grp>");
  assertStringIncludes(xml, "<LUSTTxKrsnAvnFrgnTrdGrp>");
  await validateXsd(xml, "Form 4136 aviation kerosene lines 5a, 5b, and 5e");
});

Deno.test({
  name: "XSD: Form 4136 line 11 reduced-rate bus group validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line31_additional_payments: 11 },
    schedule3: {
      line12_fuel_tax_credit: 10.9,
      line15_total: 10.9,
    },
    f4136: {
      claimant_context: "business",
      additional_activities: [],
      primary_activity_has_most_credit: true,
      business: {
        qualifying_business_activity: true,
        claimant_is_ultimate_purchaser: true,
        business_name: "Example Bus Business",
        principal_activity_code: "485110",
        equipment_make: "Example",
        equipment_model: "Bus",
        equipment_type: "intercity bus",
        purchase_records_confirmed: true,
        no_duplicate_excise_claim: true,
      },
      claims: [{
        line: "11a",
        type_of_use: "05",
        unit: "GGE",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<BusNontxLiquifiedPetroleumGas>");
  await validateXsd(xml, "Form 4136 line 11 bus use");
});

Deno.test({
  name: "XSD: Form 4136 multiple activities link two Schedule A PDFs",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const business = {
    qualifying_business_activity: true,
    claimant_is_ultimate_purchaser: true,
    business_name: "First Fuel Business",
    business_ein: "123456789",
    principal_activity_code: "111000",
    equipment_make: "Example",
    equipment_model: "Tractor",
    equipment_type: "farm tractor",
    purchase_records_confirmed: true,
    no_duplicate_excise_claim: true,
  } as const;
  const claim = {
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
    not_highway_vehicle: true,
    not_noncommercial_motorboat: true,
  } as const;
  const bundle = await buildMefBundle({
    f1040: { line31_additional_payments: 27 },
    schedule3: { line12_fuel_tax_credit: 27.45, line15_total: 27.45 },
    f4136: {
      claimant_context: "business",
      business,
      claims: [claim],
      additional_activities: [{
        business: {
          ...business,
          business_name: "Second Fuel Business",
          business_ein: "987654321",
        },
        claims: [{ ...claim, qualified_quantity: 50 }],
      }],
      primary_activity_has_most_credit: true,
    },
  }, { filer: extractFilerIdentity(singleGeneral()), attachments: [] });
  assertEquals(bundle.attachments.length, 2);
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="2"');
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="BinaryAttachment GeneralDependencySmall"',
  );
  await validateXsd(
    bundle.xml,
    "Form 4136 multiple activities with Schedule A",
  );
});

Deno.test({
  name: "XSD: filed passive-only Form 8582-CR credit reaches Form 3800",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = {
    activity_reference: "Clinical partnership",
    source_form: "Form 8820",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership",
      ein: "123456789",
    },
    source_document_reference: "2025 clinical credit statement",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
    form3800_credit_line: "1h" as const,
    current_year_credit: 1_000,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  };
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 1_000 },
      schedule3: { line6a_total: 500, line7_total: 500 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      form8582cr: {
        credit_sources: [source],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 500,
      },
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Clinical partnership",
          partnership_ein: "123456789",
          source_document_reference: "2025 clinical credit statement",
          box15_code_z_orphan_drug_credit: 1_000,
          orphan_drug_credit_subject_to_passive_activity_limit: true,
        }],
      },
      f3800: {
        passive_source_allocations: [{
          ...source,
          total_credit: 1_000,
          special_allowed_credit: 0,
          unallowed_credit: 500,
          allowed_credit: 500,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 1_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 0,
          specifiedCredit: 0,
        },
        allowed_credit: 500,
      },
    } satisfies MefFormsPending & { k1_partnership: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  await validateXsd(xml, "passive Form 8582-CR and Form 3800");
});

Deno.test({
  name: "XSD: passive carryover and current Form 8826 share Form 3800 tax use",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = {
    activity_reference: "Clinical partnership",
    source_form: "Form 8820",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership",
      ein: "123456789",
    },
    source_document_reference: "2025 clinical credit statement",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
    form3800_credit_line: "1h" as const,
    current_year_credit: 300,
    prior_unallowed_credits: [{
      originating_tax_year: 2023,
      credit_amount: 200,
      source_document_reference: "2023 clinical credit statement",
    }],
    publicly_traded_partnership: false,
  };
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 250 },
      schedule3: { line6a_total: 250, line7_total: 250 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      form8582cr: {
        credit_sources: [source],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 700,
      },
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Clinical partnership",
          partnership_ein: "123456789",
          source_document_reference: "2025 clinical credit statement",
          box15_code_z_orphan_drug_credit: 300,
          orphan_drug_credit_subject_to_passive_activity_limit: true,
        }],
      },
      f8826: {
        eligible_expenditures: 450,
        prior_year_gross_receipts: 500_000,
        prior_year_full_time_employee_count: 20,
        subject_to_passive_activity_limit: false,
      },
      f3800: {
        passive_source_allocations: [{
          ...source,
          total_credit: 500,
          special_allowed_credit: 0,
          unallowed_credit: 200,
          allowed_credit: 300,
        }],
        f8826_credit_entries: [{
          source_type: "self",
          credit_amount: 100,
          subject_to_passive_activity_limit: false,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 250,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 100,
          specifiedCredit: 0,
        },
        allowed_credit: 250,
      },
    } satisfies MefFormsPending & { k1_partnership: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  assertStringIncludes(xml, "<IRS8826 ");
  await validateXsd(xml, "passive carryover and current Form 8826");
});

Deno.test({
  name: "XSD: passive and nonpassive Form 8826 sources share Part III line 1e",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = {
    activity_reference: "Access partnership",
    source_form: "Form 8826",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Access partnership",
      ein: "123456789",
    },
    source_document_reference: "2025 Schedule K-1 access credit",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
    form3800_credit_line: "1e" as const,
    current_year_credit: 500,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  };
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 1_000 },
      schedule3: { line6a_total: 600, line7_total: 600 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      form8582cr: {
        credit_sources: [source],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 500,
      },
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Access partnership",
          partnership_ein: "123456789",
          source_document_reference: "2025 Schedule K-1 access credit",
          box15_code_k_disabled_access_credit: 500,
          disabled_access_credit_subject_to_passive_activity_limit: true,
        }],
      },
      f8826: {
        eligible_expenditures: 450,
        prior_year_gross_receipts: 500_000,
        prior_year_full_time_employee_count: 20,
        subject_to_passive_activity_limit: false,
      },
      f3800: {
        passive_source_allocations: [{
          ...source,
          total_credit: 500,
          special_allowed_credit: 0,
          unallowed_credit: 0,
          allowed_credit: 500,
        }],
        f8826_credit_entries: [{
          source_type: "self",
          credit_amount: 100,
          subject_to_passive_activity_limit: false,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 1_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 100,
          specifiedCredit: 0,
        },
        allowed_credit: 600,
      },
    } satisfies MefFormsPending & { k1_partnership: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(xml, "<Form8826CYCreditsGrp");
  await validateXsd(xml, "mixed Form 8826 credit on Part III line 1e");
});

Deno.test({
  name:
    "XSD: trust K-1 code ZZ disabled-access statement reaches passive line 1e",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = {
    activity_reference: "Access trust",
    source_form: "Form 8826",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Trust,
      entity_reference: "Access trust",
      ein: "123456789",
    },
    source_document_reference: "2025 Trust K-1",
    source_statement_reference: "2025 trust access statement",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
    form3800_credit_line: "1e" as const,
    current_year_credit: 500,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  };
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 1_000 },
      schedule3: { line6a_total: 500, line7_total: 500 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      form8582cr: {
        credit_sources: [source],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 500,
      },
      k1_trust: {
        k1_trusts: [{
          estate_trust_name: "Access trust",
          entity_type: "trust",
          estate_trust_ein: "123456789",
          source_document_reference: "2025 Trust K-1",
          box13_code_zz_disabled_access_credit: 500,
          box13_code_zz_disabled_access_statement_reference:
            "2025 trust access statement",
          disabled_access_credit_subject_to_passive_activity_limit: true,
        }],
      },
      f3800: {
        passive_source_allocations: [{
          ...source,
          total_credit: 500,
          special_allowed_credit: 0,
          unallowed_credit: 0,
          allowed_credit: 500,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 1_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 0,
          specifiedCredit: 0,
        },
        allowed_credit: 500,
      },
    } satisfies MefFormsPending & { k1_trust: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  await validateXsd(xml, "trust disabled-access K-1 code ZZ");
});

Deno.test({
  name:
    "XSD: direct trust disabled-access code ZZ files Form 3800 without Form 8826",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 1_000 },
      schedule3: { line6a_total: 500, line7_total: 500 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      k1_trust: {
        k1_trusts: [{
          estate_trust_name: "Access trust",
          entity_type: "trust",
          estate_trust_ein: "123456789",
          source_document_reference: "2025 Trust K-1",
          box13_code_zz_disabled_access_credit: 500,
          box13_code_zz_disabled_access_statement_reference:
            "2025 access statement",
          disabled_access_credit_subject_to_passive_activity_limit: false,
        }],
      },
      f3800: {
        f8826_credit_entries: [{
          source_type: "trust",
          source_ein: "123456789",
          source_document_reference: "2025 Trust K-1",
          source_statement_reference: "2025 access statement",
          credit_amount: 500,
          subject_to_passive_activity_limit: false,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 1_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 500,
          specifiedCredit: 0,
        },
        allowed_credit: 500,
      },
    } satisfies MefFormsPending & { k1_trust: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS3800 ");
  assertEquals(xml.includes("<IRS8826 "), false);
  await validateXsd(xml, "direct trust disabled-access K-1 code ZZ");
});

Deno.test({
  name: "XSD: direct partnership code K files Form 3800 without Form 8826",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const reference = "2025 Access partnership K-1";
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 1_000 },
      schedule3: { line6a_total: 500, line7_total: 500 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Access partnership",
          partnership_ein: "123456789",
          source_document_reference: reference,
          box15_code_k_disabled_access_credit: 500,
          disabled_access_credit_subject_to_passive_activity_limit: false,
        }],
      },
      f3800: {
        f8826_credit_entries: [{
          source_type: "partnership",
          source_ein: "123456789",
          source_document_reference: reference,
          credit_amount: 500,
          subject_to_passive_activity_limit: false,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 1_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 500,
          specifiedCredit: 0,
        },
        allowed_credit: 500,
      },
    } satisfies MefFormsPending & { k1_partnership: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS3800 ");
  assertEquals(xml.includes("<IRS8826 "), false);
  await validateXsd(xml, "direct partnership disabled-access K-1 code K");
});

Deno.test("nonpassive partnership and S-corporation code K route through a normal return", () => {
  const result = runReturn({
    general: singleGeneral(),
    k1_partnership: [{
      partnership_name: "Access partnership",
      partnership_ein: "123456789",
      source_document_reference: "2025 Access partnership K-1",
      box15_code_k_disabled_access_credit: 500.25,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    }],
    k1_s_corp: [{
      corporation_name: "Access S corporation",
      corporation_ein: "987654321",
      source_document_reference: "2025 Access S corporation K-1",
      box13_code_k_disabled_access_credit: 499.75,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const entries = (result.pending.f3800 as {
    f8826_credit_entries?: Array<
      { source_type: string; [key: string]: unknown }
    >;
  }).f8826_credit_entries ?? [];
  assertEquals(
    [...entries].sort((left, right) =>
      left.source_type.localeCompare(right.source_type)
    ),
    [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 Access partnership K-1",
      credit_amount: 500.25,
      subject_to_passive_activity_limit: false,
    }, {
      source_type: "s_corporation",
      source_ein: "987654321",
      source_document_reference: "2025 Access S corporation K-1",
      credit_amount: 499.75,
      subject_to_passive_activity_limit: false,
    }],
  );
});

Deno.test({
  name:
    "XSD: direct estate orphan-drug code M files Form 3800 without Form 8820",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 1_000 },
      schedule3: { line6a_total: 500, line7_total: 500 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      k1_trust: {
        k1_trusts: [{
          estate_trust_name: "Clinical estate",
          entity_type: "estate",
          estate_trust_ein: "123456789",
          source_document_reference: "2025 Estate K-1",
          box13_code_m_orphan_drug_credit: 500,
          orphan_drug_credit_subject_to_passive_activity_limit: false,
        }],
      },
      f3800: {
        f8820_k1_credit_entries: [{
          source_type: "estate",
          source_ein: "123456789",
          source_document_reference: "2025 Estate K-1",
          credit_amount: 500,
          subject_to_passive_activity_limit: false,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 1_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 500,
          specifiedCredit: 0,
        },
        allowed_credit: 500,
      },
    } satisfies MefFormsPending & { k1_trust: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS3800 ");
  assertEquals(xml.includes("<IRS8820 "), false);
  await validateXsd(xml, "direct estate orphan-drug K-1 code M");
});

Deno.test({
  name:
    "XSD: partnership and S-corporation orphan-drug K-1 credits share line 1h",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 2_000 },
      schedule3: { line6a_total: 1_500, line7_total: 1_500 },
      form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Clinical partnership",
          partnership_ein: "123456789",
          source_document_reference: "2025 partnership K-1",
          box15_code_z_orphan_drug_credit: 1_000,
          orphan_drug_credit_subject_to_passive_activity_limit: false,
        }],
      },
      k1_s_corp: {
        k1_s_corps: [{
          corporation_name: "Clinical S corporation",
          corporation_ein: "987654321",
          source_document_reference: "2025 S corporation K-1",
          box13_code_z_orphan_drug_credit: 500,
          orphan_drug_credit_subject_to_passive_activity_limit: false,
        }],
      },
      f3800: {
        f8820_k1_credit_entries: [
          {
            source_type: "partnership",
            source_ein: "123456789",
            source_document_reference: "2025 partnership K-1",
            credit_amount: 1_000,
            subject_to_passive_activity_limit: false,
          },
          {
            source_type: "s_corporation",
            source_ein: "987654321",
            source_document_reference: "2025 S corporation K-1",
            credit_amount: 500,
            subject_to_passive_activity_limit: false,
          },
        ],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 2_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 0,
          standardCredit: 1_500,
          specifiedCredit: 0,
        },
        allowed_credit: 1_500,
      },
    } satisfies MefFormsPending & {
      k1_partnership: unknown;
      k1_s_corp: unknown;
    },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS3800 ");
  assertEquals(xml.includes("<IRS8820 "), false);
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
  await validateXsd(
    xml,
    "partnership and S-corporation orphan-drug K-1 code Z",
  );
});

Deno.test("passive orphan-drug K-1 without Form 8582-CR facts reports a diagnostic", () => {
  const result = runReturn({
    general: singleGeneral(),
    k1_partnership: [{
      partnership_name: "Clinical partnership",
      partnership_ein: "123456789",
      source_document_reference: "2025 clinical partnership K-1",
      box15_code_z_orphan_drug_credit: 500,
      orphan_drug_credit_subject_to_passive_activity_limit: true,
    }],
  });
  assertEquals(
    result.diagnostics.some((item) => item.nodeType === "form8582cr"),
    true,
  );
});

Deno.test("passive disabled-access K-1 without Form 8582-CR facts reports a diagnostic", () => {
  const result = runReturn({
    general: singleGeneral(),
    k1_partnership: [{
      partnership_name: "Access partnership",
      partnership_ein: "123456789",
      source_document_reference: "2025 access partnership K-1",
      box15_code_k_disabled_access_credit: 500.25,
      disabled_access_credit_subject_to_passive_activity_limit: true,
    }],
  });
  assertEquals(
    result.diagnostics.some((item) =>
      item.nodeType === "disabled_access_limit"
    ),
    true,
  );
});

Deno.test({
  name:
    "XSD: Form 8582-CR start input carries passive disabled-access K-1 through the return",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const reference = "2025 access partnership K-1";
  const result = runReturn({
    general,
    k1_partnership: [{
      partnership_name: "Access partnership",
      partnership_ein: "123456789",
      source_document_reference: reference,
      box15_code_k_disabled_access_credit: 500.25,
      disabled_access_credit_subject_to_passive_activity_limit: true,
    }],
    form8582cr: {
      credit_sources: [{
        activity_reference: "Access partnership activity",
        source_form: "Form 8826",
        source_document_reference: reference,
        source_origin: {
          kind: PassiveCreditSourceOrigin.Partnership,
          entity_reference: "Access partnership",
          ein: "123456789",
        },
        category: PassiveCreditCategory.Other,
        reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
        form3800_credit_line: "1e",
        current_year_credit: 500,
        prior_unallowed_credits: [],
        publicly_traded_partnership: false,
      }],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  await validateXsd(
    xml,
    "Form 8582-CR passive disabled-access K-1 return path",
  );
});

Deno.test({
  name:
    "XSD: mixed passive and nonpassive disabled-access K-1 sources share one cap",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    k1_partnership: [{
      partnership_name: "Access partnership",
      partnership_ein: "123456789",
      source_document_reference: "2025 access partnership K-1",
      box15_code_k_disabled_access_credit: 3_000,
      disabled_access_credit_subject_to_passive_activity_limit: true,
    }],
    k1_s_corp: [{
      corporation_name: "Access S corporation",
      corporation_ein: "987654321",
      source_document_reference: "2025 access S corporation K-1",
      box13_code_k_disabled_access_credit: 4_000,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    }],
    form8582cr: {
      credit_sources: [{
        activity_reference: "Access partnership activity",
        source_form: "Form 8826",
        source_document_reference: "2025 access partnership K-1",
        source_origin: {
          kind: PassiveCreditSourceOrigin.Partnership,
          entity_reference: "Access partnership",
          ein: "123456789",
        },
        category: PassiveCreditCategory.Other,
        reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
        form3800_credit_line: "1e",
        current_year_credit: 3_000,
        prior_unallowed_credits: [],
        publicly_traded_partnership: false,
      }],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.form8582cr as {
      credit_sources: Array<{ current_year_credit: number }>;
    }).credit_sources[0].current_year_credit,
    2_143,
  );
  assertEquals(
    (result.pending.f3800 as {
      f8826_credit_entries: Array<{ credit_amount: number }>;
    }).f8826_credit_entries[0].credit_amount,
    2_857,
  );
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
  await validateXsd(xml, "mixed disabled-access K-1 sources");
});

Deno.test({
  name:
    "XSD: passive Form 8826 pass-through and its K-1 enter the shared cap once",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f8826: {
      eligible_expenditures: 0,
      subject_to_passive_activity_limit: false,
      pass_through_credits: [{
        entity_type: "partnership",
        entity_ein: "123456789",
        source_document_reference: "2025 access partnership K-1",
        credit_amount: 3_000,
        subject_to_passive_activity_limit: true,
      }],
    },
    k1_partnership: [{
      partnership_name: "Access partnership",
      partnership_ein: "123456789",
      source_document_reference: "2025 access partnership K-1",
      box15_code_k_disabled_access_credit: 3_000,
      disabled_access_credit_subject_to_passive_activity_limit: true,
    }],
    k1_s_corp: [{
      corporation_name: "Access S corporation",
      corporation_ein: "987654321",
      source_document_reference: "2025 access S corporation K-1",
      box13_code_k_disabled_access_credit: 4_000,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    }],
    form8582cr: {
      credit_sources: [{
        activity_reference: "Access partnership activity",
        source_form: "Form 8826",
        source_document_reference: "2025 access partnership K-1",
        source_origin: {
          kind: PassiveCreditSourceOrigin.Partnership,
          entity_reference: "Access partnership",
          ein: "123456789",
        },
        category: PassiveCreditCategory.Other,
        reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
        form3800_credit_line: "1e",
        current_year_credit: 3_000,
        prior_unallowed_credits: [],
        publicly_traded_partnership: false,
      }],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  assertEquals(xml.includes("<IRS8826 "), false);
  await validateXsd(xml, "passive Form 8826 pass-through shared cap");
});

Deno.test({
  name:
    "XSD: passive self-earned Form 8826 and nonpassive K-1 share the disabled-access cap",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f8826: {
      eligible_expenditures: 6_250,
      prior_year_gross_receipts: 500_000,
      prior_year_full_time_employee_count: 20,
      subject_to_passive_activity_limit: true,
      source_document_reference: "2025 self-earned Form 8826",
    },
    k1_s_corp: [{
      corporation_name: "Access S corporation",
      corporation_ein: "987654321",
      source_document_reference: "2025 access S corporation K-1",
      box13_code_k_disabled_access_credit: 4_000,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    }],
    form8582cr: {
      credit_sources: [{
        activity_reference: "Self-earned passive access",
        source_form: "Form 8826",
        source_document_reference: "2025 self-earned Form 8826",
        source_origin: { kind: PassiveCreditSourceOrigin.Self },
        category: PassiveCreditCategory.Other,
        reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
        form3800_credit_line: "1e",
        current_year_credit: 3_000,
        prior_unallowed_credits: [],
        publicly_traded_partnership: false,
      }],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.form8582cr as {
      credit_sources: Array<{ current_year_credit: number }>;
    }).credit_sources[0].current_year_credit,
    2_143,
  );
  assertEquals(
    (result.pending.f3800 as {
      f8826_credit_entries: Array<{ credit_amount: number }>;
    }).f8826_credit_entries[0].credit_amount,
    2_857,
  );
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS8826 ");
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  await validateXsd(xml, "passive self-earned Form 8826 mixed cap");
});

Deno.test({
  name:
    "XSD: Form 8582-CR start input carries passive orphan-drug K-1 through the return",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const reference = "2025 clinical partnership K-1";
  const result = runReturn({
    general,
    k1_partnership: [{
      partnership_name: "Clinical partnership",
      partnership_ein: "123456789",
      source_document_reference: reference,
      box15_code_z_orphan_drug_credit: 500,
      orphan_drug_credit_subject_to_passive_activity_limit: true,
    }],
    form8582cr: {
      credit_sources: [{
        activity_reference: "Clinical partnership activity",
        source_form: "Form 8820",
        source_document_reference: reference,
        source_origin: {
          kind: PassiveCreditSourceOrigin.Partnership,
          entity_reference: "Clinical partnership",
          ein: "123456789",
        },
        category: PassiveCreditCategory.Other,
        reporting_route: PassiveCreditReportingRoute.Form3800Line3 as const,
        form3800_credit_line: "1h",
        current_year_credit: 500,
        prior_unallowed_credits: [],
        publicly_traded_partnership: false,
      }],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS8582CR ");
  assertStringIncludes(xml, "<IRS3800 ");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  await validateXsd(xml, "Form 8582-CR passive K-1 normal return path");
});

Deno.test({
  name:
    "XSD: pass-through-only Form 8826 code K reaches Form 3800 without IRS8826",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml(
    {
      f1040: { line16_income_tax: 40_000 },
      schedule3: { line6a_total: 1_250, line7_total: 1_250 },
      form6251: {
        line11_amt: 0,
        net_tmt: 20_000,
        must_file_for_credit: true,
      },
      k1_s_corp: {
        k1_s_corps: [{
          corporation_name: "Access S corporation",
          corporation_ein: "987654321",
          source_document_reference: "2025 disabled-access K-1",
          box13_code_k_disabled_access_credit: 1_250,
          disabled_access_credit_subject_to_passive_activity_limit: false,
        }],
      },
      f8826: {
        eligible_expenditures: 0,
        subject_to_passive_activity_limit: false,
        pass_through_credits: [{
          entity_type: "s_corporation",
          entity_ein: "987654321",
          source_document_reference: "2025 disabled-access K-1",
          credit_amount: 1_250,
          subject_to_passive_activity_limit: false,
        }],
      },
      f3800: {
        f8826_credit_entries: [{
          source_type: "s_corporation",
          source_ein: "987654321",
          credit_amount: 1_250,
          subject_to_passive_activity_limit: false,
        }],
        tax_context: {
          filingStatus: FilingStatus.Single,
          regularTax: 40_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 20_000,
          standardCredit: 1_250,
          specifiedCredit: 0,
        },
        allowed_credit: 1_250,
      },
    } satisfies MefFormsPending & { k1_s_corp: unknown },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<IRS3800 ");
  assertEquals(xml.includes("<IRS8826 "), false);
  await validateXsd(xml, "K-1 code K Form 3800 without IRS8826");
});

Deno.test({
  name:
    "XSD: linked specified Form 8835 credit reaches Form 3800 and Schedule 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const facility = {
    energy_type: EnergyType.Wind,
    subject_to_passive_activity_limit: false,
    kwh_produced: 1_000_000,
    kwh_sold: 1_000_000,
    facility_description: "Onshore wind turbine",
    facility_us_address: {
      line1: "100 Wind Farm Rd",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    facility_latitude: 30.267153,
    facility_longitude: -97.743061,
    facility_owned_by_filer: true,
    ac_nameplate_kw: 900,
    facility_placed_in_service_date: "2023-01-01",
    facility_construction_start_date: "2022-12-01",
    production_period_start_date: "2025-01-01",
    production_period_end_date: "2025-12-31",
    increased_credit_reason: "none" as const,
    domestic_content_bonus: false,
    energy_community_bonus: false,
    is_fiscal_year: false,
  };
  const xml = buildMefXml({
    f1040: { line16_income_tax: 40_000 },
    schedule3: { line6a_total: 6_000, line7_total: 6_000 },
    form6251: { line11_amt: 0, net_tmt: 20_000 },
    f3800: {
      f8835_credit_entries: [{
        form3800_line: "4e",
        credit_amount: 6_000,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: false,
      }],
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 40_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 0,
        tentativeMinimumTax: 20_000,
        standardCredit: 0,
        specifiedCredit: 6_000,
      },
      allowed_credit: 6_000,
    },
    f8835: { f8835s: [facility] },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS3800 ");
  assertStringIncludes(xml, "<IRS8835 ");
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>6000</CurrentYearCreditAllowedAmt>",
  );
  await validateXsd(xml, "linked Form 8835 and Form 3800");
});

Deno.test({
  name: "XSD: Form 5884 work opportunity credit links to Form 3800 line 4b",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line16_income_tax: 40_000 },
    schedule3: { line6a_total: 2_400, line7_total: 2_400 },
    form6251: { line11_amt: 0, net_tmt: 20_000 },
    schedule_c: {
      schedule_cs: [{
        business_reference: "BUSINESS-1",
        line_a_principal_business: "Retail store",
        line_b_business_code: "459999",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 30_000,
        line_26_wages: 6_000,
      }],
      wotc_wage_reductions: [{
        business_reference: "BUSINESS-1",
        credit_amount: 2_400,
      }],
    },
    f5884: {
      subject_to_passive_activity_limit: false,
      f5884s: [{
        employee_reference: "EMP-001",
        target_group: TargetGroup.TanfRecipient,
        hired_on: "2025-01-15",
        certification: {
          path: "certified_by_start",
          swa_certification_reference: "SWA-001",
          certification_received_on: "2025-01-15",
          certification_received_before_claim_confirmed: true,
          revocation: { status: "no_notice_received" },
        },
        qualified_wages_confirmed: true,
        not_prior_employee_confirmed: true,
        not_related_or_dependent_confirmed: true,
        more_than_half_wages_for_trade_or_business_confirmed: true,
        excluded_wages_removed_confirmed: true,
        wage_records: [{
          payroll_record_reference: "PAY-001",
          deduction_location: {
            kind: "schedule_c",
            business_reference: "BUSINESS-1",
          },
          service_period_start_on: "2025-02-01",
          service_period_end_on: "2025-02-28",
          paid_or_incurred_on: "2025-02-28",
          qualified_wages: 6_000,
        }],
        hours_worked: 400,
      }],
    },
    f3800: {
      f5884_credit: {
        credit_amount: 2_400,
        subject_to_passive_activity_limit: false,
      },
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 40_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 0,
        tentativeMinimumTax: 20_000,
        standardCredit: 0,
        specifiedCredit: 2_400,
      },
      allowed_credit: 2_400,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS5884 ");
  assertStringIncludes(xml, "<Form5884CYCreditsGrp");
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>2400</CurrentYearCreditAllowedAmt>",
  );
  await validateXsd(xml, "linked Form 5884 and Form 3800");
});

Deno.test({
  name: "XSD: controlled-group Form 5884 links both share statements",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const employee = {
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" },
    },
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    wage_records: [{
      payroll_record_reference: "PAY-001",
      deduction_location: {
        kind: "schedule_c",
        business_reference: "BUSINESS-1",
      },
      service_period_start_on: "2025-02-01",
      service_period_end_on: "2025-02-28",
      paid_or_incurred_on: "2025-02-28",
      qualified_wages: 6_000,
    }],
  };
  const xml = buildMefXml({
    f1040: { line16_income_tax: 40_000 },
    schedule3: { line6a_total: 1_950, line7_total: 1_950 },
    form6251: { line11_amt: 0, net_tmt: 20_000 },
    schedule_c: {
      schedule_cs: [{
        business_reference: "BUSINESS-1",
        line_a_principal_business: "Retail store",
        line_b_business_code: "459999",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 30_000,
        line_26_wages: 6_000,
      }],
      wotc_wage_reductions: [{
        business_reference: "BUSINESS-1",
        credit_amount: 1_950,
      }],
    },
    f5884: {
      subject_to_passive_activity_limit: false,
      controlled_group: {
        kind: "controlled_corporations",
        group_classification_document_reference:
          "2025 group ownership schedule",
        taxpayer_member_ein: "123456789",
        members: [
          { ein: "123456789", business_name: "Taxpayer Company" },
          { ein: "987654321", business_name: "Affiliate Company" },
        ],
      },
      f5884s: [
        {
          ...employee,
          employee_reference: "GROUP-1",
          employer_ein: "123456789",
          hours_worked: 200,
        },
        {
          ...employee,
          employee_reference: "GROUP-2",
          employer_ein: "987654321",
          wage_records: [{
            ...employee.wage_records[0],
            deduction_location: { kind: "entity_return" },
          }],
          hours_worked: 400,
        },
      ],
    },
    f3800: {
      f5884_credit: {
        credit_amount: 1_950,
        subject_to_passive_activity_limit: false,
      },
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 40_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 0,
        tentativeMinimumTax: 20_000,
        standardCredit: 0,
        specifiedCredit: 1_950,
      },
      allowed_credit: 1_950,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<ControlledGroupMemberStatement ");
  assertStringIncludes(xml, "<DeductionDifferentiationStmt ");
  assertStringIncludes(xml, "<TotalWagesAmt referenceDocumentId=");
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>1950</CurrentYearCreditAllowedAmt>",
  );
  await validateXsd(xml, "controlled-group Form 5884 share statements");
});

Deno.test({
  name:
    "XSD: pass-through-only work opportunity credit omits recipient IRS5884",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line16_income_tax: 40_000 },
    schedule3: { line6a_total: 1_250, line7_total: 1_250 },
    form6251: { line11_amt: 0, net_tmt: 20_000 },
    f5884: {
      subject_to_passive_activity_limit: false,
      f5884s: [],
      pass_through_credits: [{
        source_type: "partnership",
        entity_ein: "123456789",
        source_document_reference: "2025 K-1 box 15 code J",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    },
    f3800: {
      f5884_credit: {
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      },
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 40_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 0,
        tentativeMinimumTax: 20_000,
        standardCredit: 0,
        specifiedCredit: 1_250,
      },
      allowed_credit: 1_250,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertEquals(xml.includes("<IRS5884 "), false);
  assertStringIncludes(xml, "<Form5884CYCreditsGrp");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  await validateXsd(xml, "pass-through-only Form 5884 credit on Form 3800");
});

Deno.test({
  name: "XSD: partly limited mixed Form 5884 sources use Form 3800 Part V",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f1040: { line16_income_tax: 1_000 },
    schedule3: { line6a_total: 1_000, line7_total: 1_000 },
    form6251: { line11_amt: 0, net_tmt: 0, must_file_for_credit: true },
    schedule_c: {
      schedule_cs: [{
        business_reference: "BUSINESS-1",
        line_a_principal_business: "Retail store",
        line_b_business_code: "459999",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 30_000,
        line_26_wages: 6_000,
      }],
      wotc_wage_reductions: [{
        business_reference: "BUSINESS-1",
        credit_amount: 2_400,
      }],
    },
    f5884: {
      subject_to_passive_activity_limit: false,
      f5884s: [{
        employee_reference: "EMP-001",
        target_group: TargetGroup.TanfRecipient,
        hired_on: "2025-01-15",
        certification: {
          path: "certified_by_start",
          swa_certification_reference: "SWA-001",
          certification_received_on: "2025-01-15",
          certification_received_before_claim_confirmed: true,
          revocation: { status: "no_notice_received" },
        },
        qualified_wages_confirmed: true,
        not_prior_employee_confirmed: true,
        not_related_or_dependent_confirmed: true,
        more_than_half_wages_for_trade_or_business_confirmed: true,
        excluded_wages_removed_confirmed: true,
        wage_records: [{
          payroll_record_reference: "PAY-001",
          deduction_location: {
            kind: "schedule_c",
            business_reference: "BUSINESS-1",
          },
          service_period_start_on: "2025-02-01",
          service_period_end_on: "2025-02-28",
          paid_or_incurred_on: "2025-02-28",
          qualified_wages: 6_000,
        }],
        hours_worked: 400,
      }],
      pass_through_credits: [{
        source_type: "partnership",
        entity_ein: "123456789",
        source_document_reference: "2025 K-1 box 15 code J",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    },
    f3800: {
      f5884_credit: {
        credit_amount: 3_650,
        subject_to_passive_activity_limit: false,
      },
      form5884_applied_credits_by_source: [600, 400],
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 1_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 0,
        tentativeMinimumTax: 0,
        standardCredit: 0,
        specifiedCredit: 3_650,
      },
      allowed_credit: 1_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS5884 ");
  assertStringIncludes(xml, "<Frm5884CYAggrgtAmtGrp");
  await validateXsd(xml, "mixed Form 5884 sources on Form 3800 Part V");
});

Deno.test({
  name: "XSD: 2025 Schedule 2 line 1a Form 8962 repayment precedes line 2 AMT",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule2: {
      line1a_excess_advance_premium: 1_200,
      line2_amt: 5_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1200</PremiumTaxCreditTaxLiabAmt>",
  );
  assertStringIncludes(
    xml,
    "<AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt>",
  );
  await validateXsd(xml, "2025 Schedule 2 PTC repayment and AMT");
});

Deno.test({
  name:
    "XSD: 1095-A excess advance credit reaches Form 8962, Schedule 2 line 1a, and Form 1040",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(75_300, 10_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-REPAYMENT",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      annual_premium: 7_200,
      annual_slcsp: 7_200,
      annual_aptc: 1_800,
      monthly_premiums: Array(12).fill(600),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(150),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 1_001);
  assertEquals(result.pending.f1040?.line17_additional_taxes, 1_001);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PremiumTaxCreditTaxLiabAmt>1001</PremiumTaxCreditTaxLiabAmt>",
  );
  assertStringIncludes(xml, "<IRS8962 ");
  await validateXsd(xml, "1095-A Form 8962 repayment");
});

Deno.test("annual-only 1095-A totals cannot claim Form 8962 line 11", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(30_120, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      annual_premium: 6_000,
      annual_slcsp: 6_000,
      annual_aptc: 1_000,
    }],
  });
  assertEquals(result.pending.form8962?.total_premium_tax_credit, undefined);
  assertEquals(
    result.diagnostics.some((diagnostic) =>
      diagnostic.nodeType === "form8962" &&
      diagnostic.message.includes("annual line 11 needs verified full-year")
    ),
    true,
  );
});

Deno.test({
  name:
    "XSD: monthly 1095-A without APTC reaches Form 8962 monthly rows and Schedule 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    taxpayer_can_be_claimed_as_dependent: false,
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-NO-APTC",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: [...Array(11).fill(600), 601],
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcSlcspDeterminations(
        Array(12).fill(500),
        [...Array(11).fill(600), 601],
      ),
      no_aptc_monthly_evidence: noAptcPaymentEvidence(
        Array(12).fill(500),
        [...Array(11).fill(600), 601],
      ),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 6_000);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 6_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>6000</TotalPremiumTaxCreditAmt>",
  );
  await validateXsd(xml, "monthly 1095-A without APTC");
});

Deno.test({
  name:
    "XSD: below-100%-FPL Marketplace exception reaches Form 8962 and Schedule 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    ptc_below_100_fpl_status: {
      basis: "marketplace_estimate",
      no_one_can_claim_taxpayer: true,
      marketplace_coverage: true,
      marketplace_estimated_at_least_100_fpl: true,
      marketplace_information_provided_in_good_faith: true,
      otherwise_applicable_taxpayer: true,
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(10_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-BELOW-100",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: Array(12).fill(350),
      monthly_aptcs: Array(12).fill(100),
      annual_premium: 3_000,
      annual_slcsp: 4_200,
      annual_aptc: 1_200,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.federal_poverty_pct, 66);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 3_000);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 1_800);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FederalPovertyLevelPct>66</FederalPovertyLevelPct>",
  );
  assertStringIncludes(
    xml,
    "<ReconciledPremiumTaxCreditAmt>1800</ReconciledPremiumTaxCreditAmt>",
  );
  await validateXsd(xml, "below-100%-FPL Marketplace exception");
});

Deno.test({
  name:
    "XSD: below-100%-FPL non-applicable taxpayer files APTC-only annual group",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    taxpayer_can_be_claimed_as_dependent: false,
    ptc_below_100_fpl_status: nonApplicableBelowFpl,
  };
  const result = runReturn({
    general,
    w2: [w2Item(10_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-APTC-ANNUAL",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: Array(12).fill(350),
      monthly_aptcs: Array(12).fill(200),
      annual_aptc: 2_400,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 0);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 375);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>2400</AnnualAdvancedPTCAmt>",
  );
  assertEquals(xml.includes("<AnnualPremiumAmt>"), false);
  assertEquals(xml.includes("<ApplicableFigureRt>"), false);
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        schedule2: {
          ...result.pending.schedule2,
          line1a_excess_advance_premium: 374,
        },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "below-100% APTC-only filing differs",
  );
  await validateXsd(xml, "below-100%-FPL APTC-only annual repayment");
});

Deno.test({
  name:
    "XSD: below-100%-FPL non-applicable taxpayer files APTC-only monthly rows",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    taxpayer_can_be_claimed_as_dependent: false,
    ptc_below_100_fpl_status: nonApplicableBelowFpl,
  };
  const result = runReturn({
    general,
    w2: [w2Item(10_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-APTC-MONTHLY",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: [...Array(11).fill(350), 400],
      monthly_aptcs: Array(12).fill(200),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 375);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>200</MonthlyAdvancedPTCAmt>",
  );
  assertEquals(xml.includes("<MonthlyPremiumAmt>"), false);
  assertEquals(xml.includes("<MonthlyPremiumSLCSPAmt>"), false);
  await validateXsd(xml, "below-100%-FPL APTC-only monthly repayment");
});

Deno.test({
  name: "XSD: MFS without exception files family-only APTC repayment",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "no_exception",
      exception_reviewed: true,
      no_one_can_claim_taxpayer: true,
      policy_scope: "family_only",
      all_covered_individuals_lawfully_present: true,
      no_self_employed_health_insurance_deduction: true,
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-MFS-REPAYMENT",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(250),
      monthly_slcsps: Array(12).fill(350),
      monthly_aptcs: Array(12).fill(200),
      annual_premium: 3_000,
      annual_slcsp: 4_200,
      annual_aptc: 2_400,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 0);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 750);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<AnnualAdvancedPTCAmt>2400</AnnualAdvancedPTCAmt>",
  );
  assertEquals(xml.includes("<AnnualPremiumAmt>"), false);
  assertEquals(xml.includes("<MarriedFilingSeparatelyExcInd>"), false);
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        form8962: { ...result.pending.form8962, annual_aptc: 2_401 },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "Form 8962 MFS APTC-only filing differs",
  );
  await validateXsd(xml, "MFS APTC-only repayment without exception");
});

Deno.test({
  name: "XSD: MFS abuse exception marks Form 8962 line A and claims PTC",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "domestic_abuse",
      living_apart_at_filing: true,
      unable_to_file_joint_due_to_exception: true,
      prior_consecutive_exception_years: 0,
      no_one_can_claim_taxpayer: true,
      policy_scope: "family_only",
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-MFS-EXCEPTION",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(100),
      annual_premium: 6_000,
      annual_slcsp: 7_200,
      annual_aptc: 1_200,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.mfs_exception_ind, true);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 4_800);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<MarriedFilingSeparatelyExcInd>X</MarriedFilingSeparatelyExcInd>",
  );
  await validateXsd(xml, "MFS Form 8962 abuse exception");
});

Deno.test({
  name:
    "XSD: shared MFS policy without exception allocates only APTC in Part IV",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "no_exception",
      exception_reviewed: true,
      no_one_can_claim_taxpayer: true,
      policy_scope: "shared_with_spouse",
      all_covered_individuals_lawfully_present: true,
      no_self_employed_health_insurance_deduction: true,
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "MFS-POLICY-1",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333", "222334444"],
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [{
        basis: "mfs_no_exception",
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 12,
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_advance_ptc, 4_800);
  assertEquals(result.pending.schedule2?.line1a_excess_advance_premium, 750);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<SharePolicyMarriedAltCalcInd>true</SharePolicyMarriedAltCalcInd>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCPct>0.50</MonthlyAdvancedPTCPct>",
  );
  assertEquals(xml.includes("<MonthlyPremiumPct>"), false);
  assertEquals(xml.includes("<MonthlyPremiumSLCSPPct>"), false);
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        f1095a: {
          f1095as: [{
            ...(result.pending.f1095a.f1095as as Record<string, unknown>[])[0],
            covered_individual_ssns: ["111223333", "333445555"],
          }],
        },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "identified spouse policy",
  );
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        schedule2: {
          ...result.pending.schedule2,
          line1a_excess_advance_premium: 749,
        },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "differs from finalized return",
  );
  await validateXsd(xml, "shared MFS APTC-only allocation");
});

Deno.test({
  name:
    "XSD: shared MFS exception allocates premium and APTC but not family SLCSP",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFS,
    spouse_first_name: "Other",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "222-33-4444",
    mfs_spouse_itemizing: false,
    ptc_mfs_status: {
      basis: "domestic_abuse",
      living_apart_at_filing: true,
      unable_to_file_joint_due_to_exception: true,
      prior_consecutive_exception_years: 0,
      no_one_can_claim_taxpayer: true,
      policy_scope: "shared_with_spouse",
    },
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 0)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "MFS-POLICY-1",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333", "222334444"],
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [{
        basis: "mfs_exception",
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 12,
        monthly_family_slcsps: Array(12).fill(700),
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 7_200);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 2_400);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.50</MonthlyPremiumPct>");
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCPct>0.50</MonthlyAdvancedPTCPct>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>700</MonthlyPremiumSLCSPAmt>",
  );
  assertEquals(xml.includes("<MonthlyPremiumSLCSPPct>"), false);
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        form8962: {
          ...result.pending.form8962,
          shared_policy_allocations: [{
            ...(result.pending.form8962.shared_policy_allocations as Record<
              string,
              unknown
            >[])[0],
            premium_pct: 0.4,
          }],
        },
      } as unknown as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "identified spouse policy",
  );
  await validateXsd(xml, "shared MFS exception allocation");
});

Deno.test({
  name:
    "XSD: divorced taxpayers' agreed allocation fills all Part IV percentages",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "DIV-POLICY-1",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333", "222334444"],
      monthly_premiums: [1_200, ...Array(11).fill(0)],
      monthly_slcsps: [1_500, ...Array(11).fill(0)],
      monthly_aptcs: [800, ...Array(11).fill(0)],
      shared_policy_periods: [{
        basis: "divorce_agreed",
        divorced_or_legally_separated_in_tax_year: true,
        shared_during_marriage: true,
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 1,
        allocation_pct: 0.67,
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.67</MonthlyPremiumPct>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPPct>0.67</MonthlyPremiumSLCSPPct>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCPct>0.67</MonthlyAdvancedPTCPct>",
  );
  assertStringIncludes(xml, "<MonthlyPremiumAmt>804</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>1005</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyAdvancedPTCAmt>536</MonthlyAdvancedPTCAmt>",
  );
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        form8962: {
          ...result.pending.form8962,
          shared_policy_allocations: [{
            ...(result.pending.form8962?.shared_policy_allocations as Record<
              string,
              unknown
            >[])[0],
            premium_pct: 0.66,
          }],
        },
      } as unknown as MefFormsPending, extractFilerIdentity(general)),
    Error,
  );
  await validateXsd(xml, "divorce agreed policy allocation");
});

Deno.test({
  name: "XSD: no-APTC shared policy allocates only premium in Part IV",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "NO-APTC-POLICY",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333", "222334444"],
      monthly_premiums: [15_000, ...Array(11).fill(0)],
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcSlcspDeterminations(
        [15_000, ...Array(11).fill(0)],
        [12_000, ...Array(11).fill(0)],
      ),
      no_aptc_monthly_evidence: noAptcPaymentEvidence(
        [15_000, ...Array(11).fill(0)],
        [12_000, ...Array(11).fill(0)],
      ),
      shared_policy_periods: [{
        basis: "no_aptc",
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 1,
        monthly_family_slcsps: [12_000, ...Array(11).fill(0)],
        monthly_other_family_slcsps: [6_000, ...Array(11).fill(0)],
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.67</MonthlyPremiumPct>");
  assertEquals(xml.includes("<MonthlyPremiumSLCSPPct>"), false);
  assertEquals(xml.includes("<MonthlyAdvancedPTCPct>"), false);
  assertStringIncludes(xml, "<MonthlyPremiumAmt>10000</MonthlyPremiumAmt>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>12000</MonthlyPremiumSLCSPAmt>",
  );
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        f1095a: {
          f1095as: [{
            ...(result.pending.f1095a?.f1095as as Record<string, unknown>[])[0],
            no_aptc_monthly_evidence: [{
              ...((result.pending.f1095a?.f1095as as Record<string, unknown>[])[
                0
              ].no_aptc_monthly_evidence as Record<string, unknown>[])[0],
              premium_paid: 14_999,
            }],
          }],
        },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "timely full payment",
  );
  await validateXsd(xml, "no-APTC shared policy allocation");
});

Deno.test({
  name: "XSD: one Marketplace policy emits two nonoverlapping Part IV periods",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const period = {
    basis: "other_agreed",
    situations_1_to_3_reviewed_and_inapplicable: true,
    other_taxpayer_ssn: "222-33-4444",
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "SPLIT-POLICY",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333", "222334444"],
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [
        { ...period, start_month: 1, end_month: 6, allocation_pct: 0.2 },
        { ...period, start_month: 7, end_month: 12, allocation_pct: 0.8 },
      ],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length, 2);
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.20</MonthlyPremiumPct>");
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.80</MonthlyPremiumPct>");
  assertStringIncludes(xml, "<StartMonthNumberCd>07</StartMonthNumberCd>");
  await validateXsd(xml, "two shared-policy periods");
});

Deno.test({
  name: "XSD: one policy has shared months followed by family-only months",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "MIXED-POLICY",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333", "222334444"],
      monthly_premiums: Array(12).fill(1_200),
      monthly_slcsps: Array(12).fill(1_500),
      monthly_aptcs: Array(12).fill(800),
      shared_policy_periods: [{
        basis: "divorce_agreed",
        divorced_or_legally_separated_in_tax_year: true,
        shared_during_marriage: true,
        other_taxpayer_ssn: "222-33-4444",
        start_month: 1,
        end_month: 6,
        allocation_pct: 0.5,
      }, {
        basis: "family_only",
        only_tax_family_covered: true,
        start_month: 7,
        end_month: 12,
        monthly_family_slcsps: [
          ...Array(6).fill(0),
          ...Array(6).fill(900),
        ],
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length, 1);
  assertStringIncludes(xml, "<MonthlyPremiumPct>0.50</MonthlyPremiumPct>");
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>750</MonthlyPremiumSLCSPAmt>",
  );
  assertStringIncludes(
    xml,
    "<MonthlyPremiumSLCSPAmt>900</MonthlyPremiumSLCSPAmt>",
  );
  await validateXsd(xml, "shared then family-only policy months");
});

Deno.test({
  name: "XSD: five Part IV allocations use repeated MeF groups and line 34 No",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(30_000, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "FIVE-PERIODS",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333", "222334444"],
      monthly_premiums: [...Array(5).fill(1_200), ...Array(7).fill(0)],
      monthly_slcsps: [...Array(5).fill(1_500), ...Array(7).fill(0)],
      monthly_aptcs: [...Array(5).fill(800), ...Array(7).fill(0)],
      shared_policy_periods: Array.from({ length: 5 }, (_, index) => ({
        basis: "other_agreed",
        situations_1_to_3_reviewed_and_inapplicable: true,
        other_taxpayer_ssn: "222-33-4444",
        start_month: index + 1,
        end_month: index + 1,
        allocation_pct: (index + 1) / 10,
      })),
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<SharedPolicyAllocationGrp>/g) ?? []).length, 5);
  assertStringIncludes(
    xml,
    "<SharedPolicyAllocationInfoInd>false</SharedPolicyAllocationInfoInd>",
  );
  assertStringIncludes(xml, "<StartMonthNumberCd>05</StartMonthNumberCd>");
  await validateXsd(xml, "five Part IV allocation groups");
});

Deno.test({
  name: "XSD: two same-state Marketplace policies use one SLCSP benchmark",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    taxpayer_can_be_claimed_as_dependent: false,
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [
      {
        issuer_name: "First Marketplace Plan",
        policy_number: "POLICY-TWO-MONTHLY-1",
        coverage_state: "TX",
        covered_individual_ssns: ["111223333"],
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
        slcsp_corrections: noAptcSlcspDeterminations(
          Array(12).fill(500),
          Array(12).fill(600),
        ),
        no_aptc_monthly_evidence: noAptcPaymentEvidence(
          Array(12).fill(500),
          Array(12).fill(600),
        ),
      },
      {
        issuer_name: "Second Marketplace Plan",
        policy_number: "POLICY-TWO-MONTHLY-2",
        coverage_state: "TX",
        covered_individual_ssns: ["111223333"],
        monthly_premiums: [...Array(11).fill(300), 301],
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
        slcsp_corrections: noAptcSlcspDeterminations(
          [...Array(11).fill(300), 301],
          Array(12).fill(600),
        ),
        no_aptc_monthly_evidence: noAptcPaymentEvidence(
          [...Array(11).fill(300), 301],
          Array(12).fill(600),
        ),
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 6_600);
  assertEquals(result.pending.schedule3?.line9_premium_tax_credit, 6_600);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<MonthlyPTCCalculationGrp>/g)?.length, 12);
  assertStringIncludes(
    xml,
    "<TotalPremiumTaxCreditAmt>6600</TotalPremiumTaxCreditAmt>",
  );
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        form8962: {
          ...result.pending.form8962,
          monthly_ptc_rows: (
            result.pending.form8962?.monthly_ptc_rows as Array<
              Record<string, unknown>
            >
          ).map((row, index) => index === 0 ? { ...row, premium: 799 } : row),
        },
      } as unknown as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "two-policy month 1 differs",
  );
  await validateXsd(xml, "two same-state policies with one SLCSP");
});

Deno.test({
  name: "XSD: two unchanged full-year policies use annual Form 8962 line 11",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    taxpayer_can_be_claimed_as_dependent: false,
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [
      {
        issuer_name: "First Marketplace Plan",
        policy_number: "POLICY-TWO-ANNUAL-1",
        coverage_state: "TX",
        covered_individual_ssns: ["111223333"],
        annual_premium: 6_000,
        annual_slcsp: 7_200,
        annual_aptc: 0,
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
        slcsp_corrections: noAptcSlcspDeterminations(
          Array(12).fill(500),
          Array(12).fill(600),
        ),
        no_aptc_monthly_evidence: noAptcPaymentEvidence(
          Array(12).fill(500),
          Array(12).fill(600),
        ),
      },
      {
        issuer_name: "Second Marketplace Plan",
        policy_number: "POLICY-TWO-ANNUAL-2",
        coverage_state: "TX",
        covered_individual_ssns: ["111223333"],
        annual_premium: 3_600,
        annual_slcsp: 7_200,
        annual_aptc: 0,
        monthly_premiums: Array(12).fill(300),
        monthly_slcsps: Array(12).fill(600),
        monthly_aptcs: Array(12).fill(0),
        slcsp_corrections: noAptcSlcspDeterminations(
          Array(12).fill(300),
          Array(12).fill(600),
        ),
        no_aptc_monthly_evidence: noAptcPaymentEvidence(
          Array(12).fill(300),
          Array(12).fill(600),
        ),
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.total_premium_tax_credit, 6_598);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<AnnualPTCCalculationGrp>");
  assertEquals(xml.includes("<MonthlyPTCCalculationGrp>"), false);
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        form8962: {
          ...result.pending.form8962,
          annual_slcsp: 14_400,
        },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "two-policy annual credit differs",
  );
  await validateXsd(xml, "two unchanged full-year policies on line 11");
});

Deno.test({
  name:
    "XSD: 1099-INT tax-exempt interest enters Form 8962 modified AGI but not 1040 AGI",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    taxpayer_can_be_claimed_as_dependent: false,
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1099int: [{ payer_name: "Municipal Bond", box8: 5_000 }],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-TAX-EXEMPT",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      annual_premium: 6_000,
      annual_slcsp: 6_000,
      annual_aptc: 0,
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: Array(12).fill(500),
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcSlcspDeterminations(
        Array(12).fill(500),
        Array(12).fill(500),
      ),
      no_aptc_monthly_evidence: noAptcPaymentEvidence(
        Array(12).fill(500),
        Array(12).fill(500),
      ),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line11_agi, 30_120);
  assertEquals(result.pending.form8962?.household_income, 35_120);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>35120</ModifiedAGIAmt>");
  assertStringIncludes(xml, "<HouseholdIncomeAmt>35120</HouseholdIncomeAmt>");
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        f1099int: {
          f1099ints: [{ payer_name: "Municipal Bond", box8: 4_999 }],
        },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "tax-exempt MAGI needs matching Form 1099-INT source",
  );
  await validateXsd(xml, "1099-INT tax-exempt interest and Form 8962 MAGI");
});

Deno.test({
  name:
    "XSD: required-filing dependent MAGI enters Form 8962 line 2b and line 3",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    taxpayer_can_be_claimed_as_dependent: false,
    dependents: [{
      first_name: "Child",
      last_name: "Taxpayer",
      name_control: "TAXP",
      ssn: "222-33-4444",
      dob: "2010-01-01",
      relationship: "daughter",
      irs_relationship_code: "DAUGHTER",
      months_in_home: 12,
      filed_joint_return_except_refund_only: false,
      provided_over_half_own_support: false,
      ptc_tax_return: {
        filing: "required",
        filed_form1040: {
          source_document_id: "child-2025-1040",
          taxpayer_ssn: "222-33-4444",
          tax_year: 2025,
          filing_status: "single",
          blind: false,
          line1z_wages: 0,
          line2a_tax_exempt_interest: 500,
          line2b_taxable_interest: 12_000,
          line3b_dividends: 0,
          line4b_ira: 0,
          line5b_pensions: 0,
          line6b_social_security: 0,
          line7a_capital_gain: 0,
          line8_additional_income: 0,
          line10_adjustments: 0,
          line11b_agi: 12_000,
        },
        interest_forms1099: [{
          source_document_id: "child-2025-1099-int",
          recipient_ssn: "222-33-4444",
          box1_taxable_interest: 12_000,
          box8_tax_exempt_interest: 500,
        }],
      },
    }],
  };
  const result = runReturn({
    general,
    w2: [w2Item(30_120, 3_000)],
    f1095a: [{
      issuer_name: "Marketplace Plan",
      policy_number: "POLICY-DEPENDENT-MAGI",
      coverage_state: "TX",
      covered_individual_ssns: ["111223333"],
      annual_premium: 6_000,
      annual_slcsp: 7_200,
      annual_aptc: 0,
      monthly_premiums: Array(12).fill(500),
      monthly_slcsps: Array(12).fill(600),
      monthly_aptcs: Array(12).fill(0),
      slcsp_corrections: noAptcSlcspDeterminations(
        Array(12).fill(500),
        Array(12).fill(600),
      ),
      no_aptc_monthly_evidence: noAptcPaymentEvidence(
        Array(12).fill(500),
        Array(12).fill(600),
      ),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8962?.taxpayer_modified_agi, 30_120);
  assertEquals(result.pending.form8962?.dependents_modified_agi, 12_500);
  assertEquals(result.pending.form8962?.household_income, 42_620);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>30120</ModifiedAGIAmt>");
  assertStringIncludes(
    xml,
    "<TotalDependentsModifiedAGIAmt>12500</TotalDependentsModifiedAGIAmt>",
  );
  assertStringIncludes(xml, "<HouseholdIncomeAmt>42620</HouseholdIncomeAmt>");
  assertThrows(
    () =>
      buildMefXml({
        ...result.pending,
        form8962: {
          ...result.pending.form8962,
          dependents_modified_agi: 12_501,
          household_income: 42_621,
        },
      } as MefFormsPending, extractFilerIdentity(general)),
    Error,
    "dependent",
  );
  await validateXsd(xml, "Form 8962 dependent modified AGI");
});

Deno.test({
  name: "XSD: Form 4137 employer tips and calculated taxes",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    w2: {
      w2s: [{
        employer_name: "CAFE",
        employer_ein: "123456789",
        employer_address_line1: "100 Main St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        box1_wages: 30_000,
        box2_fed_withheld: 0,
        box3_ss_wages: 30_000,
      }],
    },
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 5_000,
          tips_reported: 2_000,
        }],
        ss_wages_from_w2: 30_000,
      }],
      w2_tip_sources: [{
        employer_name: "CAFE",
        employer_ein: "123456789",
        allocated_tips: 0,
        ss_wages_and_tips: 30_000,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<UnreportedTipIncomePerEmployer>");
  await validateXsd(xml, "Form 4137 employer tips");
});

Deno.test({
  name: "XSD: Form 4137 line 6 feeds Form 8959 line 2 and Schedule 2",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [{
      employer_name: "CAFE",
      employer_ein: "123456789",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 190_000,
      box2_fed_withheld: 30_000,
      box3_ss_wages: 176_100,
      box5_medicare_wages: 198_000,
      box6_medicare_withheld: 2_871,
      box8_allocated_tips: 4_000,
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 4_000,
          tips_reported: 0,
        }],
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line2_unreported_tips, 4_000);
  assertEquals(result.pending.form8959?.line7_wage_tax, 18);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalUnreportedMedicareTipsAmt>4000</TotalUnreportedMedicareTipsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalW2MedicareWagesAndTipsAmt>198000</TotalW2MedicareWagesAndTipsAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdditionalMedicareTaxAmt>18</AdditionalMedicareTaxAmt>",
  );
  await validateXsd(xml, "Form 4137 to Form 8959 and Schedule 2");
});

Deno.test({
  name:
    "XSD: joint return retains Form 8959 for one W-2 over $200,000 with zero tax",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Sam",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "444-55-6666",
  };
  const result = runReturn({
    general,
    w2: [{
      employee_ssn: "111-22-3333",
      employer_name: "ACME",
      employer_ein: "123456789",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 220_000,
      box2_fed_withheld: 30_000,
      box5_medicare_wages: 220_000,
      box6_medicare_withheld: 3_190,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line18_total_tax, 0);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS8959 ");
  assertStringIncludes(
    xml,
    "<TotalW2MedicareWagesAndTipsAmt>220000</TotalW2MedicareWagesAndTipsAmt>",
  );
  assertStringIncludes(xml, "<TotalAMRRTTaxAmt>0</TotalAMRRTTaxAmt>");
  await validateXsd(xml, "joint Form 8959 with zero additional tax");
});

Deno.test({
  name: "XSD: qualifying surviving spouse uses Form 8959 $200,000 threshold",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.QSS,
  };
  const result = runReturn({
    general,
    w2: [{
      employee_ssn: "111-22-3333",
      employer_name: "ACME",
      employer_ein: "123456789",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 205_000,
      box2_fed_withheld: 30_000,
      box5_medicare_wages: 205_000,
      box6_medicare_withheld: 3_017.50,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 45);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FilingStatusThresholdCd>200000</FilingStatusThresholdCd>",
  );
  assertStringIncludes(
    xml,
    "<AdditionalMedicareTaxAmt>45</AdditionalMedicareTaxAmt>",
  );
  await validateXsd(xml, "qualifying surviving spouse Form 8959");
});

Deno.test({
  name: "XSD: joint return retains Form 8959 for one RRTA W-2 over $200,000",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Sam",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "444-55-6666",
  };
  const result = runReturn({
    general,
    w2: [{
      employee_ssn: "111-22-3333",
      employer_name: "RAIL",
      employer_ein: "123456789",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 220_000,
      box2_fed_withheld: 30_000,
      box14_entries: [{
        description: "RRTA compensation",
        amount: 220_000,
        is_state_sdi_pfml: false,
      }],
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line18_total_tax, 0);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalRailroadRetirementCompAmt>220000</TotalRailroadRetirementCompAmt>",
  );
  assertStringIncludes(xml, "<TotalAMRRTTaxAmt>0</TotalAMRRTTaxAmt>");
  await validateXsd(xml, "joint RRTA Form 8959 with zero additional tax");
});

Deno.test({
  name: "XSD: Form CT-2 quarterly compensation and tax paid reach Form 8959",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [{
      employee_ssn: "111-22-3333",
      employer_name: "Rail Union",
      employer_ein: "123456789",
      employer_address_line1: "100 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 220_000,
      box2_fed_withheld: 30_000,
    }],
    ct2: [
      {
        recipient: "taxpayer",
        recipient_ssn: "111-22-3333",
        tax_year: 2025,
        quarter: 1,
        line2_tier1_medicare_compensation: 50_000,
        line3_additional_medicare_compensation: 0,
        line3_additional_medicare_tax_paid: 0,
      },
      {
        recipient: "taxpayer",
        recipient_ssn: "111-22-3333",
        tax_year: 2025,
        quarter: 2,
        line2_tier1_medicare_compensation: 50_000,
        line3_additional_medicare_compensation: 0,
        line3_additional_medicare_tax_paid: 0,
      },
      {
        recipient: "taxpayer",
        recipient_ssn: "111-22-3333",
        tax_year: 2025,
        quarter: 3,
        line2_tier1_medicare_compensation: 50_000,
        line3_additional_medicare_compensation: 0,
        line3_additional_medicare_tax_paid: 0,
      },
      {
        recipient: "taxpayer",
        recipient_ssn: "111-22-3333",
        tax_year: 2025,
        quarter: 4,
        line2_tier1_medicare_compensation: 70_000,
        line3_additional_medicare_compensation: 20_000,
        line3_additional_medicare_tax_paid: 180,
        payment_reference: "EFTPS-Q4-2025-001",
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8959?.line14_rrta_wages, 220_000);
  assertEquals(result.pending.form8959?.line23_rrta_withheld, 180);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalRailroadRetirementCompAmt>220000</TotalRailroadRetirementCompAmt>",
  );
  assertStringIncludes(xml, "<TotalW2AddlRRTTaxAmt>180</TotalW2AddlRRTTaxAmt>");
  await validateXsd(xml, "Form CT-2 to Form 8959");
});

Deno.test({
  name: "XSD: RRTA W-2 box 14 feeds Form 4137 line 8 and Form 8959 Part III",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [
      {
        employee_ssn: "111-22-3333",
        employer_name: "CAFE",
        employer_ein: "123456789",
        employer_address_line1: "100 Main St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        box1_wages: 50_000,
        box2_fed_withheld: 5_000,
        box3_ss_wages: 50_000,
        box5_medicare_wages: 50_000,
        box6_medicare_withheld: 725,
        box8_allocated_tips: 3_000,
      },
      {
        employee_ssn: "111-22-3333",
        employer_name: "RAIL",
        employer_ein: "987654321",
        employer_address_line1: "200 Rail St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        box1_wages: 220_000,
        box2_fed_withheld: 30_000,
        box14_entries: [
          {
            description: "RRTA compensation",
            amount: 220_000,
            is_state_sdi_pfml: false,
          },
          {
            description: "Additional Medicare Tax",
            amount: 180,
            is_state_sdi_pfml: false,
          },
        ],
      },
    ],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "123456789",
          tips_received: 3_000,
          tips_reported: 0,
        }],
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2?.line5_unreported_tip_tax, 44);
  assertEquals(result.pending.schedule2?.line11_additional_medicare, 180);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<Desc>RRTA compensation</Desc><Amt>220000</Amt>");
  assertStringIncludes(
    xml,
    "<SocialSecurityWagesAndTipsAmt>226100</SocialSecurityWagesAndTipsAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalRailroadRetirementCompAmt>220000</TotalRailroadRetirementCompAmt>",
  );
  assertStringIncludes(xml, "<TotalW2AddlRRTTaxAmt>180</TotalW2AddlRRTTaxAmt>");
  await validateXsd(xml, "RRTA Form 4137 and Form 8959 source chain");
});

Deno.test({
  name:
    "XSD: joint return has distinct taxpayer and spouse Form 4137 documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = {
    ...singleGeneral(),
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Sam",
    spouse_last_name: "Tipster",
    spouse_ssn: "222-33-4444",
  };
  const xml = buildMefXml({
    w2: {
      w2s: [
        {
          employee_ssn: "111-22-3333",
          employer_name: "CAFE",
          employer_ein: "123456789",
          employer_address_line1: "100 Main St",
          employer_address_city: "Austin",
          employer_address_state: "TX",
          employer_address_zip: "78701",
          box1_wages: 30_000,
          box2_fed_withheld: 0,
          box3_ss_wages: 30_000,
        },
        {
          employee_ssn: "222-33-4444",
          employer_name: "DINER",
          employer_ein: "987654321",
          employer_address_line1: "200 Main St",
          employer_address_city: "Austin",
          employer_address_state: "TX",
          employer_address_zip: "78701",
          box1_wages: 176_100,
          box2_fed_withheld: 0,
          box3_ss_wages: 176_100,
        },
      ],
    },
    form4137: {
      forms: [
        {
          recipient: "taxpayer",
          employers: [{
            name: "CAFE",
            ein: "123456789",
            tips_received: 5_000,
            tips_reported: 2_000,
          }],
          ss_wages_from_w2: 30_000,
        },
        {
          recipient: "spouse",
          employers: [{
            name: "DINER",
            ein: "987654321",
            tips_received: 1_000,
            tips_reported: 0,
          }],
          ss_wages_from_w2: 176_100,
        },
      ],
      taxpayer_ssn: "111-22-3333",
      spouse_ssn: "222-33-4444",
      w2_tip_sources: [
        {
          employee_ssn: "111-22-3333",
          employer_name: "CAFE",
          employer_ein: "123456789",
          allocated_tips: 0,
          ss_wages_and_tips: 30_000,
        },
        {
          employee_ssn: "222-33-4444",
          employer_name: "DINER",
          employer_ein: "987654321",
          allocated_tips: 0,
          ss_wages_and_tips: 176_100,
        },
      ],
    },
  }, extractFilerIdentity(general));
  assertEquals((xml.match(/<IRS4137\b/g) ?? []).length, 2);
  assertStringIncludes(xml, "<SSN>111223333</SSN>");
  assertStringIncludes(xml, "<SSN>222334444</SSN>");
  await validateXsd(xml, "joint taxpayer and spouse Forms 4137");
});

Deno.test({
  name:
    "XSD: Schedule F and Form 4835 elections link distinct CCC and crop statements",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    f4835: {
      f4835s: [{
        activity_name: "Rented south field",
        livestock_crop_income: 0,
        ccc_loans_reported_election: 1_000,
        ccc_loan_details: [{ description: "RENTAL WHEAT LOAN", amount: 1_000 }],
      }],
    },
    schedule_f: {
      schedule_fs: [{
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line5a_ccc_loans_election: 2_000,
        line5a_ccc_loan_details: [{
          description: "OWNER CORN LOAN",
          amount: 2_000,
        }],
        line6a_crop_insurance: 5_000,
        line6b_crop_insurance_taxable: 0,
        line6c_defer_crop_insurance: true,
        line6c_crop_insurance_deferral_details: {
          cash_method: true,
          normal_practice_next_year_percent: 80,
          damaged_crops: [{
            crop: "CORN",
            damage_date: "2025-08-01",
            cause: "HAIL",
          }],
          payments: [{
            crop: "CORN",
            received_date: "2025-10-01",
            amount: 5_000,
            carrier: "FARM INSURER",
          }],
        },
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    '<CCCLoanReportedElectionAmt referenceDocumentId="CCCLoanDetailCashMethodStmt',
  );
  assertStringIncludes(
    xml,
    '<ElectionDeferCropInsProcInd referenceDocumentId="PostponementCropInsDsstrStmt',
  );
  assertStringIncludes(xml, "<LoanDesc>RENTAL WHEAT LOAN</LoanDesc>");
  assertStringIncludes(xml, "<LoanDesc>OWNER CORN LOAN</LoanDesc>");
  await validateXsd(xml, "Schedule F and Form 4835 farm elections");
});

Deno.test({
  name:
    "XSD: two cash-method Schedule F farms preserve detailed income and expenses",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_f: {
      schedule_fs: [
        {
          line_a_principal_crop_activity: "GRAIN FARMING",
          line_b_agricultural_activity_code: "111100",
          line_e_material_participation: true,
          accounting_method: "cash",
          line1_sales_livestock_resale: 50_000,
          line1b_cost_livestock_resale: 30_000,
          line2_sales_products_raised: 8_000,
          line5b_ccc_loans_forfeited: 4_000,
          line5c_ccc_loans_forfeited_taxable: 2_000,
          line16_feed: 3_000,
          line32_other_expenses: [{ description: "SOFTWARE", amount: 500 }],
          line36_at_risk: "a",
        },
        {
          line_a_principal_crop_activity: "BEEF CATTLE",
          line_b_agricultural_activity_code: "112111",
          line_e_material_participation: true,
          accounting_method: "cash",
          line1_sales_livestock_resale: 0,
          line2_sales_products_raised: 1_000,
        },
      ],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleF documentId="IRS1040ScheduleF1">',
  );
  assertStringIncludes(
    xml,
    '<IRS1040ScheduleF documentId="IRS1040ScheduleF2">',
  );
  await validateXsd(xml, "two Schedule F cash-method farms");
});

Deno.test({
  name: "XSD: accrual Schedule F Part III and CCC election statement",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_f: {
      schedule_fs: [{
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_e_material_participation: true,
        accounting_method: "accrual",
        part_iii: {
          line37_sales_products: 20_000,
          line38a_cooperative_distributions: 1_000,
          line38b_cooperative_distributions_taxable: 1_000,
          line40a_ccc_loans_election: 2_000,
          line40a_ccc_loan_details: [{
            description: "WHEAT LOAN",
            amount: 2_000,
          }],
          line45_beginning_inventory: 3_000,
          line46_products_purchased: 2_000,
          line48_ending_inventory: 6_000,
          inventory_method: "farm_price",
        },
        line16_feed: 1_000,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    'referenceDocumentName="CCCLoanDetailAccrualMethodStatement"',
  );
  assertStringIncludes(xml, "<GrossIncomeAmt>24000</GrossIncomeAmt>");
  await validateXsd(xml, "accrual Schedule F and CCC election");
});

const businessCasualty = {
  business_fmv_before: 80_000,
  business_fmv_after: 50_000,
  business_basis: 50_000,
  business_insurance: 0,
  business_is_section_1231: true,
  business_property_description: "Workshop equipment",
  business_property_location: "Austin, TX",
  business_acquired_date: "2020-04-01",
  business_casualty_date: "2025-06-15",
  business_casualty_description: "Storm damaged workshop equipment",
};

Deno.test({
  name: "XSD: Form 6252 installment sale reaches Schedule D through the graph",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form6252: [{
      property_description: "Vacant land",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      sold_to_related_party: false,
      selling_price_determinable: true,
      selling_price: 100_000,
      mortgage_assumed: 60_000,
      cost_basis: 40_000,
      payments_received: 10_000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<IRS6252 documentId=");
  assertStringIncludes(
    xml,
    "<InstallmentSaleIncomeAmt>30000</InstallmentSaleIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<LTGainOrLossFromFormsAmt>30000</LTGainOrLossFromFormsAmt>",
  );
  await validateXsd(xml, "Form 6252 and linked Schedule D installment gain");
});

Deno.test({
  name: "XSD: Form 6252 business installment gain reaches Form 4797 line 4",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form6252: [{
      property_description: "Business land",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      sold_to_related_party: false,
      selling_price_determinable: true,
      selling_price: 100_000,
      cost_basis: 40_000,
      payments_received: 20_000,
      is_capital_asset: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>12000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>12000</TotalPropertyGainLossAmt>",
  );
  await validateXsd(
    xml,
    "Form 6252 and Form 4797 section 1231 installment gain",
  );
});

Deno.test({
  name: "XSD: three installment sales retain separate Form 6252 documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const common = {
    date_acquired: "2020-01-01",
    date_sold: "2025-03-01",
    sold_to_related_party: false,
    selling_price_determinable: true,
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form6252: [
      {
        ...common,
        property_description: "Land A",
        selling_price: 100_000,
        cost_basis: 40_000,
        payments_received: 10_000,
      },
      {
        ...common,
        property_description: "Land B",
        selling_price: 50_000,
        cost_basis: 25_000,
        payments_received: 10_000,
      },
      {
        ...common,
        property_description: "Business land",
        selling_price: 80_000,
        cost_basis: 40_000,
        payments_received: 20_000,
        is_capital_asset: false,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<IRS6252 documentId=/g) ?? []).length, 3);
  // Schedule D line 11 also includes the $10,000 net section 1231 gain.
  assertStringIncludes(
    xml,
    "<LTGainOrLossFromFormsAmt>21000</LTGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>10000</GainInstallmentSalesFrm6252Amt>",
  );
  await validateXsd(xml, "three Form 6252 installment sales and destinations");
});

Deno.test({
  name:
    "XSD: Form 6252 business gain and K-1 section 1231 gain combine on Form 4797",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Example Partnership",
      box10_net_1231: 20_000,
    }],
    form6252: [{
      property_description: "Business land",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      sold_to_related_party: false,
      selling_price_determinable: true,
      selling_price: 80_000,
      cost_basis: 40_000,
      payments_received: 20_000,
      is_capital_asset: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>10000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>30000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<LTGainOrLossFromFormsAmt>30000</LTGainOrLossFromFormsAmt>",
  );
  await validateXsd(xml, "Form 6252 and K-1 combined section 1231 gain");
});

Deno.test({
  name:
    "XSD: partnership and S-corp section 1231 gains retain Form 4797 line 2 rows",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Partner One",
      box10_net_1231: 10_000,
    }],
    k1_s_corp: [{ corporation_name: "Corp Two", box9_net_1231: 3_000 }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals((xml.match(/<PropertySaleOrExchange>/g) ?? []).length, 2);
  assertStringIncludes(
    xml,
    "<DateAcquiredInheritedCd>FROM SCHEDULE K-1 F1120S</DateAcquiredInheritedCd>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>13000</TotalPropertyGainLossAmt>",
  );
  await validateXsd(xml, "Form 4797 K-1 partnership and S-corp source rows");
});

Deno.test({
  name: "XSD: Form 4684 long-term business casualty links Form 4797 line 14",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    form4684: businessCasualty,
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<NetBusinessPropertyLossAmt>30000</NetBusinessPropertyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<LongTermPropNetGainOrLossAmt>-30000</LongTermPropNetGainOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>-30000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>20000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "Form 4684 and linked Form 4797 business casualty");
});

Deno.test({
  name: "XSD: Form 4797 section 1231 gain and prior-loss recapture validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form4797: { section_1231_gain: 20_000, nonrecaptured_1231_loss: 5_000 },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>20000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<TotalGainLossAmt>15000</TotalGainLossAmt>");
  assertStringIncludes(xml, "<OtherGainLossAmt>5000</OtherGainLossAmt>");
  await validateXsd(xml, "Form 4797 section 1231 prior-loss recapture");
});

Deno.test({
  name: "XSD: Form 4797 section 1231 ordinary loss validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml(
    { form4797: { section_1231_gain: -4_000 } },
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, "<OrdinaryLossAmt>4000</OrdinaryLossAmt>");
  assertStringIncludes(xml, "<OtherGainLossAmt>-4000</OtherGainLossAmt>");
  await validateXsd(xml, "Form 4797 section 1231 ordinary loss");
});

Deno.test({
  name: "XSD: Form 4684 business loss enters Form 4797 line 14",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form4684: { ...businessCasualty, business_fmv_after: 60_000 },
    form4797: { ordinary_gain_form4684: -20_000 },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>-20000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-20000</OtherGainLossAmt>");
  await validateXsd(xml, "Form 4797 line 14 from Form 4684");

  const combined = buildMefXml({
    form4684: {
      ...businessCasualty,
      business_fmv_before: 52_000,
      business_fmv_after: 50_000,
    },
    form4797: {
      section_1231_gain: -4_000,
      ordinary_gain_form4684: -2_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    combined,
    "<TotalOrdinaryGainLossAmt>-6000</TotalOrdinaryGainLossAmt>",
  );
  await validateXsd(
    combined,
    "Form 4797 combined Part I loss and Form 4684 line 14",
  );
});

Deno.test({
  name:
    "XSD: K-1 section 1231 gain reconciles Form 4797 with Schedule D and AGI",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Example Partnership",
      box10_net_1231: 20_000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>20000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>70000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "K-1 section 1231 Form 4797 execution path");
});

Deno.test({
  name: "XSD: K-1 section 1231 loss reaches Form 4797 and Schedule 1",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    k1_partnership: [{
      partnership_name: "Example Partnership",
      box10_net_1231: -4_000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>-4000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-4000</OtherGainLossAmt>");
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>46000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "K-1 section 1231 loss execution path");
});

Deno.test({
  name:
    "XSD: Schedule 1 combines Schedule E and allowed passive loss on line 5",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule1: {
      line4_other_gains: 1_000,
      line5_schedule_e: [12_000, -5_000],
      line6_schedule_f: 2_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>7000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "Schedule 1 line 5");
});

Deno.test({
  name: "XSD: Form 4835 with Schedule E farm reconciliation validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_e: { farm_rental_net: 11300, farm_rental_gross: 12100 },
    f4835: {
      f4835s: [{
        activity_id: "fixture-Farm",
        activity_name: "Farm",
        livestock_crop_income: 10000,
        cooperative_distributions_gross: 1000,
        cooperative_distributions_taxable: 600,
        crop_insurance_disaster_received: 2000,
        crop_insurance_disaster_taxable: 1500,
        expense_feed: 1000,
        expense_other_details: [{ description: "Tolls", amount: 100 }],
        expense_capitalized_263a: 300,
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<IRS1040ScheduleE documentId=");
  assertStringIncludes(xml, "<IRS4835 documentId=");
  await validateXsd(xml, "Form 4835 and Schedule E");
});

Deno.test({
  name: "XSD: Form 4835 input reaches Schedule E and MeF through execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-Farm",
      activity_name: "Farm",
      livestock_crop_income: 8000,
      expense_feed: 1000,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>7000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmingAndFishingIncomeAmt>8000</FarmingAndFishingIncomeAmt>",
  );
  await validateXsd(xml, "Form 4835 execution path");
});

Deno.test({
  name: "XSD: Form 4835 CCC loan election and detail statement validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-Farm",
      activity_name: "Farm",
      livestock_crop_income: 1000,
      ccc_loans_reported_election: 4000,
      ccc_loan_details: [
        { description: "Corn loan", amount: 2500 },
        { description: "Wheat loan", amount: 1500 },
      ],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  const statementId = xml.match(
    /<CCCLoanDetailCashMethodStmt documentId="([^"]+)">/,
  )?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(
    xml,
    `<CCCLoanReportedElectionAmt referenceDocumentId="${statementId}" referenceDocumentName="CCCLoanDetailCashMethodStatement">4000</CCCLoanReportedElectionAmt>`,
  );
  assertStringIncludes(
    xml,
    "<LoanDesc>Corn loan</LoanDesc><LoanAmt>2500</LoanAmt>",
  );
  assertStringIncludes(
    xml,
    "<LoanDesc>Wheat loan</LoanDesc><LoanAmt>1500</LoanAmt>",
  );
  await validateXsd(xml, "Form 4835 CCC loan election");
});

Deno.test({
  name: "XSD: Form 4835 crop insurance deferral statement validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-Farm",
      activity_name: "Farm",
      defer_crop_insurance: true,
      crop_insurance_disaster_received: 5000,
      crop_insurance_disaster_taxable: 1000,
      crop_insurance_deferred_prior_year: 700,
      crop_insurance_deferral_details: {
        cash_method: true,
        normal_practice_next_year_percent: 80,
        damaged_crops: [{
          crop: "Corn",
          damage_date: "2025-08-15",
          cause: "Hail",
        }],
        payments: [{
          crop: "Corn",
          received_date: "2025-10-01",
          amount: 4000,
          carrier: "Farm Mutual",
        }],
      },
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  const statementId = xml.match(
    /<PostponementCropInsDsstrStmt documentId="([^"]+)"/,
  )?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(
    xml,
    `<ElectionDeferCropInsProcInd referenceDocumentId="${statementId}" referenceDocumentName="PostponementOfCropInsuranceAndDisasterPaymentsStatement">X</ElectionDeferCropInsProcInd>`,
  );
  assertStringIncludes(
    xml,
    "<CropInsProcAndDsstrPymtTxblAmt>1000</CropInsProcAndDsstrPymtTxblAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>1700</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<InsuranceCarrierName><BusinessNameLine1Txt>Farm Mutual</BusinessNameLine1Txt></InsuranceCarrierName>",
  );
  await validateXsd(xml, "Form 4835 crop insurance deferral");
});

Deno.test({
  name: "XSD: Form 4835 farm loss is allowed only against passive farm income",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      {
        activity_id: "fixture-Profitable farm",
        activity_name: "Profitable farm",
        livestock_crop_income: 3000,
      },
      {
        activity_id: "fixture-Loss farm",
        activity_name: "Loss farm",
        livestock_crop_income: 0,
        expense_feed: 2000,
        some_investment_not_at_risk: false,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    '<NetFarmRentalIncomeOrLossAmt passiveActivityLossLiteralCd="PAL">-2000</NetFarmRentalIncomeOrLossAmt>',
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>2000</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>1000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>3000</OtherActivityIncomeAmt>",
  );
  await validateXsd(xml, "Form 4835 passive loss offset");
});

Deno.test({
  name: "XSD: Form 4835 passive farm loss is suspended without passive income",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-Loss farm",
      activity_name: "Loss farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>0</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>0</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(xml, "<TotalLossAmt>2000</TotalLossAmt>");
  await validateXsd(xml, "Form 4835 suspended passive loss");
});

Deno.test({
  name: "XSD: active Form 4835 farm rental loss uses the special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-Active farm",
      activity_name: "Active farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: false,
      actively_participated: true,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>2000</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>-2000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>2000</AllowedRentalRealtyLossAmt>",
  );
  await validateXsd(xml, "Form 4835 active rental loss");
});

Deno.test({
  name: "XSD: Schedule E passive income releases Form 4835 farm loss",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental land",
      property_description: "Rental land",
      property_type: 5,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 3000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
    f4835: [{
      activity_id: "fixture-Loss farm",
      activity_name: "Loss farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: false,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>2000</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>-2000</NetFarmRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalSuppIncomeOrLossAmt>1000</TotalSuppIncomeOrLossAmt>",
  );
  await validateXsd(xml, "Schedule E income and Form 4835 loss");
});

Deno.test({
  name: "XSD: Form 4835 at-risk limit precedes its passive-loss allocation",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      {
        activity_id: "fixture-Profit farm",
        activity_name: "Profit farm",
        livestock_crop_income: 1000,
      },
      {
        activity_id: "fixture-Risk-limited farm",
        activity_name: "Risk-limited farm",
        livestock_crop_income: 0,
        expense_feed: 2000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 1000,
          current_year_increases: 200,
          line9_decreases_and_exclusions: 600,
        },
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_2, 1400);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<SomeInvestmentIsNotAtRiskInd>X</SomeInvestmentIsNotAtRiskInd>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>600</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>Risk-limited farm</ActivityDescriptionTxt>",
  );
  assertStringIncludes(
    xml,
    "<SimplifiedComputationRiskAmt>600</SimplifiedComputationRiskAmt>",
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-600</DeductibleLossAmt>");
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>400</NetFarmRentalIncomeOrLossAmt>",
  );
  await validateXsd(xml, "Form 4835 at-risk and passive loss");
});

Deno.test({
  name: "XSD: zero amount at risk suspends the farm loss before Form 8582",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-No-risk farm",
      activity_name: "No-risk farm",
      livestock_crop_income: 0,
      expense_feed: 2000,
      some_investment_not_at_risk: true,
      at_risk_simplified: {
        opening_adjusted_basis: 500,
        current_year_increases: 0,
        line9_decreases_and_exclusions: 500,
      },
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_1, 2000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>0</DeductibleLossAmt>");
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>0</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>0</NetFarmRentalIncomeOrLossAmt>",
  );
  assertEquals(xml.includes("<IRS8582"), false);
  await validateXsd(xml, "Form 4835 fully at-risk-suspended loss");
});

Deno.test({
  name: "XSD: separate farms retain separate Form 6198 computations",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      {
        activity_id: "fixture-North farm",
        activity_name: "North farm",
        livestock_crop_income: 0,
        expense_feed: 1000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 300,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
      {
        activity_id: "fixture-South farm",
        activity_name: "South farm",
        livestock_crop_income: 0,
        expense_feed: 2000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 900,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_1, 700);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_2, 1100);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<IRS6198 /g)?.length, 2);
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>North farm</ActivityDescriptionTxt>",
  );
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>South farm</ActivityDescriptionTxt>",
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-300</DeductibleLossAmt>");
  assertStringIncludes(xml, "<DeductibleLossAmt>-900</DeductibleLossAmt>");
  await validateXsd(xml, "separate Form 4835 at-risk farm computations");
});

Deno.test({
  name: "XSD: prior farm passive loss offsets farm profits through Form 8582",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      {
        activity_id: "fixture-Prior-loss farm",
        activity_name: "Prior-loss farm",
        livestock_crop_income: 1000,
        prior_unallowed_passive_operating: 1500,
        prior_year_8582_source: filedPrior8582("fixture-Prior-loss farm", 1500),
      },
      {
        activity_id: "fixture-Current-profit farm",
        activity_name: "Current-profit farm",
        livestock_crop_income: 500,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>1500</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>500</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>0</NetFarmRentalIncomeOrLossAmt>",
  );
  await validateXsd(xml, "prior farm passive loss and farm profits");
});

Deno.test({
  name: "XSD: unreleased prior farm passive loss remains a carryforward",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-Prior-loss farm",
      activity_name: "Prior-loss farm",
      livestock_crop_income: 1000,
      prior_unallowed_passive_operating: 1500,
      prior_year_8582_source: filedPrior8582("fixture-Prior-loss farm", 1500),
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 500);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>1500</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(xml, "<TotalLossAmt>500</TotalLossAmt>");
  await validateXsd(xml, "partially released prior farm passive loss");
});

Deno.test({
  name:
    "XSD: prior farm passive loss and current at-risk loss retain their limits",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [
      {
        activity_id: "fixture-Profit farm",
        activity_name: "Profit farm",
        livestock_crop_income: 1100,
      },
      {
        activity_id: "fixture-Limited farm",
        activity_name: "Limited farm",
        expense_feed: 2000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 600,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
        prior_unallowed_passive_operating: 500,
        prior_year_8582_source: filedPrior8582("fixture-Limited farm", 500),
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.f4835_at_risk_suspended_2, 1400);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-600</DeductibleLossAmt>");
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>500</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>1100</FarmRentalDeductibleLossAmt>",
  );
  await validateXsd(xml, "prior PAL and current at-risk farm loss");
});

Deno.test({
  name: "XSD: active farm prior loss uses Form 8582 special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f4835: [{
      activity_id: "fixture-Active farm",
      activity_name: "Active farm",
      livestock_crop_income: 1000,
      actively_participated: true,
      prior_unallowed_passive_operating: 1500,
      prior_year_8582_source: filedPrior8582("fixture-Active farm", 1500),
      prior_passive_losses_active_when_incurred: true,
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>1500</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmRentalDeductibleLossAmt>500</FarmRentalDeductibleLossAmt>",
  );
  await validateXsd(xml, "active farm prior PAL special allowance");
});

Deno.test({
  name: "XSD: Schedule E rental and royalty properties survive execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [
      {
        tsj: "T",
        activity_id: "fixture-Rental house",
        property_description: "Rental house",
        property_type: 1,
        activity_type: "A",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 12000,
        expense_mortgage_interest: 2000,
        expense_taxes: 1000,
        form_1099_payments_made: false,
        street_address: "12 Main Street",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      {
        tsj: "T",
        activity_id: "fixture-Mineral royalties",
        property_description: "Mineral royalties",
        property_type: 6,
        activity_type: "B",
        fair_rental_days: 0,
        personal_use_days: 0,
        rent_income: 0,
        royalties_income: 4000,
        form_1099_payments_made: false,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotAllPaymentsAllRentalPropAmt>12000</TotAllPaymentsAllRentalPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotAllPaymentsAllRyltyPropAmt>4000</TotAllPaymentsAllRyltyPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalIncomeOrLossAmt>13000</TotalIncomeOrLossAmt>",
  );
  await validateXsd(xml, "Schedule E rental and royalty properties");
});

Deno.test({
  name: "XSD: Schedule E nonpassive rental loss validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental property",
      property_description: "Rental property",
      property_type: 1,
      activity_type: "C",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 1000,
      expense_taxes: 2000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>1000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RecnclForREProfessionalsAmt>-1000</RecnclForREProfessionalsAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>-1000</AdjustedGrossIncomeAmt>",
  );
  assertStringIncludes(xml, "<TaxableIncomeAmt>0</TaxableIncomeAmt>");
  await validateXsd(xml, "Schedule E nonpassive rental loss");
});

Deno.test({
  name:
    "XSD: fully allowed active rental loss links Schedule E, Form 8582 and Schedule 1",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 1_000,
      expense_taxes: 2_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>1000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>1000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-1000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "active rental Form 8582 and Schedule E");
});

Deno.test({
  name:
    "XSD: two fully allowed rental losses retain separate Form 8582 worksheet rows",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 1_000,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    schedule_e: [
      {
        ...base,
        activity_id: "fixture-First house",
        property_description: "First house",
        street_address: "1 Main St",
        expense_taxes: 2_000,
      },
      {
        ...base,
        activity_id: "fixture-Second house",
        property_description: "Second house",
        street_address: "2 Main St",
        expense_taxes: 3_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>3000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-3000</RentalRealEstateIncomeLossAmt>",
  );
  assertEquals(xml.match(/<WrkshtRentalActGrp>/g)?.length, 2);
  await validateXsd(xml, "two active rentals Form 8582");
});

Deno.test({
  name:
    "XSD: phased-out rental loss reports only the allowed amount on Schedule E",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(140_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 18_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 3_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>5000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(xml, "<LossesAmt>5000</LossesAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>3000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-5000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "phased-out active rental Form 8582");
});

Deno.test({
  name: "XSD: rental loss with no special allowance is suspended in full",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(150_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 18_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 8_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.includes("<DedRentalRealEstateLossAmt>"), false);
  assertStringIncludes(xml, "<TotalIncomeOrLossAmt>0</TotalIncomeOrLossAmt>");
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>8000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>150000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "fully suspended active rental Form 8582");
});

Deno.test({
  name:
    "XSD: two rental losses split the special allowance and suspended carryforward",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 10_000,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(80_000, 10_000)],
    schedule_e: [
      {
        ...base,
        activity_id: "fixture-First house",
        property_description: "First house",
        street_address: "1 Main St",
        expense_taxes: 20_000,
      },
      {
        ...base,
        activity_id: "fixture-Second house",
        property_description: "Second house",
        street_address: "2 Main St",
        expense_taxes: 30_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 5_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>8333</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>16667</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(xml, "<LossesAmt>25000</LossesAmt>");
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>5000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-25000</RentalRealEstateIncomeLossAmt>",
  );
  await validateXsd(xml, "two partially allowed active rentals Form 8582");
});

Deno.test({
  name:
    "XSD: prior active rental operating loss reaches Form 8582 and Schedule E",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 18_000,
      prior_unallowed_passive_operating: 3_000,
      prior_year_8582_source: filedPrior8582("fixture-Rental house", 3_000),
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>3000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>11000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<RentalRealEstateIncomeLossAmt>-11000</RentalRealEstateIncomeLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>39000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "prior active rental operating loss");
});

Deno.test({
  name: "XSD: prior-only active rental loss is phased out and carried forward",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(140_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 10_000,
      prior_unallowed_passive_operating: 8_000,
      prior_year_8582_source: filedPrior8582("fixture-Rental house", 8_000),
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 3_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>8000</PYUnallowedRentalLossAmt>",
  );
  assertEquals(xml.includes("<RentalRealtyLossAmt>"), false);
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>5000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>3000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>135000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "prior-only active rental carryover");
});

Deno.test({
  name:
    "XSD: current rental profit offsets prior loss before the special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(135_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 5_000,
      prior_unallowed_passive_operating: 20_000,
      prior_year_8582_source: filedPrior8582("fixture-Rental house", 20_000),
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 10_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>5000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>10000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>10000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>130000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "rental profit and prior suspended loss");
});

Deno.test({
  name:
    "XSD: profitable rental releases another rental's loss before phase-out",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(130_000, 20_000)],
    schedule_e: [
      {
        ...base,
        activity_id: "fixture-Profit house",
        property_description: "Profit house",
        street_address: "1 Main Street",
        rent_income: 10_000,
      },
      {
        ...base,
        activity_id: "fixture-Loss house",
        property_description: "Loss house",
        street_address: "2 Main Street",
        rent_income: 0,
        expense_taxes: 20_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 5_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>10000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>20000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>15000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>15000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>5000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>125000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "two active rentals with profit and loss");
});

Deno.test({
  name: "XSD: rental overall gain releases prior loss without Part II",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(135_000, 20_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      prior_unallowed_passive_operating: 8_000,
      prior_year_8582_source: filedPrior8582("fixture-Rental house", 8_000),
      prior_passive_losses_active_when_incurred: true,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<NetRentalRealtyAmt>2000</NetRentalRealtyAmt>");
  assertEquals(xml.includes("<RentalRealtyLossLimitAmt>"), false);
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>8000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>137000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "rental overall gain with prior loss");
});

Deno.test({
  name: "XSD: other passive rental loss is suspended without special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Passive rental",
      property_description: "Passive rental",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 20_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 10_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<OtherActivityLossAmt>10000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertEquals(xml.includes("<AllowedRentalRealtyLossAmt>"), false);
  assertEquals(xml.includes("<DedRentalRealEstateLossAmt>"), false);
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>50000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "other passive rental suspended loss");
});

Deno.test({
  name:
    "XSD: mixed active and other passive rentals allocate only active special allowance",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
    rent_income: 10_000,
    expense_taxes: 20_000,
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [
      {
        ...base,
        activity_id: "fixture-Active rental",
        property_description: "Active rental",
        activity_type: "A",
        street_address: "1 Main Street",
      },
      {
        ...base,
        activity_id: "fixture-Other rental",
        property_description: "Other rental",
        activity_type: "B",
        street_address: "2 Main Street",
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 10_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>10000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<OtherActivityLossAmt>10000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>10000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>10000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>10000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>40000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "mixed active and other passive rental losses");
});

Deno.test({
  name:
    "XSD: mixed passive income and phased allowance share remaining suspended losses",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(110_000, 20_000)],
    schedule_e: [
      {
        ...base,
        activity_id: "fixture-Active loss",
        property_description: "Active loss",
        activity_type: "A",
        street_address: "1 Main Street",
        rent_income: 10_000,
        expense_taxes: 40_000,
      },
      {
        ...base,
        activity_id: "fixture-Other loss",
        property_description: "Other loss",
        activity_type: "B",
        street_address: "2 Main Street",
        rent_income: 10_000,
        expense_taxes: 30_000,
      },
      {
        ...base,
        activity_id: "fixture-Other profit",
        property_description: "Other profit",
        activity_type: "B",
        street_address: "3 Main Street",
        rent_income: 10_000,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 25_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>10000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>15000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>25000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>25000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>95000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "mixed passive income and phased allowance");
});

Deno.test({
  name: "XSD: other passive profit releases current and prior rental losses",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    tsj: "T",
    property_type: 1,
    activity_type: "B",
    fair_rental_days: 365,
    personal_use_days: 0,
    form_1099_payments_made: false,
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [
      {
        ...base,
        activity_id: "fixture-Profit rental",
        property_description: "Profit rental",
        street_address: "1 Main Street",
        rent_income: 6_000,
      },
      {
        ...base,
        activity_id: "fixture-Loss rental",
        property_description: "Loss rental",
        street_address: "2 Main Street",
        rent_income: 10_000,
        expense_taxes: 20_000,
        prior_unallowed_passive_operating: 2_000,
        prior_year_8582_source: filedPrior8582("fixture-Loss rental", 2_000),
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 6_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>6000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>2000</PriorYearUnallowedOtherLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>6000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>6000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>6000</TotalUnallowedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>50000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "other passive profit and prior operating loss");
});

Deno.test({
  name:
    "XSD: other passive overall gain releases prior loss without allocation",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Passive rental",
      property_description: "Passive rental",
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      prior_unallowed_passive_operating: 8_000,
      prior_year_8582_source: filedPrior8582("fixture-Passive rental", 8_000),
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<NetOtherActivityAmt>2000</NetOtherActivityAmt>");
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>8000</DedRentalRealEstateLossAmt>",
  );
  assertEquals(xml.includes("<ParentWrkshtLossGrp>"), false);
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>52000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "other passive overall gain and prior loss");
});

Deno.test({
  name:
    "XSD: entire other-passive Part II sale with overall gain uses Form 8582 Part V",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const sale = {
    activity_id: "fixture-Entire gain rental",
    activity_name: "Entire gain rental",
    part: "II" as const,
    property_description: "Short rental",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 30_000,
    cost_or_other_basis: 15_000,
    depreciation_allowed: 0 as const,
    entire_activity_interest_disposed: true,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 closing statement",
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: sale.activity_id,
      property_description: sale.activity_name,
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 150,
      personal_use_days: 0,
      rent_income: 0,
      expense_taxes: 2_000,
      prior_unallowed_passive_operating: 8_000,
      prior_year_8582_source: filedPrior8582(sale.activity_id, 8_000),
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
      disposed_of: true,
      passive_property_sales: [sale],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<OverallGainAmt>5000</OverallGainAmt>");
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>10000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>55000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "entire passive overall-gain disposition");
});

Deno.test({
  name:
    "XSD: first-year entire passive sale with overall gain has no prior PAL",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const sale = {
    activity_id: "fixture-first-year-gain",
    activity_name: "First year rental",
    part: "II" as const,
    property_description: "Short rental",
    acquired_on: "2025-02-01",
    sold_on: "2025-08-01",
    gross_sales_price: 30_000,
    cost_or_other_basis: 20_000,
    depreciation_allowed: 0 as const,
    entire_activity_interest_disposed: true,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 sale closing statement",
  };
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: sale.activity_id,
      property_description: sale.activity_name,
      property_type: 1,
      activity_type: "B",
      fair_rental_days: 180,
      personal_use_days: 0,
      rent_income: 0,
      expense_taxes: 2_000,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
      disposed_of: true,
      first_year_activity_source: {
        activity_id: sale.activity_id,
        activity_name: sale.activity_name,
        activity_acquired_on: sale.acquired_on,
        acquisition_document_reference: "2025 purchase closing statement",
        not_grouped_with_prior_activity: true,
      },
      passive_property_sales: [sale],
    }],
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<OverallGainAmt>8000</OverallGainAmt>");
  assertEquals(xml.includes("<PriorYearUnallowedOtherLossAmt>"), false);
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>2000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>58000</AdjustedGrossIncomeAmt>",
  );
  await validateXsd(xml, "first-year entire passive disposition");
});

Deno.test({
  name:
    "XSD: prior rental loss without past active participation stays in Part V",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [w2Item(50_000, 8_000)],
    schedule_e: [{
      tsj: "T",
      activity_id: "fixture-Rental house",
      property_description: "Rental house",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 10_000,
      expense_taxes: 10_000,
      prior_unallowed_passive_operating: 8_000,
      prior_year_8582_source: filedPrior8582("fixture-Rental house", 8_000),
      prior_passive_losses_active_when_incurred: false,
      form_1099_payments_made: false,
      street_address: "12 Main Street",
      city: "Austin",
      state: "TX",
      zip: "78701",
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.suspended_pal_8582, 8_000);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<PriorYearUnallowedOtherLossAmt>8000</PriorYearUnallowedOtherLossAmt>",
  );
  assertEquals(xml.includes("<PYUnallowedRentalLossAmt>"), false);
  assertEquals(xml.includes("<AllowedRentalRealtyLossAmt>"), false);
  assertStringIncludes(
    xml,
    "<TotalUnallowedLossAmt>8000</TotalUnallowedLossAmt>",
  );
  await validateXsd(xml, "prior nonactive rental loss Part V");
});

Deno.test({
  name: "XSD: return-level PDF BinaryAttachment validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);
  const bundle = await buildMefBundle({}, {
    filer: extractFilerIdentity(singleGeneral()),
    attachments: [{
      fileName: "AdditionalQMIDStatement.pdf",
      description: "Additional QMID Statement",
      bytes: await pdf.save(),
    }],
  });
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  await validateXsd(bundle.xml, "PDF BinaryAttachment");
});

Deno.test({
  name: "XSD: Form 5695 door and window overflow includes its QMID PDF",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const filer = extractFilerIdentity(general);
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: {
          line1: "123 Main Street",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        related_to_new_home: false,
        exterior_doors: [
          { cost: 1_000, qmid: "A1B2" },
          { cost: 900, qmid: "C3D4" },
          { cost: 800, qmid: "E5F6" },
          { cost: 700, qmid: "G7H8" },
        ],
        windows: [
          { cost: 500, qmid: "J9K0" },
          { cost: 400, qmid: "L1M2" },
          { cost: 300, qmid: "N3P4" },
          { cost: 200, qmid: "R5S6" },
          { cost: 100, qmid: "T7U8" },
        ],
      },
      part_ii_tax_limit: 1_000,
    },
  });
  const bundle = await buildMefBundle(result.pending as MefFormsPending, {
    filer,
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(
    bundle.xml,
    "<OtherQlfyExtrDoorsCostAmt>700</OtherQlfyExtrDoorsCostAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<OthQlfyExtrWndwSkyltCostAmt>100</OthQlfyExtrWndwSkyltCostAmt>",
  );
  await validateXsd(bundle.xml, "Form 5695 QMID overflow bundle");
});

Deno.test({
  name: "XSD: Form 5695 Section B overflow includes its QMID PDF",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const filer = extractFilerIdentity(general);
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "123 Main Street",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: { cost: 700, qmid: "A1B2" },
        other_central_air_conditioners: [{ cost: 2_000, qmid: "C3D4" }],
        water_heaters: [
          { cost: 1_000, qmid: "E5F6" },
          { cost: 900, qmid: "G7H8" },
          { cost: 1_200, qmid: "J9K0" },
        ],
        furnace_or_boiler: { cost: 800, qmid: "L1M2" },
        other_furnaces_or_boilers: [{ cost: 1_500, qmid: "N3P4" }],
        heat_pump: { cost: 1_000, qmid: "R5S6" },
        other_heat_pumps: [{ cost: 1_200, qmid: "T7U8" }],
        heat_pump_water_heater: { cost: 900, qmid: "V9W0" },
        other_heat_pump_water_heaters: [{ cost: 1_100, qmid: "X1Y2" }],
        biomass_stove_or_boiler: { cost: 700, qmid: "Z3A4" },
        other_biomass_stoves_or_boilers: [{ cost: 1_300, qmid: "B5C6" }],
      },
      part_ii_tax_limit: 5_000,
    },
  });
  const bundle = await buildMefBundle(result.pending as MefFormsPending, {
    filer,
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  await validateXsd(bundle.xml, "Form 5695 Section B QMID overflow bundle");
});

Deno.test({
  name:
    "XSD: Form 5695 joint Section B overflow links PDF and allocation statement",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      part_ii_joint_occupancy: true,
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: {
          cost: 1_000,
          qmid: "A1B2",
          joint_total_paid: 2_000,
        },
        other_central_air_conditioners: [
          { cost: 1_000, qmid: "C3D4", joint_total_paid: 2_000 },
          { cost: 1_000, qmid: "E5F6", joint_total_paid: 2_000 },
        ],
      },
      part_ii_tax_limit: 10_000,
    },
  });
  const bundle = await buildMefBundle(result.pending as MefFormsPending, {
    filer: extractFilerIdentity(general),
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  assertStringIncludes(
    bundle.xml,
    "<CentralAirCondCostStdPctCrAmt>600</CentralAirCondCostStdPctCrAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="JointOccupancyStatement"',
  );
  await validateXsd(bundle.xml, "Form 5695 joint Section B overflow bundle");
});

Deno.test({
  name: "XSD: Form 5695 joint-occupancy supporting document validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      fuel_cell_cost: 12_000,
      fuel_cell_kw_capacity: 5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: {
        line1: "17 Lexington Drive",
        city: "Cincinnati",
        state: "OH",
        zip: "45223",
      },
      fuel_cell_joint_occupancy: true,
      fuel_cell_total_joint_occupants_paid: 20_000,
      part_i_tax_limit: 10_000,
    },
    joint_occupancy_statement: {
      statements: [{
        fuel_cell_properties: [{
          kw_capacity: 5,
          paid: 12_000,
          total_joint_occupants_paid: 20_000,
        }],
      }],
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, 'documentCnt="3"');
  assertStringIncludes(xml, "<FuelCellPropCostAmt>10002</FuelCellPropCostAmt>");
  assertStringIncludes(
    xml,
    'referenceDocumentId="JointOccupancyStatement2" referenceDocumentName="JointOccupancyStatement"',
  );
  assertStringIncludes(
    xml,
    '<JointOccupancyStatement documentId="JointOccupancyStatement2">',
  );
  await validateXsd(xml, "Form 5695 joint occupancy statement");
});

Deno.test({
  name:
    "XSD: joint fuel cell routes from f5695 input through linked MeF documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      fuel_cell_cost: 12_000,
      fuel_cell_kw_capacity: 5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: {
        line1: "1 Test Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      fuel_cell_joint_occupancy: true,
      fuel_cell_total_joint_occupants_paid: 20_000,
      part_i_tax_limit: 10_000,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(xml, "<FuelCellPropCostAmt>10002</FuelCellPropCostAmt>");
  assertStringIncludes(
    xml,
    "<ResidentialCleanEnergyCrAmt>3001</ResidentialCleanEnergyCrAmt>",
  );
  const statementId = /<JointOccupancyStatement documentId="([^"]+)"/.exec(xml)
    ?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(xml, `referenceDocumentId="${statementId}"`);
  await validateXsd(xml, "Form 5695 joint fuel cell input to MeF");
});

Deno.test({
  name: "XSD: Part II joint occupancy routes shared property and annual limits",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    f5695: {
      part_ii_joint_occupancy: true,
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: home,
        related_to_new_home: false,
        insulation_cost: 2_000,
        insulation_joint_total_paid: 4_000,
        exterior_doors: [
          { cost: 1_000, qmid: "A1B2", joint_total_paid: 2_000 },
          { cost: 1_000, qmid: "C3D4", joint_total_paid: 2_000 },
        ],
        windows: [{ cost: 2_000, qmid: "E5F6", joint_total_paid: 4_000 }],
      },
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: {
          cost: 2_000,
          qmid: "G7H8",
          joint_total_paid: 4_000,
        },
        heat_pump: {
          cost: 5_000,
          qmid: "I9J0",
          joint_total_paid: 10_000,
        },
      },
      part_ii_tax_limit: 10_000,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<EnergyEffcntImprvAllwblCostAmt>600</EnergyEffcntImprvAllwblCostAmt>",
  );
  assertStringIncludes(
    xml,
    "<HtPumpWtrHeaterBmssStdPctCrAmt>1000</HtPumpWtrHeaterBmssStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>1600</EgyEffcntHmImprvCrAmt>",
  );
  const statementId = /<JointOccupancyStatement documentId="([^"]+)"/.exec(xml)
    ?.[1];
  assertEquals(typeof statementId, "string");
  assertStringIncludes(xml, `referenceDocumentId="${statementId}"`);
  await validateXsd(xml, "Form 5695 Part II joint occupancy");
});

Deno.test({
  name: "XSD: one joint statement supports both Form 5695 credit parts",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    f5695: {
      fuel_cell_cost: 12_000,
      fuel_cell_kw_capacity: 5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: home,
      fuel_cell_joint_occupancy: true,
      fuel_cell_total_joint_occupants_paid: 20_000,
      part_i_tax_limit: 10_000,
      part_ii_joint_occupancy: true,
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: {
          cost: 2_000,
          qmid: "A1B2",
          joint_total_paid: 4_000,
        },
      },
      part_ii_tax_limit: 10_000,
    },
  });
  assertEquals(result.diagnostics, []);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  const statementId = /<JointOccupancyStatement documentId="([^"]+)"/.exec(xml)
    ?.[1];
  assertEquals(typeof statementId, "string");
  assertEquals(
    (xml.match(/<JointOccupancyStatement documentId=/g) ?? []).length,
    1,
  );
  assertEquals(
    (xml.match(new RegExp(`referenceDocumentId="${statementId}"`, "g")) ?? [])
      .length,
    2,
  );
  await validateXsd(xml, "Form 5695 both joint-occupancy parts");
});

Deno.test({
  name: "XSD: Form 5695 Part I clean-energy claim validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_i_home_address: {
        line1: "17 Lexington Drive",
        city: "Cincinnati",
        state: "OH",
        zip: "45223",
      },
      solar_electric_cost: 10_000,
      battery_storage_cost: 2_000,
      battery_storage_kwh_capacity: 3,
      prior_year_carryforward: 100,
      part_i_tax_limit: 2_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<ResidentialCleanEnergyCrGrp>");
  await validateXsd(xml, "Form 5695 Part I");
});

Deno.test({
  name: "XSD: Form 5695 fuel-cell half-kW claim validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      fuel_cell_cost: 3_000,
      fuel_cell_kw_capacity: 0.5,
      fuel_cell_home_in_us: true,
      fuel_cell_home_address: {
        line1: "17 Lexington Drive",
        city: "Cincinnati",
        state: "OH",
        zip: "45223",
      },
      fuel_cell_joint_occupancy: false,
      part_i_tax_limit: 1_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<FuelCellPropKWCapNum>0.5</FuelCellPropKWCapNum>");
  await validateXsd(xml, "Form 5695 fuel-cell");
});

Deno.test({
  name: "XSD: Form 5695 itemized Part II Section A validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: {
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        related_to_new_home: false,
        insulation_cost: 400,
        exterior_doors: [
          { cost: 10, qmid: "C3D4" },
          { cost: 5_000, qmid: "A1B2" },
        ],
        windows: [{ cost: 600, qmid: "E5F6" }],
      },
      part_ii_tax_limit: 1_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<TotalExtrDoorsCreditAmt>253</TotalExtrDoorsCreditAmt>",
  );
  await validateXsd(xml, "Form 5695 Part II Section A");
});

Deno.test({
  name: "XSD: Form 5695 itemized Section A survives input to MeF execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: {
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        related_to_new_home: false,
        exterior_doors: [
          { cost: 10, qmid: "C3D4" },
          { cost: 5_000, qmid: "A1B2" },
        ],
      },
      part_ii_tax_limit: 1_000,
    },
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalExtrDoorsCreditAmt>253</TotalExtrDoorsCreditAmt>",
  );
  await validateXsd(xml, "Form 5695 Section A executor path");
});

Deno.test({
  name: "XSD: Form 5695 itemized Section B validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [{
          line1: "1 Test Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        }],
        central_air_conditioner: { cost: 2_000, qmid: "A1B2" },
        water_heaters: [{ cost: 1_000, qmid: "C3D4" }],
        furnace_or_boiler: { cost: 2_000, qmid: "E5F6" },
        heat_pump: { cost: 2_000, qmid: "G7H8" },
        heat_pump_water_heater: { cost: 2_000, qmid: "J9K0" },
        biomass_stove_or_boiler: { cost: 2_000, qmid: "L1M2" },
      },
      part_ii_tax_limit: 3_500,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>3000</EgyEffcntHmImprvCrAmt>",
  );
  await validateXsd(xml, "Form 5695 Part II Section B");
});

Deno.test({
  name: "XSD: Form 5695 combined Sections A and B survive execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_a: {
        main_home_in_us: true,
        original_user: true,
        five_year_use: true,
        home_address: home,
        related_to_new_home: false,
        exterior_doors: [{ cost: 500, qmid: "A1B2" }],
      },
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: { cost: 2_000, qmid: "C3D4" },
      },
      part_ii_tax_limit: 1_000,
    },
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalExtrDoorsCreditAmt>150</TotalExtrDoorsCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<CentralAirCondCostStdPctCrAmt>600</CentralAirCondCostStdPctCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>750</EgyEffcntHmImprvCrAmt>",
  );
  await validateXsd(xml, "Form 5695 combined Sections A and B");
});

Deno.test({
  name: "XSD: Form 5695 panelboard and audit survive execution",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const home = {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const general = singleGeneral();
  const result = runReturn({
    general,
    f5695: {
      part_ii_section_b: {
        home_in_us: true,
        originally_placed_in_service: true,
        home_addresses: [home],
        central_air_conditioner: { cost: 1_000, qmid: "A1B2" },
        panelboard: {
          cost: 2_000,
          qmids: ["C3D4"],
          enabled_property_type_codes: ["B"],
          meets_200_amp_and_nec: true,
          enabled_property_qualified: true,
          enabling_installed_year: 2025,
          enabled_installed_year: 2025,
        },
      },
      part_ii_energy_audit: {
        cost: 600,
        main_home_in_us: true,
        written_report: true,
        certified_auditor: true,
      },
      part_ii_tax_limit: 2_000,
    },
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<EgyEffcntHmImprvCrAmt>1050</EgyEffcntHmImprvCrAmt>",
  );
  await validateXsd(xml, "Form 5695 panelboard and audit");
});

Deno.test({
  name:
    "XSD: Form 5695 audit-only claim validates without Section B property answers",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    form5695: {
      part_ii_energy_audit: {
        cost: 600,
        main_home_in_us: true,
        written_report: true,
        certified_auditor: true,
      },
      part_ii_tax_limit: 200,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<MainHomeEgyAuditStdPctCrAmt>150</MainHomeEgyAuditStdPctCrAmt>",
  );
  assertEquals(xml.includes("QlfyEnergyPropCostsUSHomeInd"), false);
  await validateXsd(xml, "Form 5695 audit only");
});

function runReturn(inputs: Record<string, unknown>) {
  return execute(plan, registry, inputs, { taxYear: 2025, formType: "f1040" });
}

function singleGeneral() {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Test Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
  };
}

Deno.test({
  name:
    "XSD: 1099-NEC Form 8919 firm reaches 1040, Schedule 2, Schedule SE and Form 8959",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [{
      employer_name: "Other Employer",
      employer_ein: "22-2222222",
      employee_ssn: general.taxpayer_ssn,
      employer_address_line1: "1 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 150_000,
      box2_fed_withheld: 20_000,
      box3_ss_wages: 150_000,
      box5_medicare_wages: 150_000,
      box6_medicare_withheld: 2_175,
    }],
    f1099nec: [{
      payer_name: "Employer Inc",
      payer_tin: "12-3456789",
      recipient_ssn: general.taxpayer_ssn,
      box1_nec: 210_000,
      for_routing: "form_8919",
    }],
    form8919: {
      taxpayer_ssn: general.taxpayer_ssn,
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "Employer Inc",
          tin_type: "ein",
          tin: "12-3456789",
          reason_code: "G",
          ss8_filed_date: "2025-04-01",
          ss8_filing_reference: "SS-8 delivery receipt",
          form1099_received: true,
          wages: 210_000,
          form1099_payer_tin: "12-3456789",
        }],
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1g_wages_8919, 210_000);
  assertEquals(result.pending.schedule_se?.wages_8919, 26_100);
  assertEquals(result.pending.form8959?.line3_wages_8919, 210_000);
  assertEquals(result.pending.schedule2?.line6_uncollected_8919, 4_663);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<TotalWagesWithNoWithholdingAmt>210000</TotalWagesWithNoWithholdingAmt>",
  );
  assertStringIncludes(
    xml,
    "<WagesSubjectToSSTAmt>26100</WagesSubjectToSSTAmt>",
  );
  await validateXsd(xml, "Form 8919 1099-NEC wage routing");
});

Deno.test({
  name:
    "XSD: Form 8919 reason H combines same-firm 1099-MISC and 1099-NEC wages",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const result = runReturn({
    general,
    w2: [{
      employer_name: "Employer Inc",
      employer_ein: "12-3456789",
      employee_ssn: general.taxpayer_ssn,
      employer_address_line1: "1 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 20_000,
      box2_fed_withheld: 1_000,
      box3_ss_wages: 20_000,
      box5_medicare_wages: 20_000,
      box6_medicare_withheld: 290,
    }],
    f1099m: [{
      payer_name: "Employer Inc",
      payer_tin: "12-3456789",
      recipient_tin: general.taxpayer_ssn,
      box3_other_income: 10_000,
      box3_other_income_routing: "form_8919",
    }],
    f1099nec: [{
      payer_name: "Employer Inc",
      payer_tin: "12-3456789",
      recipient_ssn: general.taxpayer_ssn,
      box1_nec: 40_000,
      for_routing: "form_8919",
    }],
    form8919: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "Employer Inc",
          tin_type: "ein",
          tin: "12-3456789",
          reason_code: "H",
          form1099_received: true,
          wages: 50_000,
          form1099_payer_tin: "12-3456789",
        }],
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line1g_wages_8919, 50_000);
  assertEquals(result.pending.schedule2?.line6_uncollected_8919, 3_825);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertStringIncludes(
    xml,
    "<UncollectedSocSecMedReasonCd>H</UncollectedSocSecMedReasonCd>",
  );
  await validateXsd(xml, "Form 8919 mixed 1099-MISC and 1099-NEC wages");
});

Deno.test({
  name: "XSD: ATS Scenario 1 Schedule H source slice validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const source = SCENARIO_1040_01_FACTS.scheduleH;
  const xml = buildMefXml(
    {
      schedule_h: {
        employer_ein: source.employerEin,
        cash_wages_over_2025_limit: source.cashWagesOver2025Limit,
        cash_wages_over_quarter_limit: source.cashWagesOverQuarterLimit,
        ss_wages: source.socialSecurityWages,
        medicare_wages: source.medicareWages,
        federal_income_tax_withheld: source.federalWithholding,
      },
    },
    extractFilerIdentity({
      ...singleGeneral(),
      taxpayer_first_name: SCENARIO_1040_01_FACTS.taxpayer.firstName,
      taxpayer_last_name: SCENARIO_1040_01_FACTS.taxpayer.lastName,
      taxpayer_ssn: SCENARIO_1040_01_FACTS.taxpayer.ssn,
    }),
  );
  assertStringIncludes(
    xml,
    "<HouseholdEmployerNm>Tara Black</HouseholdEmployerNm>",
  );
  assertStringIncludes(xml, "<EmployerEIN>000000029</EmployerEIN>");
  assertStringIncludes(
    xml,
    "<TotSocSecMedcrAndFedIncmTaxAmt>474</TotSocSecMedcrAndFedIncmTaxAmt>",
  );
  await validateXsd(xml, "Scenario 1 Schedule H");
});

Deno.test({
  name: "XSD: Schedule H single-state FUTA Section A validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: true,
      cash_wages_over_quarter_limit: true,
      ss_wages: 10_000,
      medicare_wages: 10_000,
      federal_unemployment: {
        paid_only_one_state: true,
        all_contributions_paid_on_time: true,
        all_futa_wages_state_taxable: true,
        state: "TX",
        contributions_paid: 100,
        taxable_wages: 7_000,
      },
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<FUTATaxAmt>42</FUTATaxAmt>");
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>1572</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  await validateXsd(xml, "Schedule H Section A");
});

Deno.test({
  name: "XSD: Schedule H withholding-only branch validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: false,
      cash_wages_over_quarter_limit: false,
      federal_income_tax_withheld: 100,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<HsldEmplFedIncmTaxWithheldInd>true</HsldEmplFedIncmTaxWithheldInd>",
  );
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>100</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  await validateXsd(xml, "Schedule H withholding-only");
});

Deno.test({
  name: "XSD: Schedule H Section B with a credit reduction state validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: false,
      cash_wages_over_quarter_limit: true,
      federal_unemployment: {
        paid_only_one_state: false,
        all_contributions_paid_on_time: true,
        all_futa_wages_state_taxable: true,
        taxable_futa_wages: 7_000,
        state_rows: [{
          state: "CA",
          taxable_state_wages: 7_000,
          experience_rate: 0.05,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: 350,
        }],
        credit_reduction_wages: [{ state: "CA", taxable_futa_wages: 7_000 }],
      },
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(xml, "<UnemplFundMultiStateGroup>");
  await validateXsd(xml, "Schedule H Section B");
});

Deno.test({
  name: "XSD: Schedule H Section A with a zero experience rate validates",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: false,
      cash_wages_over_quarter_limit: true,
      federal_unemployment: {
        paid_only_one_state: true,
        all_contributions_paid_on_time: true,
        all_futa_wages_state_taxable: true,
        state: "OH",
        zero_experience_rate: true,
        taxable_wages: 7_000,
      },
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<UnemploymentFundZeroRateCd>0% RATE</UnemploymentFundZeroRateCd>",
  );
  await validateXsd(xml, "Schedule H Section A zero rate");
});

Deno.test({
  name: "XSD: Schedule H Additional Medicare Tax lines validate",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const xml = buildMefXml({
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: true,
      cash_wages_over_quarter_limit: false,
      ss_wages: 176_100,
      medicare_wages: 220_000,
      additional_medicare_wages: 20_000,
    },
  }, extractFilerIdentity(singleGeneral()));
  assertStringIncludes(
    xml,
    "<AddnlMedicareTaxWithholdingAmt>180</AddnlMedicareTaxWithholdingAmt>",
  );
  await validateXsd(xml, "Schedule H Additional Medicare Tax");
});

/** Build a W-2 item, capping SS wages at the 2025 wage base. */
function w2Item(wages: number, withheld: number) {
  const ssWages = Math.min(wages, SS_WAGE_BASE_2025);
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: ssWages,
    box4_ss_withheld: ssWages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: "12-3456789",
    employer_name: "ACME Corp",
    employer_address_line1: "2 Payroll Road",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78702",
    box12_entries: [],
  };
}

/**
 * Validates XML against the IRS Return1040.xsd via xmllint subprocess.
 * Writes to a temp file, runs xmllint --noout --schema, then cleans up.
 * Asserts exit code 0 — any schema violation surfaces as a test failure.
 */
async function validateXsd(xml: string, label: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  await Deno.writeTextFile(tmpPath, xml);

  const cmd = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", XSD_PATH, tmpPath],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await cmd.output();

  const stderr = new TextDecoder().decode(output.stderr);
  await Deno.remove(tmpPath);

  assertEquals(
    output.code,
    0,
    `${label} XSD validation failed:\n${stderr}`,
  );
}

// ── Scenario 1: Single W-2 $75K ─────────────────────────────────────────────

Deno.test(
  {
    name: "XSD: ATS Scenario 2 Form 8283 Section A donation validates",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const donation = SCENARIO_1040_02_FACTS.form8283;
    const xml = buildMefXml({
      f8283: {
        section_a_items: [{
          donee_organization_name: donation.donee,
          property_description: donation.propertyDescription,
          date_contributed: donation.donationDate,
          cost_or_adjusted_basis: donation.costBasis,
          fmv: donation.fairMarketValue,
          charitable_limit_category: "noncash_50",
          is_capital_gain_property: false,
        }],
      },
    }, extractFilerIdentity(singleGeneral()));
    assertStringIncludes(xml, "<FairMarketValueAmt>700</FairMarketValueAmt>");
    await validateXsd(xml, "ATS Scenario 2 Form 8283");
  },
);

Deno.test(
  {
    name:
      "XSD: ATS Scenario 13 Form 8911, its Schedule A, and Schedule 3 line 6j validate",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const facts = SCENARIO_1040_13_FACTS;
    const xml = buildMefXml({
      schedule3: {
        line6j_alt_fuel_vehicle_refueling:
          facts.form8911.printedAllowedPersonalCredit,
      },
      f8911: {
        cost: facts.form8911ScheduleA.qualifiedCost,
        business_use_pct: facts.form8911ScheduleA.businessUsePercentage,
        property_description: facts.form8911ScheduleA.propertyDescription,
        property_us_address: facts.taxpayer.address,
        construction_began: facts.form8911ScheduleA.constructionBegan,
        placed_in_service: facts.form8911ScheduleA.placedInService,
        eligible_census_tract: facts.form8911ScheduleA.eligibleCensusTract,
        census_tract_geoid: facts.form8911ScheduleA.censusTractGeoid,
        main_home_property: facts.form8911ScheduleA.mainHomeProperty,
        regular_tax_before_credits:
          facts.form8911.printedRegularTaxBeforeCredits,
        tentative_minimum_tax: facts.form8911.printedTentativeMinimumTax,
      },
    }, extractFilerIdentity(singleGeneral()));
    assertStringIncludes(
      xml,
      "<TotalPersonalUsePartOfCrAmt>162</TotalPersonalUsePartOfCrAmt>",
    );
    assertStringIncludes(xml, "<IRS8911ScheduleA documentId=");
    await validateXsd(xml, "ATS Scenario 13 Form 8911");
  },
);

Deno.test(
  {
    name: "XSD: Single W-2 $75K validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      w2: [w2Item(75_000, 11_000)],
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    await validateXsd(xml, "Single W-2 $75K");
  },
);

// ── Scenario 2: Self-employed Schedule C $80K ───────────────────────────────

Deno.test({
  name:
    "XSD: separate Schedule C at-risk losses produce separate Form 6198 documents",
  sanitizeOps: false,
  sanitizeResources: false,
  ignore: !xsdAvailable,
}, async () => {
  const general = singleGeneral();
  const base = {
    line_a_principal_business: "Consulting",
    line_b_business_code: "541600",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_32_at_risk: "b",
  };
  const result = runReturn({
    general,
    w2: [w2Item(5_000, 0)],
    schedule_c: [
      {
        ...base,
        line_c_business_name: "North business",
        line_1_gross_receipts: 1000,
        line_8_advertising: 3000,
        at_risk_simplified: {
          opening_adjusted_basis: 500,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
      {
        ...base,
        line_c_business_name: "South business",
        line_1_gross_receipts: 1000,
        line_8_advertising: 4000,
        at_risk_simplified: {
          opening_adjusted_basis: 900,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 0,
        },
      },
      {
        ...base,
        business_reference: "offsetting-service-2025",
        line_c_business_name: "Offsetting business",
        line_32_at_risk: "a",
        line_1_gross_receipts: 3_000,
        line_8_advertising: 0,
      },
    ],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.carryforwards.schedule_c_at_risk_suspended_1, 1500);
  assertEquals(result.carryforwards.schedule_c_at_risk_suspended_2, 2100);
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(general),
  );
  assertEquals(xml.match(/<IRS6198 /g)?.length, 2);
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>North business</ActivityDescriptionTxt>",
  );
  assertStringIncludes(
    xml,
    "<ActivityDescriptionTxt>South business</ActivityDescriptionTxt>",
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-500</DeductibleLossAmt>");
  assertStringIncludes(xml, "<DeductibleLossAmt>-900</DeductibleLossAmt>");
  await validateXsd(xml, "separate Schedule C at-risk businesses");
});

Deno.test(
  {
    name: "XSD: Self-employed Schedule C $80K validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: {
        ...singleGeneral(),
        qbi_no_prior_loss_or_suspended_loss_confirmed: true,
        qbi_not_patron_of_specified_cooperative_confirmed: true,
      },
      schedule_c: [
        {
          business_reference: "consulting-2025",
          line_a_principal_business: "Consulting",
          line_b_business_code: "541600",
          line_c_business_name: "Test LLC",
          line_d_ein: "123456789",
          qbi_no_other_adjustments_confirmed: true,
          line_e_business_address: {
            line1: "1 Business Way",
            city: "Austin",
            state: "TX",
            zip: "78701",
          },
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 80_000,
        },
      ],
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    assertStringIncludes(xml, "<IRS1040ScheduleC documentId=");
    assertStringIncludes(
      xml,
      "<TotalGrossReceiptsAmt>80000</TotalGrossReceiptsAmt>",
    );
    await validateXsd(xml, "Self-employed Schedule C $80K");
  },
);

// ── Scenario 3: Itemized deductions Schedule A ($200K income, $33K deductions)

Deno.test(
  {
    name: "XSD: Schedule C inventory and itemized other expense validate",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: {
        ...singleGeneral(),
        qbi_no_prior_loss_or_suspended_loss_confirmed: true,
        qbi_not_patron_of_specified_cooperative_confirmed: true,
      },
      schedule_c: [{
        business_reference: "retail-2025",
        line_a_principal_business: "Retail",
        line_b_business_code: "449110",
        line_c_business_name: "Retail Shop",
        line_d_ein: "987654321",
        qbi_no_other_adjustments_confirmed: true,
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 60_000,
        line_33_inventory_method: "cost",
        line_35_cogs_beginning_inventory: 7_650,
        line_36_purchases: 8_550,
        line_37_cost_of_labor: 11_900,
        line_38_materials_supplies_cogs: 16_300,
        line_41_cogs_ending_inventory: 21_450,
        line_44b_business_miles: 665,
        line_44c_commuting_miles: 710,
        line_44d_other_miles: 15_151,
        line_45_personal_use: true,
        part_v_other_expenses: [{ description: "Postage", amount: 100 }],
      }],
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    assertStringIncludes(xml, "<CostOfGoodsSoldAmt>22950</CostOfGoodsSoldAmt>");
    assertStringIncludes(
      xml,
      "<OtherExpenseDetail><Desc>Postage</Desc><Amt>100</Amt></OtherExpenseDetail>",
    );
    await validateXsd(xml, "Schedule C inventory and other expense");
  },
);

Deno.test(
  {
    name:
      "XSD: Itemized deductions Schedule A validates against Return1040.xsd",
    sanitizeOps: false,
    sanitizeResources: false,
    ignore: !xsdAvailable,
  },
  async () => {
    const result = runReturn({
      general: singleGeneral(),
      w2: [w2Item(200_000, 40_000)],
      schedule_a: {
        line_5a_state_income_tax: 10_000,
        line_8a_mortgage_interest_1098: 18_000,
        line_11_cash_contributions: 5_000,
      },
    });
    const xml = buildMefXml(
      result.pending as MefFormsPending,
      extractFilerIdentity(singleGeneral()),
    );
    await validateXsd(xml, "Itemized deductions Schedule A");
  },
);

// ── returnVersion check ──────────────────────────────────────────────────────

Deno.test("XSD: returnVersion matches 2025v5.4", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(50_000, 8_000)],
  });
  const xml = buildMefXml(
    result.pending as MefFormsPending,
    extractFilerIdentity(singleGeneral()),
  );
  assertStringIncludes(xml, 'returnVersion="2025v5.4"');
});
