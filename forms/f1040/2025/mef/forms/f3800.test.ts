import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { EnergyType } from "../../../nodes/inputs/f8835/index.ts";
import { TargetGroup } from "../../../nodes/inputs/f5884/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { form3800 } from "./f3800.ts";

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

Deno.test("Form 3800 descriptor stays empty without credit and rejects legacy gross credit", () => {
  assertEquals(form3800.build({}), "");
  assertEquals(form3800.build({ f3800s: [{}] }), "");
  assertThrows(
    () => form3800.build({ f3800s: [{ research_credit: 500 }] }),
    Error,
    "legacy credit cannot be exported",
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
      },
      qualified_wages_confirmed: true,
      not_prior_employee_confirmed: true,
      not_related_or_dependent_confirmed: true,
      more_than_half_wages_for_trade_or_business_confirmed: true,
      excluded_wages_removed_confirmed: true,
      first_year_wages: 6_000,
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
      },
      qualified_wages_confirmed: true,
      not_prior_employee_confirmed: true,
      not_related_or_dependent_confirmed: true,
      more_than_half_wages_for_trade_or_business_confirmed: true,
      excluded_wages_removed_confirmed: true,
      first_year_wages: 6_000,
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
});

Deno.test("Form 3800 descriptor requires chosen Part V use when two K-1 sources are partly limited", () => {
  const source = {
    eligible_expenditures: 0,
    subject_to_passive_activity_limit: false,
    pass_through_credits: [{
      entity_type: "partnership" as const,
      entity_ein: "111111111",
      credit_amount: 2_000,
      subject_to_passive_activity_limit: false,
    }, {
      entity_type: "s_corporation" as const,
      entity_ein: "222222222",
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
      f8835: { f8835s: [windFacility, windFacility] },
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
