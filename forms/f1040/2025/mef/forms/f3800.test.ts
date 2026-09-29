import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { EnergyType } from "../../../nodes/inputs/f8835/index.ts";
import { TargetGroup } from "../../../nodes/inputs/f5884/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import {
  PassiveCreditCategory,
  PassiveCreditSourceOrigin,
  sourceAllocationSchema,
} from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import { PassiveCreditReportingRoute } from "../../../nodes/intermediate/forms/form8582cr/credit-route.ts";
import { form3800, prepareForm3800DocumentParts } from "./f3800.ts";
import { buildIRS3800Document } from "./f3800_document.ts";

Deno.test("Form 3800 files a source-backed passive-only current-year credit", () => {
  const source = sourceAllocationSchema.parse({
    activity_reference: "Clinical activity",
    source_form: "Form 8820",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership",
      ein: "123456789",
    },
    source_document_reference: "2025 clinical credit statement",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1h",
    current_year_credit: 1_000,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
    total_credit: 1_000,
    special_allowed_credit: 0,
    unallowed_credit: 500,
    allowed_credit: 500,
  });
  const passiveTax = {
    filingStatus: FilingStatus.Single as const,
    regularTax: 300,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 0,
    standardCredit: 0,
    specifiedCredit: 0,
  };
  const xml = form3800.build({
    passive_source_allocations: [source],
    tax_context: passiveTax,
    allowed_credit: 300,
  }, {
    pending: {
      ...filedPending(passiveTax, 300),
      form8582cr: {
        credit_sources: [source],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 500,
      },
    },
    documentIdsByPendingKey: {
      form6251: ["IRS6251_1"],
      form8582cr: ["IRS8582CR_1"],
    },
  });
  assertStringIncludes(
    xml,
    "<CrSubjToPassiveActyLmtAmt>1000</CrSubjToPassiveActyLmtAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAppTxAmt>300</TotalGeneralBusCreditsAppTxAmt>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertThrows(
    () =>
      form3800.build({
        passive_source_allocations: [source],
        tax_context: passiveTax,
        allowed_credit: 300,
      }, {
        pending: {
          ...filedPending(passiveTax, 300),
          form8582cr: {
            credit_sources: [source],
            regular_tax_all_income: 1_000,
            regular_tax_without_passive: 500,
          },
        },
        documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
      }),
    Error,
    "needs one attached Form 8582-CR",
  );
  assertThrows(
    () =>
      form3800.build({
        passive_source_allocations: [{
          ...source,
          source_document_reference: "Unfiled K-1",
        }],
        tax_context: passiveTax,
        allowed_credit: 300,
      }, {
        pending: {
          ...filedPending(passiveTax, 300),
          form8582cr: {
            credit_sources: [source],
            regular_tax_all_income: 1_000,
            regular_tax_without_passive: 500,
          },
        },
        documentIdsByPendingKey: {
          form6251: ["IRS6251_1"],
          form8582cr: ["IRS8582CR_1"],
        },
      }),
    Error,
    "sources differ from filed Form 8582-CR",
  );
});

const tax = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 40_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 20_000,
  standardCredit: 5_000,
  specifiedCredit: 0,
};

const selfEarned = {
  eligible_expenditures: 20_000,
  prior_year_gross_receipts: 500_000,
  prior_year_full_time_employee_count: 20,
  subject_to_passive_activity_limit: false,
};

const windFacility = {
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

function specifiedEntry(overrides: Record<string, unknown> = {}) {
  return {
    form3800_line: "4e" as const,
    credit_amount: 6_000,
    transfer_out_amount: 0,
    subject_to_passive_activity_limit: false,
    ...overrides,
  };
}

function filedPending(
  context: {
    regularTax: number;
    alternativeMinimumTax: number;
    tentativeMinimumTax: number;
    priorAllowableCredits: number;
  },
  allowedCredit: number,
) {
  return {
    f1040: {
      line16_income_tax: context.regularTax,
      line17_additional_taxes: context.alternativeMinimumTax,
    },
    form6251: {
      line11_amt: context.alternativeMinimumTax,
      net_tmt: context.tentativeMinimumTax,
    },
    schedule3: {
      line6a_total: allowedCredit,
      line7_total: allowedCredit + context.priorAllowableCredits,
    },
  };
}

Deno.test("Form 3800 applies a passive carryover before a Form 8826 current credit", () => {
  const passive = sourceAllocationSchema.parse({
    activity_reference: "Clinical partnership",
    source_form: "Form 8820",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership",
      ein: "123456789",
    },
    source_document_reference: "2025 Schedule K-1 statement",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1h",
    current_year_credit: 300,
    prior_unallowed_credits: [{
      originating_tax_year: 2023,
      credit_amount: 200,
      source_document_reference: "2023 Schedule K-1 statement",
    }],
    publicly_traded_partnership: false,
    total_credit: 500,
    special_allowed_credit: 0,
    unallowed_credit: 200,
    allowed_credit: 300,
  });
  const accessSource = { ...selfEarned, eligible_expenditures: 450 };
  const mixedTax = {
    ...tax,
    regularTax: 250,
    tentativeMinimumTax: 0,
    standardCredit: 100,
  };
  const xml = form3800.build({
    passive_source_allocations: [passive],
    f8826_credit_entries: [{
      source_type: "self",
      credit_amount: 100,
      subject_to_passive_activity_limit: false,
    }],
    tax_context: mixedTax,
    allowed_credit: 250,
  }, {
    pending: {
      ...filedPending(mixedTax, 250),
      f8826: accessSource,
      form8582cr: {
        credit_sources: [passive],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 700,
      },
    },
    documentIdsByPendingKey: {
      f8826: ["IRS8826_1"],
      form6251: ["IRS6251_1"],
      form8582cr: ["IRS8582CR_1"],
    },
  });
  assertStringIncludes(xml, "<Frm8820CYCyovCrGrp>");
  assertStringIncludes(xml, "<Form8826CYCreditsGrp");
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>250</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAppTxAmt>200</TotalGeneralBusCreditsAppTxAmt>",
  );
});

Deno.test("Form 3800 merges passive and nonpassive Form 8826 on one current-year line", () => {
  const passive = sourceAllocationSchema.parse({
    activity_reference: "Access partnership",
    source_form: "Form 8826",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Access partnership",
      ein: "123456789",
    },
    source_document_reference: "2025 Schedule K-1 access credit",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1e",
    current_year_credit: 500,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
    total_credit: 500,
    special_allowed_credit: 0,
    unallowed_credit: 0,
    allowed_credit: 500,
  });
  const accessSource = { ...selfEarned, eligible_expenditures: 450 };
  const mixedTax = {
    ...tax,
    regularTax: 1_000,
    tentativeMinimumTax: 0,
    standardCredit: 100,
  };
  const xml = form3800.build({
    passive_source_allocations: [passive],
    f8826_credit_entries: [{
      source_type: "self",
      credit_amount: 100,
      subject_to_passive_activity_limit: false,
    }],
    tax_context: mixedTax,
    allowed_credit: 600,
  }, {
    pending: {
      ...filedPending(mixedTax, 600),
      f8826: accessSource,
      form8582cr: {
        credit_sources: [passive],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 500,
      },
    },
    documentIdsByPendingKey: {
      f8826: ["IRS8826_1"],
      form6251: ["IRS6251_1"],
      form8582cr: ["IRS8582CR_1"],
    },
  });
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>600</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(xml, "<Frm8826CYAggrgtAmtGrp");
});

Deno.test("Form 3800 descriptor stays empty without credit and rejects legacy gross credit", () => {
  assertEquals(form3800.build({}), "");
  assertEquals(
    prepareForm3800DocumentParts({}, { documentIdsByPendingKey: {} }),
    undefined,
  );
  assertEquals(form3800.build({ f3800s: [{}] }), "");
  assertThrows(
    () => form3800.build({ f3800s: [{ research_credit: 500 }] }),
    Error,
    "legacy credit cannot be exported",
  );
});

Deno.test("Form 3800 links Form 8820 orphan-drug credit to line 1h", () => {
  const source = {
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 100_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  };
  const businessTax = { ...tax, standardCredit: 19_750 };
  const fields = {
    f8820_credit: {
      credit_amount: 19_750,
      subject_to_passive_activity_limit: false,
    },
    tax_context: businessTax,
    allowed_credit: 19_750,
  };
  const context = {
    pending: { ...filedPending(businessTax, 19_750), f8820: source },
    documentIdsByPendingKey: {
      f8820: ["IRS8820_1"],
      form6251: ["IRS6251_1"],
    },
  };
  const xml = form3800.build(fields, context);
  const parts = prepareForm3800DocumentParts(fields, context);
  if (!parts) throw new Error("Form 3800 source parts were not prepared");
  assertEquals(buildIRS3800Document(parts), xml);
  assertEquals(parts.currentRows[0].metadata.referenceDocumentId, "IRS8820_1");
  assertStringIncludes(xml, "<Form8820CYCreditsGrp");
  assertStringIncludes(xml, 'referenceDocumentId="IRS8820_1"');
  assertEquals(
    form3800.build(fields, { pending: context.pending }),
    "<IRS3800><CAMTAndBEATInd>false</CAMTAndBEATInd></IRS3800>",
  );
  assertThrows(
    () => prepareForm3800DocumentParts(fields, { pending: context.pending }),
    Error,
    "needs reserved document IDs",
  );
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        f8820_credit: { ...fields.f8820_credit, credit_amount: 19_749 },
      }, context),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      prepareForm3800DocumentParts({
        ...fields,
        f8820_credit: { ...fields.f8820_credit, credit_amount: 19_749 },
      }, context),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 3800 links an identified Form 8874 credit to line 1i", () => {
  const source = {
    investments: [{
      cde_name: "Community Development Entity",
      cde_ein: "123456789",
      cde_address: {
        line1: "10 Main Street",
        city: "Wilmington",
        state: "DE",
        zip: "19801",
      },
      initial_investment_date: "2023-04-15",
      credit_allowance_date: "2025-04-15",
      qualified_equity_investment_amount: 100_000,
      designation_notice_reference: "2023 QEI notice",
      held_on_credit_allowance_date: true,
      qualified_on_credit_allowance_date: true,
      recapture_notice_received: false,
      subject_to_passive_activity_limit: false,
    }],
  };
  const businessTax = { ...tax, standardCredit: 5_000 };
  const fields = {
    f8874_credit: {
      credit_amount: 5_000,
      subject_to_passive_activity_limit: false as const,
    },
    tax_context: businessTax,
    allowed_credit: 5_000,
  };
  const context = {
    pending: { ...filedPending(businessTax, 5_000), f8874: source },
    documentIdsByPendingKey: {
      f8874: ["IRS8874_1"],
      form6251: ["IRS6251_1"],
    },
  };
  const xml = form3800.build(fields, context);
  assertStringIncludes(xml, "<Form8874CYCreditsGrp");
  assertStringIncludes(xml, 'referenceDocumentId="IRS8874_1"');
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        f8874_credit: { ...fields.f8874_credit, credit_amount: 4_999 },
      }, context),
    Error,
    "differs from Form 8874",
  );
});

Deno.test("Form 3800 keeps the Form 8874 attachment for a passive-only QEI", () => {
  const source = sourceAllocationSchema.parse({
    activity_reference: "Community venture",
    source_form: "Form 8874",
    source_origin: { kind: PassiveCreditSourceOrigin.Self },
    source_document_reference: "2025 community venture QEI",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1i",
    current_year_credit: 500,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
    total_credit: 500,
    special_allowed_credit: 0,
    unallowed_credit: 0,
    allowed_credit: 500,
  });
  const businessTax = {
    ...tax,
    regularTax: 1_000,
    tentativeMinimumTax: 0,
    standardCredit: 0,
  };
  const input = {
    passive_source_allocations: [source],
    tax_context: businessTax,
    allowed_credit: 500,
  };
  const context = {
    pending: {
      ...filedPending(businessTax, 500),
      f8874: {
        investments: [{
          cde_name: "Community Development Entity",
          cde_ein: "123456789",
          cde_address: {
            line1: "10 Main Street",
            city: "Wilmington",
            state: "DE",
            zip: "19801",
          },
          initial_investment_date: "2023-04-15",
          credit_allowance_date: "2025-04-15",
          qualified_equity_investment_amount: 10_000,
          designation_notice_reference: "2023 QEI notice",
          held_on_credit_allowance_date: true,
          qualified_on_credit_allowance_date: true,
          recapture_notice_received: false,
          subject_to_passive_activity_limit: true,
          passive_activity_reference: "Community venture",
          passive_source_document_reference: "2025 community venture QEI",
        }],
      },
      form8582cr: {
        credit_sources: [source],
        regular_tax_all_income: 1_000,
        regular_tax_without_passive: 500,
      },
    },
    documentIdsByPendingKey: {
      f8874: ["IRS8874_1"],
      form8582cr: ["IRS8582CR_1"],
      form6251: ["IRS6251_1"],
    },
  };
  const passiveXml = form3800.build(input, context);
  assertStringIncludes(passiveXml, "<Form8874CYCreditsGrp");
  assertStringIncludes(passiveXml, 'referenceDocumentId="IRS8874_1"');
  assertThrows(
    () =>
      form3800.build(input, {
        ...context,
        documentIdsByPendingKey: {
          form8582cr: ["IRS8582CR_1"],
          form6251: ["IRS6251_1"],
        },
      }),
    Error,
    "Form 8874 document count differs from source",
  );
  const mixedTax = { ...businessTax, standardCredit: 360 };
  const mixedXml = form3800.build({
    ...input,
    f8874_credit: {
      credit_amount: 360,
      subject_to_passive_activity_limit: false,
    },
    tax_context: mixedTax,
    allowed_credit: 860,
  }, {
    ...context,
    pending: {
      ...filedPending(mixedTax, 860),
      f8874: {
        investments: [
          ...context.pending.f8874.investments,
          {
            ...context.pending.f8874.investments[0],
            initial_investment_date: "2022-04-15",
            qualified_equity_investment_amount: 6_000,
            designation_notice_reference: "2022 QEI notice",
            subject_to_passive_activity_limit: false,
            passive_activity_reference: undefined,
            passive_source_document_reference: undefined,
          },
        ],
      },
      form8582cr: context.pending.form8582cr,
    },
  });
  assertEquals([...mixedXml.matchAll(/<Form8874CYCreditsGrp/g)].length, 1);
  assertStringIncludes(
    mixedXml,
    "<TotalGeneralBusCreditsAmt>860</TotalGeneralBusCreditsAmt>",
  );
  assertStringIncludes(mixedXml, 'referenceDocumentId="IRS8874_1"');
});

Deno.test("Form 3800 files partnership code AD directly without an IRS8874", () => {
  const businessTax = { ...tax, standardCredit: 1_250 };
  const source = {
    partnership_name: "Community partnership",
    partnership_ein: "123456789",
    source_document_reference: "2025 partnership K-1",
    box15_code_ad_new_markets_credit: 1_250,
    new_markets_credit_subject_to_passive_activity_limit: false,
  };
  const fields = {
    f8874_k1_credit_entries: [{
      source_type: "partnership" as const,
      source_ein: "123456789",
      source_document_reference: "2025 partnership K-1",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false as const,
    }],
    tax_context: businessTax,
    allowed_credit: 1_250,
  };
  const context = {
    pending: {
      ...filedPending(businessTax, 1_250),
      k1_partnership: { k1_partnerships: [source] },
    },
    documentIdsByPendingKey: { f8874: [], form6251: ["IRS6251_1"] },
  };
  const xml = form3800.build(fields, context);
  assertStringIncludes(xml, "<Form8874CYCreditsGrp>");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8874"'), false);
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        f8874_k1_credit_entries: [{
          ...fields.f8874_k1_credit_entries[0],
          credit_amount: 1_249,
        }],
      }, context),
    Error,
    "does not reconcile to partnership K-1 code AD",
  );
});

Deno.test("Form 3800 reconciles estate/trust code ZZ New Markets statement", () => {
  const businessTax = { ...tax, standardCredit: 1_250 };
  const source = {
    estate_trust_name: "Community trust",
    entity_type: "trust" as const,
    estate_trust_ein: "123456789",
    source_document_reference: "2025 trust K-1",
    box13_code_zz_new_markets_statement_reference: "New Markets statement",
    box13_code_zz_new_markets_credit: 1_250,
    new_markets_credit_subject_to_passive_activity_limit: false,
    box13_credits: 1_250,
  };
  const fields = {
    f8874_k1_credit_entries: [{
      source_type: "trust" as const,
      source_ein: "123456789",
      source_document_reference: "2025 trust K-1",
      source_statement_reference: "New Markets statement",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false as const,
    }],
    tax_context: businessTax,
    allowed_credit: 1_250,
  };
  const context = {
    pending: {
      ...filedPending(businessTax, 1_250),
      k1_trust: { k1_trusts: [source] },
    },
    documentIdsByPendingKey: { f8874: [], form6251: ["IRS6251_1"] },
  };
  const xml = form3800.build(fields, context);
  assertStringIncludes(xml, "<Form8874CYCreditsGrp>");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        f8874_k1_credit_entries: [{
          ...fields.f8874_k1_credit_entries[0],
          source_statement_reference: "Different statement",
        }],
      }, context),
    Error,
    "does not reconcile to trust K-1 code ZZ statement",
  );
});

Deno.test("Form 3800 accepts Form 8820 pass-through-only credit without IRS8820", () => {
  const source = {
    f8820s: [],
    pass_through_credits: [{
      source_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 Schedule K-1 orphan-drug credit",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
    reduced_section280c_credit_election: false,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  };
  const businessTax = { ...tax, standardCredit: 1_250 };
  const xml = form3800.build({
    f8820_credit: {
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    },
    tax_context: businessTax,
    allowed_credit: 1_250,
  }, {
    pending: { ...filedPending(businessTax, 1_250), f8820: source },
    documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
  });
  assertStringIncludes(xml, "<Form8820CYCreditsGrp>");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8820"'), false);
});

Deno.test("Form 3800 files trust K-1 code M directly on line 1h", () => {
  const businessTax = { ...tax, standardCredit: 1_250 };
  const entry = {
    source_type: "trust" as const,
    source_ein: "123456789",
    source_document_reference: "2025 trust K-1",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const context = {
    pending: {
      ...filedPending(businessTax, 1_250),
      k1_trust: {
        k1_trusts: [{
          estate_trust_name: "Clinical trust",
          entity_type: "trust" as const,
          estate_trust_ein: "123456789",
          source_document_reference: "2025 trust K-1",
          box13_code_m_orphan_drug_credit: 1_250,
          orphan_drug_credit_subject_to_passive_activity_limit: false,
        }],
      },
    },
    documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
  };
  const xml = form3800.build({
    f8820_k1_credit_entries: [entry],
    tax_context: businessTax,
    allowed_credit: 1_250,
  }, context);
  assertStringIncludes(xml, "<Form8820CYCreditsGrp>");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8820"'), false);
  assertThrows(
    () =>
      form3800.build({
        f8820_k1_credit_entries: [{ ...entry, credit_amount: 1_251 }],
        tax_context: { ...businessTax, standardCredit: 1_251 },
        allowed_credit: 1_251,
      }, {
        ...context,
        pending: {
          ...context.pending,
          ...filedPending(businessTax, 1_251),
        },
      }),
    Error,
    "does not reconcile to estate/trust K-1",
  );
  assertThrows(
    () =>
      form3800.build({
        f8820_k1_credit_entries: [{
          ...entry,
          subject_to_passive_activity_limit: true,
        }],
        tax_context: businessTax,
        allowed_credit: 1_250,
      }, context),
    Error,
    "needs Form 8582-CR",
  );
});

Deno.test("Form 3800 reconciles partnership and S-corporation code Z on line 1h", () => {
  for (const source_type of ["partnership", "s_corporation"] as const) {
    const businessTax = { ...tax, standardCredit: 1_250 };
    const entry = {
      source_type,
      source_ein: "123456789",
      source_document_reference: `2025 ${source_type} K-1`,
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    };
    const k1 = source_type === "partnership"
      ? {
        k1_partnership: {
          k1_partnerships: [{
            partnership_name: "Clinical partnership",
            partnership_ein: "123456789",
            source_document_reference: entry.source_document_reference,
            box15_code_z_orphan_drug_credit: 1_250,
            orphan_drug_credit_subject_to_passive_activity_limit: false,
          }],
        },
      }
      : {
        k1_s_corp: {
          k1_s_corps: [{
            corporation_name: "Clinical S corporation",
            corporation_ein: "123456789",
            source_document_reference: entry.source_document_reference,
            box13_code_z_orphan_drug_credit: 1_250,
            orphan_drug_credit_subject_to_passive_activity_limit: false,
          }],
        },
      };
    const context = {
      pending: { ...filedPending(businessTax, 1_250), ...k1 },
      documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
    };
    const xml = form3800.build({
      f8820_k1_credit_entries: [entry],
      tax_context: businessTax,
      allowed_credit: 1_250,
    }, context);
    assertStringIncludes(xml, "<Form8820CYCreditsGrp>");
    assertStringIncludes(
      xml,
      "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
    );
    assertEquals(xml.includes('referenceDocumentName="IRS8820"'), false);
    assertThrows(
      () =>
        form3800.build({
          f8820_k1_credit_entries: [{ ...entry, credit_amount: 1_251 }],
          tax_context: { ...businessTax, standardCredit: 1_251 },
          allowed_credit: 1_251,
        }, context),
      Error,
      "does not reconcile",
    );
  }
});

Deno.test("Form 3800 combines own Form 8820 and trust K-1 on line 1h", () => {
  const ownForm = {
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 100_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  };
  const entry = {
    source_type: "estate" as const,
    source_ein: "123456789",
    source_document_reference: "2025 estate K-1",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const businessTax = { ...tax, regularTax: 50_000, standardCredit: 21_000 };
  const xml = form3800.build({
    f8820_credit: {
      credit_amount: 19_750,
      subject_to_passive_activity_limit: false,
    },
    f8820_k1_credit_entries: [entry],
    tax_context: businessTax,
    allowed_credit: 21_000,
  }, {
    pending: {
      ...filedPending(businessTax, 21_000),
      f8820: ownForm,
      k1_trust: {
        k1_trusts: [{
          estate_trust_name: "Clinical estate",
          entity_type: "estate" as const,
          estate_trust_ein: "123456789",
          source_document_reference: "2025 estate K-1",
          box13_code_m_orphan_drug_credit: 1_250,
          orphan_drug_credit_subject_to_passive_activity_limit: false,
        }],
      },
    },
    documentIdsByPendingKey: {
      f8820: ["IRS8820_1"],
      form6251: ["IRS6251_1"],
    },
  });
  assertStringIncludes(xml, "<Form8820CYCreditsGrp");
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>21000</TotalGeneralBusCreditsAmt>",
  );
});

Deno.test("Form 3800 requires each mixed Form 8820 source allocation under a shared limit", () => {
  const source = {
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 100_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    pass_through_credits: [{
      source_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 Schedule K-1 orphan-drug credit",
      credit_amount: 5_250,
      subject_to_passive_activity_limit: false,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  };
  const businessTax = { ...tax, standardCredit: 25_000 };
  const context = {
    pending: { ...filedPending(businessTax, 20_000), f8820: source },
    documentIdsByPendingKey: {
      f8820: ["IRS8820_1"],
      form6251: ["IRS6251_1"],
    },
  };
  const fields = {
    f8820_credit: {
      credit_amount: 25_000,
      subject_to_passive_activity_limit: false,
    },
    tax_context: businessTax,
    allowed_credit: 20_000,
    form8820_applied_credit: 20_000,
  };
  assertThrows(
    () => form3800.build(fields, context),
    Error,
    "Part V applied amounts",
  );
  const xml = form3800.build({
    ...fields,
    form8820_applied_credits_by_source: [16_000, 4_000],
  }, context);
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(xml, 'lineNumberTxt="Part III Line 1h"');
});

Deno.test("Form 3800 links Form 8936 business-use credit to line 1y", () => {
  const vehicle = {
    vin: "1HGCM82633A004352",
    vehicle_year: 2025,
    vehicle_make: "Example",
    vehicle_model: "EV",
    acquisition_date: "2025-09-30",
    placed_in_service_date: "2025-09-30",
    seller_report_received: true,
    transferred_to_dealer: false,
    resold_within_30_days: false,
    acquired_for_use_not_resale: true,
    credit_kind: "new_clean_vehicle",
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other" as const,
    business_credit_subject_to_passive_activity_limit: false,
    business_use: {
      kind: "mileage" as const,
      business_miles: 250,
      commuting_miles: 0,
      total_miles: 1_000,
      months_in_business_use: 12,
    },
  };
  const source = {
    current_year_magi: { adjusted_gross_income: 50_000 },
    prior_year_magi: { adjusted_gross_income: 48_000 },
    filing_status: FilingStatus.Single,
    prior_year_filing_status: FilingStatus.Single,
    f8936s: [vehicle],
  };
  const businessTax = { ...tax, standardCredit: 1_875 };
  const fields = {
    f8936_new_vehicle_credit: {
      credit_amount: 1_875,
      subject_to_passive_activity_limit: false,
    },
    tax_context: businessTax,
    allowed_credit: 1_875,
  };
  const context = {
    pending: { ...filedPending(businessTax, 1_875), f8936: source },
    documentIdsByPendingKey: {
      form6251: ["IRS6251_1"],
    },
    documentIdsByTag: { IRS8936: ["IRS8936_1"] },
  };
  const xml = form3800.build(fields, context);
  assertStringIncludes(xml, "<Form8936PartIICYCreditsGrp");
  assertStringIncludes(xml, 'referenceDocumentId="IRS8936_1"');
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>1875</CurrentYearCreditAllowedAmt>",
  );
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        f8936_new_vehicle_credit: {
          ...fields.f8936_new_vehicle_credit,
          credit_amount: 1_874,
        },
      }, context),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 3800 links qualified commercial clean vehicle credit to line 1aa", () => {
  const vehicle = {
    vin: "1HGCM82633A004352",
    vehicle_year: 2025,
    vehicle_make: "Example",
    vehicle_model: "Electric Van",
    acquisition_date: "2025-09-30",
    placed_in_service_date: "2025-09-30",
    transferred_to_dealer: false,
    resold_within_30_days: false,
    acquired_for_use_not_resale: true,
    credit_kind: "qualified_commercial_clean_vehicle",
    business_credit_subject_to_passive_activity_limit: false,
    commercial: {
      owned_by_taxpayer: true,
      qualified_manufacturer: true,
      original_use_begins_with_taxpayer: true,
      claimed_new_clean_credit_for_vin: false,
      primarily_used_in_us: true,
      subject_to_depreciation: true,
      vehicle_design: "street_vehicle",
      powered_partly_by_gas_or_diesel: false,
      gvwr_pounds: 10_000,
      cost_or_other_basis: 60_000,
      section179_expense_deduction: 0,
      incremental_cost: {
        kind: "2025_light_street_safe_harbor",
        is_compact_car_phev: false,
      },
      propulsion: {
        kind: "plug_in_electric",
        battery_capacity_kwh: 80,
        externally_rechargeable: true,
      },
    },
  };
  const source = {
    current_year_magi: { adjusted_gross_income: 50_000 },
    prior_year_magi: { adjusted_gross_income: 48_000 },
    filing_status: FilingStatus.Single,
    prior_year_filing_status: FilingStatus.Single,
    f8936s: [vehicle],
  };
  const businessTax = { ...tax, standardCredit: 7_500 };
  const fields = {
    f8936_commercial_vehicle_credit: {
      credit_amount: 7_500,
      subject_to_passive_activity_limit: false,
    },
    tax_context: businessTax,
    allowed_credit: 7_500,
  };
  const context = {
    pending: { ...filedPending(businessTax, 7_500), f8936: source },
    documentIdsByPendingKey: {
      form6251: ["IRS6251_1"],
    },
    documentIdsByTag: { IRS8936: ["IRS8936_1"] },
  };
  const xml = form3800.build(fields, context);
  assertStringIncludes(xml, "<Form8936PartVCYCreditsGrp");
  assertStringIncludes(xml, 'referenceDocumentId="IRS8936_1"');
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        f8936_commercial_vehicle_credit: {
          ...fields.f8936_commercial_vehicle_credit,
          credit_amount: 7_499,
        },
      }, context),
    Error,
    "line 1aa does not reconcile",
  );
});

Deno.test("Form 3800 links and limits a nonpassive Form 5884 line 4b credit", () => {
  const source = {
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
  };
  const specifiedTax = {
    ...tax,
    standardCredit: 0,
    specifiedCredit: 2_400,
  };
  const fields = {
    f5884_credit: {
      credit_amount: 2_400,
      subject_to_passive_activity_limit: false,
    },
    tax_context: specifiedTax,
    allowed_credit: 2_400,
  };
  const context = {
    pending: { ...filedPending(specifiedTax, 2_400), f5884: source },
    documentIdsByPendingKey: {
      f5884: ["IRS5884_1"],
      f8835: [],
      f8936: ["IRS8936_1"],
    },
  };
  const xml = form3800.build(fields, context);
  assertStringIncludes(xml, "<Form5884CYCreditsGrp");
  assertStringIncludes(
    xml,
    'referenceDocumentId="IRS5884_1" referenceDocumentName="IRS5884"',
  );
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>2400</CurrentYearCreditAllowedAmt>",
  );
  const limitedTax = {
    ...specifiedTax,
    regularTax: 1_000,
    tentativeMinimumTax: 0,
  };
  const limitedXml = form3800.build({
    ...fields,
    tax_context: limitedTax,
    allowed_credit: 1_000,
  }, {
    ...context,
    pending: { ...filedPending(limitedTax, 1_000), f5884: source },
  });
  assertStringIncludes(
    limitedXml,
    "<CurrentYearCreditAllowedAmt>1000</CurrentYearCreditAllowedAmt>",
  );
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        f5884_credit: { ...fields.f5884_credit, credit_amount: 2_399 },
      }, context),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 3800 reports pass-through-only Form 5884 credit without a recipient Form 5884", () => {
  const source = {
    subject_to_passive_activity_limit: false,
    f5884s: [],
    pass_through_credits: [{
      source_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 K-1 box 15 code J",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  };
  const specifiedTax = {
    ...tax,
    standardCredit: 0,
    specifiedCredit: 1_250,
  };
  const xml = form3800.build({
    f5884_credit: {
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    },
    tax_context: specifiedTax,
    allowed_credit: 1_250,
  }, {
    pending: { ...filedPending(specifiedTax, 1_250), f5884: source },
    documentIdsByPendingKey: { f5884: [], f8835: [] },
  });
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS5884"'), false);
});

Deno.test("Form 3800 requires a Part V split when mixed Form 5884 sources are partly limited", () => {
  const source = {
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
      source_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 K-1 box 15 code J",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  };
  const limitedTax = {
    ...tax,
    standardCredit: 0,
    specifiedCredit: 3_650,
    regularTax: 1_000,
    tentativeMinimumTax: 0,
  };
  const context = {
    pending: { ...filedPending(limitedTax, 1_000), f5884: source },
    documentIdsByPendingKey: { f5884: ["IRS5884_1"], f8835: [] },
  };
  const fields = {
    f5884_credit: {
      credit_amount: 3_650,
      subject_to_passive_activity_limit: false,
    },
    tax_context: limitedTax,
    allowed_credit: 1_000,
  };
  assertThrows(
    () => form3800.build(fields, context),
    Error,
    "Part V applied amounts",
  );
  const xml = form3800.build({
    ...fields,
    form5884_applied_credits_by_source: [600, 400],
  }, context);
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(xml, "<Frm5884CYAggrgtAmtGrp");
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>1800</CarryforwardGeneralBusCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<CarryforwardGeneralBusCrAmt>850</CarryforwardGeneralBusCrAmt>",
  );
});

Deno.test("Form 3800 descriptor links self-earned Form 8826 and finalized Part II", () => {
  const fields = {
    f8826_credit_entries: [{
      source_type: "self" as const,
      credit_amount: 5_000,
      subject_to_passive_activity_limit: false,
    }],
    tax_context: tax,
    allowed_credit: 5_000,
  };
  assertStringIncludes(form3800.build(fields), "<IRS3800>");
  const xml = form3800.build(fields, {
    pending: { ...filedPending(tax, 5_000), f8826: selfEarned },
    documentIdsByPendingKey: {
      f8826: ["IRS8826_1"],
      f8835: [],
      form6251: ["IRS6251_1"],
    },
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>5000</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="IRS8826_1" referenceDocumentName="IRS8826"',
  );
  assertThrows(
    () =>
      form3800.build(fields, {
        pending: {
          ...filedPending(tax, 5_000),
          f1040: { line16_income_tax: 41_000 },
          f8826: selfEarned,
        },
        documentIdsByPendingKey: {
          f8826: ["IRS8826_1"],
          form6251: ["IRS6251_1"],
        },
      }),
    Error,
    "regularTax does not reconcile to the filed return",
  );
  assertThrows(
    () =>
      form3800.build(fields, {
        pending: {
          ...filedPending(tax, 5_000),
          schedule3: { line6a_total: 5_000, line7_total: 6_000 },
          f8826: selfEarned,
        },
        documentIdsByPendingKey: {
          f8826: ["IRS8826_1"],
          form6251: ["IRS6251_1"],
        },
      }),
    Error,
    "priorAllowableCredits does not reconcile to the filed return",
  );
  assertThrows(
    () =>
      form3800.build(fields, {
        pending: {
          ...filedPending(tax, 5_000),
          f8826: { ...selfEarned, eligible_expenditures: 5_000 },
        },
        documentIdsByPendingKey: {
          f8826: ["IRS8826_1"],
          form6251: ["IRS6251_1"],
        },
      }),
    Error,
    "do not reconcile",
  );
});

Deno.test("Form 3800 descriptor preserves a pass-through-only Form 8826 source", () => {
  const source = {
    eligible_expenditures: 0,
    subject_to_passive_activity_limit: false,
    pass_through_credits: [{
      entity_type: "s_corporation" as const,
      entity_ein: "987654321",
      source_document_reference: "2025 disabled-access K-1",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  };
  const xml = form3800.build({
    f8826_credit_entries: [{
      source_type: "s_corporation",
      source_ein: "987654321",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
    tax_context: { ...tax, standardCredit: 1_250 },
    allowed_credit: 1_250,
  }, {
    pending: { ...filedPending(tax, 1_250), f8826: source },
    documentIdsByPendingKey: { f8826: [], f8835: [], form6251: ["IRS6251_1"] },
  });
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8826"'), false);
  assertThrows(
    () =>
      form3800.build({
        f8826_credit_entries: [{
          source_type: "s_corporation",
          source_ein: "987654321",
          credit_amount: 1_250,
          subject_to_passive_activity_limit: false,
        }],
        tax_context: { ...tax, standardCredit: 1_250 },
        allowed_credit: 1_250,
      }, {
        pending: {
          ...filedPending(tax, 1_250),
          f8826: {
            ...source,
            pass_through_credits: [{
              ...source.pass_through_credits[0],
              subject_to_passive_activity_limit: true,
            }],
          },
        },
        documentIdsByPendingKey: {
          f8826: [],
          f8835: [],
          form6251: ["IRS6251_1"],
        },
      }),
    Error,
    "disabled-access entries do not reconcile",
  );
});

Deno.test("Form 3800 files direct estate/trust disabled-access code ZZ without Form 8826", () => {
  for (const source_type of ["estate", "trust"] as const) {
    const taxContext = { ...tax, standardCredit: 1_250 };
    const entry = {
      source_type,
      source_ein: "123456789",
      source_document_reference: `2025 ${source_type} K-1`,
      source_statement_reference: `${source_type} disabled-access statement`,
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    };
    const k1 = {
      estate_trust_name: `Access ${source_type}`,
      entity_type: source_type,
      estate_trust_ein: "123456789",
      source_document_reference: entry.source_document_reference,
      box13_code_zz_disabled_access_credit: 1_250,
      box13_code_zz_disabled_access_statement_reference:
        entry.source_statement_reference,
      disabled_access_credit_subject_to_passive_activity_limit: false,
    };
    const fields = {
      f8826_credit_entries: [entry],
      tax_context: taxContext,
      allowed_credit: 1_250,
    };
    const context = {
      pending: {
        ...filedPending(taxContext, 1_250),
        k1_trust: { k1_trusts: [k1] },
      },
      documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
    };
    const xml = form3800.build(fields, context);
    assertStringIncludes(xml, "<Form8826CYCreditsGrp>");
    assertStringIncludes(
      xml,
      "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
    );
    assertEquals(xml.includes('referenceDocumentName="IRS8826"'), false);
    assertThrows(
      () =>
        form3800.build(fields, {
          ...context,
          pending: {
            ...context.pending,
            k1_trust: {
              k1_trusts: [{
                ...k1,
                source_document_reference: "Unclaimed K-1",
              }],
            },
          },
        }),
      Error,
      "does not reconcile to K-1 box 13 code ZZ statement",
    );
    assertThrows(
      () =>
        form3800.build(fields, {
          ...context,
          pending: {
            ...context.pending,
            k1_trust: {
              k1_trusts: [{
                ...k1,
                box13_code_zz_disabled_access_statement_reference:
                  "Unclaimed statement",
              }],
            },
          },
        }),
      Error,
      "does not reconcile to K-1 box 13 code ZZ statement",
    );
  }
});

Deno.test("Form 3800 files direct partnership and S-corporation code K without Form 8826", () => {
  for (const source_type of ["partnership", "s_corporation"] as const) {
    const taxContext = { ...tax, standardCredit: 1_250 };
    const entry = {
      source_type,
      source_ein: "123456789",
      source_document_reference: `2025 ${source_type} K-1`,
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    };
    const k1 = source_type === "partnership"
      ? {
        k1_partnership: {
          k1_partnerships: [{
            partnership_name: "Access partnership",
            partnership_ein: "123456789",
            source_document_reference: entry.source_document_reference,
            box15_code_k_disabled_access_credit: 1_250,
            disabled_access_credit_subject_to_passive_activity_limit: false,
          }],
        },
      }
      : {
        k1_s_corp: {
          k1_s_corps: [{
            corporation_name: "Access S corporation",
            corporation_ein: "123456789",
            source_document_reference: entry.source_document_reference,
            box13_code_k_disabled_access_credit: 1_250,
            disabled_access_credit_subject_to_passive_activity_limit: false,
          }],
        },
      };
    const fields = {
      f8826_credit_entries: [entry],
      tax_context: taxContext,
      allowed_credit: 1_250,
    };
    const context = {
      pending: { ...filedPending(taxContext, 1_250), ...k1 },
      documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
    };
    const xml = form3800.build(fields, context);
    assertStringIncludes(xml, "<Form8826CYCreditsGrp>");
    assertStringIncludes(
      xml,
      "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
    );
    assertEquals(xml.includes('referenceDocumentName="IRS8826"'), false);
    assertThrows(
      () =>
        form3800.build(fields, {
          ...context,
          pending: { ...filedPending(taxContext, 1_250) },
        }),
      Error,
      source_type === "partnership"
        ? "does not reconcile to K-1 box 15 code K"
        : "does not reconcile to K-1 box 13 code K",
    );
    assertThrows(
      () =>
        form3800.build(fields, {
          ...context,
          pending: {
            ...context.pending,
            f8826: {
              eligible_expenditures: 0,
              subject_to_passive_activity_limit: false,
              pass_through_credits: [{
                entity_type: source_type,
                entity_ein: "123456789",
                source_document_reference: entry.source_document_reference,
                credit_amount: 1_250,
                subject_to_passive_activity_limit: false,
              }],
            },
          },
        }),
      Error,
      "duplicated on Form 8826",
    );
  }
});

Deno.test("Form 3800 caps two direct code K pass-through credits at line 1e's $5,000 limit", () => {
  const taxContext = { ...tax, standardCredit: 5_000 };
  const xml = form3800.build({
    f8826_credit_entries: [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 Access partnership K-1",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: false,
    }, {
      source_type: "s_corporation",
      source_ein: "987654321",
      source_document_reference: "2025 Access S corporation K-1",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: false,
    }],
    tax_context: taxContext,
    allowed_credit: 5_000,
  }, {
    pending: {
      ...filedPending(taxContext, 5_000),
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Access partnership",
          partnership_ein: "123456789",
          source_document_reference: "2025 Access partnership K-1",
          box15_code_k_disabled_access_credit: 3_000,
          disabled_access_credit_subject_to_passive_activity_limit: false,
        }],
      },
      k1_s_corp: {
        k1_s_corps: [{
          corporation_name: "Access S corporation",
          corporation_ein: "987654321",
          source_document_reference: "2025 Access S corporation K-1",
          box13_code_k_disabled_access_credit: 3_000,
          disabled_access_credit_subject_to_passive_activity_limit: false,
        }],
      },
    },
    documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
  });
  assertStringIncludes(
    xml,
    "<TotalGeneralBusCreditsAmt>5000</TotalGeneralBusCreditsAmt>",
  );
  assertEquals(xml.includes('referenceDocumentName="IRS8826"'), false);
});

Deno.test("Form 3800 combines self-earned and trust disabled-access credits on one line 1e", () => {
  const own = { ...selfEarned, eligible_expenditures: 5_000 };
  const taxContext = { ...tax, standardCredit: 3_375 };
  const trust = {
    estate_trust_name: "Access trust",
    entity_type: "trust" as const,
    estate_trust_ein: "123456789",
    source_document_reference: "2025 Trust K-1",
    box13_code_zz_disabled_access_credit: 1_000,
    box13_code_zz_disabled_access_statement_reference: "2025 access statement",
    disabled_access_credit_subject_to_passive_activity_limit: false,
  };
  const fields = {
    f8826_credit_entries: [{
      source_type: "self" as const,
      credit_amount: 2_375,
      subject_to_passive_activity_limit: false,
    }, {
      source_type: "trust" as const,
      source_ein: "123456789",
      source_document_reference: "2025 Trust K-1",
      source_statement_reference: "2025 access statement",
      credit_amount: 1_000,
      subject_to_passive_activity_limit: false,
    }],
    tax_context: taxContext,
    allowed_credit: 3_375,
  };
  const context = {
    pending: {
      ...filedPending(taxContext, 3_375),
      f8826: own,
      k1_trust: { k1_trusts: [trust] },
    },
    documentIdsByPendingKey: {
      f8826: ["IRS8826_1"],
      form6251: ["IRS6251_1"],
    },
  };
  const xml = form3800.build(fields, context);
  assertEquals([...xml.matchAll(/<Form8826CYCreditsGrp/g)].length, 1);
  assertEquals([...xml.matchAll(/<Frm8826CYAggrgtAmtGrp/g)].length, 2);
  assertStringIncludes(
    xml,
    "<CYGeneralBusinessCrItemCnt>2</CYGeneralBusinessCrItemCnt>",
  );
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  const cappedTax = { ...taxContext, standardCredit: 5_000 };
  const cappedXml = form3800.build({
    ...fields,
    f8826_credit_entries: [{
      ...fields.f8826_credit_entries[0],
    }, {
      ...fields.f8826_credit_entries[1],
      credit_amount: 3_000,
    }],
    tax_context: cappedTax,
    allowed_credit: 5_000,
  }, {
    ...context,
    pending: {
      ...filedPending(cappedTax, 5_000),
      f8826: own,
      k1_trust: {
        k1_trusts: [{
          ...trust,
          box13_code_zz_disabled_access_credit: 3_000,
        }],
      },
    },
  });
  assertStringIncludes(
    cappedXml,
    "<TotalGeneralBusCreditsAmt>5000</TotalGeneralBusCreditsAmt>",
  );
  assertEquals([...cappedXml.matchAll(/<Form8826CYCreditsGrp/g)].length, 1);
  assertEquals([...cappedXml.matchAll(/<Frm8826CYAggrgtAmtGrp/g)].length, 2);
  const limitedTax = { ...cappedTax, regularTax: 23_000 };
  const limitedFields = {
    ...fields,
    f8826_credit_entries: [{
      ...fields.f8826_credit_entries[0],
    }, {
      ...fields.f8826_credit_entries[1],
      credit_amount: 3_000,
    }],
    tax_context: limitedTax,
    allowed_credit: 3_000,
  };
  const limitedContext = {
    ...context,
    pending: {
      ...filedPending(limitedTax, 3_000),
      f8826: own,
      k1_trust: {
        k1_trusts: [{
          ...trust,
          box13_code_zz_disabled_access_credit: 3_000,
        }],
      },
    },
  };
  assertThrows(
    () => form3800.build(limitedFields, limitedContext),
    Error,
    "Part V applied amounts for each Form 8826 source",
  );
  const limitedXml = form3800.build({
    ...limitedFields,
    form8826_applied_credits_by_source: [1_000, 2_000],
  }, limitedContext);
  assertEquals([...limitedXml.matchAll(/<Frm8826CYAggrgtAmtGrp/g)].length, 2);
});

Deno.test("Form 3800 descriptor requires chosen Part V use when two K-1 sources are partly limited", () => {
  const source = {
    eligible_expenditures: 0,
    subject_to_passive_activity_limit: false,
    pass_through_credits: [{
      entity_type: "partnership" as const,
      entity_ein: "111111111",
      source_document_reference: "2025 disabled-access K-1",
      credit_amount: 2_000,
      subject_to_passive_activity_limit: false,
    }, {
      entity_type: "s_corporation" as const,
      entity_ein: "222222222",
      source_document_reference: "2025 disabled-access K-1",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: false,
    }],
  };
  const fields = {
    f8826_credit_entries: [{
      source_type: "partnership" as const,
      source_ein: "111111111",
      credit_amount: 2_000,
      subject_to_passive_activity_limit: false,
    }, {
      source_type: "s_corporation" as const,
      source_ein: "222222222",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: false,
    }],
    tax_context: { ...tax, regularTax: 23_000 },
    allowed_credit: 3_000,
  };
  const context = {
    pending: {
      ...filedPending(fields.tax_context, 3_000),
      f8826: source,
    },
    documentIdsByPendingKey: { f8826: [], f8835: [], form6251: ["IRS6251_1"] },
  };
  assertThrows(
    () => form3800.build(fields, context),
    Error,
    "Part V applied amounts for each Form 8826 source",
  );
  const xml = form3800.build({
    ...fields,
    form8826_applied_credits_by_source: [1_000, 2_000],
  }, context);
  assertEquals([...xml.matchAll(/<Frm8826CYAggrgtAmtGrp /g)].length, 2);
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>3000</CurrentYearCreditAllowedAmt>",
  );
});

Deno.test("Form 3800 descriptor links a specified Form 8835 facility", () => {
  const fields = {
    f8835_credit_entries: [specifiedEntry()],
    tax_context: {
      ...tax,
      standardCredit: 0,
      specifiedCredit: 6_000,
    },
    allowed_credit: 6_000,
  };
  const context = {
    pending: {
      ...filedPending(fields.tax_context, 6_000),
      f8835: { f8835s: [windFacility] },
    },
    documentIdsByPendingKey: { f8826: [], f8835: ["IRS8835_1"] },
  };
  const xml = form3800.build(fields, context);
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>6000</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(xml, 'referenceDocumentId="IRS8835_1"');
  assertThrows(
    () =>
      form3800.build(fields, {
        ...context,
        documentIdsByPendingKey: { f8826: [], f8835: [] },
      }),
    Error,
    "one attached Form 8835 per facility",
  );
  assertThrows(
    () =>
      form3800.build(fields, {
        ...context,
        pending: {
          ...context.pending,
          f8835: { f8835s: [{ ...windFacility, kwh_sold: 500_000 }] },
        },
      }),
    Error,
    "do not reconcile",
  );
});

Deno.test("Form 3800 descriptor needs explicit Part V use for partly limited same-line facilities", () => {
  const fields = {
    f8835_credit_entries: [specifiedEntry(), specifiedEntry()],
    tax_context: {
      ...tax,
      regularTax: 7_000,
      tentativeMinimumTax: 0,
      standardCredit: 0,
      specifiedCredit: 12_000,
    },
    allowed_credit: 7_000,
  };
  const context = {
    pending: {
      ...filedPending(fields.tax_context, 7_000),
      f8835: {
        f8835s: [
          windFacility,
          {
            ...windFacility,
            facility_description: "Second onshore wind turbine",
            facility_us_address: {
              ...windFacility.facility_us_address,
              line1: "200 Wind Farm Rd",
            },
            facility_latitude: 30.367153,
          },
        ],
      },
    },
    documentIdsByPendingKey: {
      f8826: [],
      f8835: ["IRS8835_1", "IRS8835_2"],
    },
  };
  assertThrows(
    () => form3800.build(fields, context),
    Error,
    "Part V applied amounts for each Form 8835 line 4e facility",
  );
  const xml = form3800.build({
    ...fields,
    form8835_applied_credits_by_facility: [3_000, 4_000],
  }, context);
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAllowedAmt>7000</CurrentYearCreditAllowedAmt>",
  );
  assertStringIncludes(xml, 'referenceDocumentId="IRS8835_1"');
  assertStringIncludes(xml, 'referenceDocumentId="IRS8835_2"');
  assertThrows(
    () =>
      form3800.build({
        ...fields,
        form8835_applied_credits_by_facility: [4_000, 4_000],
      }, context),
    Error,
    "do not reconcile to Part II",
  );
});

Deno.test("Form 3800 descriptor requires a bundled transfer-election statement", () => {
  const statement = "Transfer election.pdf";
  const fields = {
    f8835_credit_entries: [specifiedEntry({
      transfer_out_amount: 2_000,
      registration_number: "CAABC12ABCDE",
      transfer_election_statement_file_name: statement,
    })],
    tax_context: {
      ...tax,
      standardCredit: 0,
      specifiedCredit: 4_000,
    },
    allowed_credit: 4_000,
  };
  const context = {
    pending: {
      ...filedPending(fields.tax_context, 4_000),
      f8835: {
        f8835s: [{
          ...windFacility,
          transfer_election_amount: 2_000,
          registration_number: "CAABC12ABCDE",
          transfer_election_statement_file_name: statement,
        }],
      },
    },
    documentIdsByPendingKey: { f8826: [], f8835: ["IRS8835_1"] },
  };
  assertThrows(
    () => form3800.build(fields, context),
    Error,
    "transfer statement is not bundled",
  );
  const xml = form3800.build(fields, {
    ...context,
    documentIdsByAttachmentFileName: { [statement]: "BinaryAttachment1" },
  });
  assertStringIncludes(xml, 'referenceDocumentId="BinaryAttachment1"');
});
