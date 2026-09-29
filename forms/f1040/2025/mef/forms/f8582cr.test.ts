import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  calculateForm8582CR,
  inputSchema,
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { form8582cr } from "./f8582cr.ts";

const otherCredit = {
  activity_reference: "Clinical activity",
  source_form: "Form 8820",
  source_origin: { kind: PassiveCreditSourceOrigin.Self },
  source_document_reference: "2025 clinical credit statement",
  category: PassiveCreditCategory.Other,
  reporting_route: PassiveCreditReportingRoute.Form3800Line3,
  form3800_credit_line: "1h",
  current_year_credit: 1_500,
  prior_unallowed_credits: [{
    originating_tax_year: 2024,
    credit_amount: 500,
    source_document_reference: "2024 clinical credit carryover statement",
  }],
  publicly_traded_partnership: false,
};

const rentalCredit = {
  activity_reference: "Rental house",
  source_form: "Form 8835",
  source_origin: { kind: PassiveCreditSourceOrigin.Self },
  source_document_reference: "2025 rental credit statement",
  category: PassiveCreditCategory.ActiveRental,
  reporting_route: PassiveCreditReportingRoute.Form3800Line3,
  form3800_credit_line: "1f",
  current_year_credit: 3_000,
  prior_unallowed_credits: [],
  publicly_traded_partnership: false,
};

Deno.test("Form 8582-CR: absent or empty credits emit no document", () => {
  assertEquals(form8582cr.build({}), "");
  assertEquals(
    form8582cr.build({
      credit_sources: [],
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 8_000,
    }),
    "",
  );
});

Deno.test("Form 8582-CR rejects passive K-1 evidence without activity facts", () => {
  for (
    const field of [
      "required_orphan_drug_k1_credits",
      "required_new_markets_k1_credits",
      "required_new_markets_self_credits",
      "required_disabled_access_k1_credits",
    ]
  ) {
    assertThrows(
      () =>
        form8582cr.build({
          [field]: [{
            source_type: "partnership",
            source_ein: "123456789",
            source_document_reference: "2025 clinical K-1",
            credit_amount: 500,
          }],
        }),
      Error,
      "needs activity and tax facts",
    );
  }
});

Deno.test("Form 8582-CR self-earned New Markets source matches attached Form 8874", () => {
  const investment = {
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
  };
  const source = {
    ...otherCredit,
    activity_reference: "Community venture",
    source_form: "Form 8874",
    source_document_reference: "2025 community venture QEI",
    form3800_credit_line: "1i",
    current_year_credit: 500,
    prior_unallowed_credits: [],
  };
  const input = {
    credit_sources: [source],
    regular_tax_all_income: 2_000,
    regular_tax_without_passive: 1_500,
  };
  const allocation = calculateForm8582CR(inputSchema.parse(input))
    .sourceAllocations[0];
  const context = {
    documentIdsByPendingKey: {
      f3800: ["IRS3800_1"],
      f8874: ["IRS8874_1"],
    },
    pending: {
      f3800: { passive_source_allocations: [allocation] },
      f8874: { investments: [investment] },
    },
  };
  assertStringIncludes(
    form8582cr.build(input, context),
    "<AllowedCreditsAmt>500</AllowedCreditsAmt>",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        ...context,
        pending: {
          ...context.pending,
          f8874: {
            investments: [{
              ...investment,
              qualified_equity_investment_amount: 9_000,
            }],
          },
        },
      }),
    Error,
    "differs from filed Form 8874",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        ...context,
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "needs attached Form 8874",
  );
});

Deno.test("Form 8582-CR: Part I preserves current and prior other credits", () => {
  const xml = form8582cr.build({
    credit_sources: [otherCredit],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  });
  assertStringIncludes(
    xml,
    "<AllPassiveCreditGrp><OtherCurrentYearAmt>1500</OtherCurrentYearAmt><OtherPriorUnallowedAmt>500</OtherPriorUnallowedAmt><TotalOtherCreditsAmt>2000</TotalOtherCreditsAmt></AllPassiveCreditGrp>",
  );
  assertStringIncludes(xml, "<TotalCreditAmt>2000</TotalCreditAmt>");
  assertStringIncludes(
    xml,
    "<NetPassiveIncomeTaxAmt>1000</NetPassiveIncomeTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalCreditMinusTaxAmt>1000</TotalCreditMinusTaxAmt>",
  );
  assertStringIncludes(xml, "<AllowedCreditsAmt>1000</AllowedCreditsAmt>");
  assertEquals(xml.includes("<SpecialAllowActiveGrp>"), false);
});

Deno.test("Form 8582-CR requires the same business sources on attached Form 3800", () => {
  const input = {
    credit_sources: [otherCredit],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  };
  const allocation = calculateForm8582CR(inputSchema.parse(input))
    .sourceAllocations[0];
  assertEquals(allocation.publicly_traded_partnership, false);
  assertStringIncludes(
    form8582cr.build(input, {
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      pending: { f3800: { passive_source_allocations: [allocation] } },
    }),
    "<AllowedCreditsAmt>1000</AllowedCreditsAmt>",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        documentIdsByPendingKey: {},
        pending: { f3800: { passive_source_allocations: [allocation] } },
      }),
    Error,
    "needs one attached Form 3800",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
        pending: {
          f3800: {
            passive_source_allocations: [{
              ...allocation,
              source_document_reference: "Unfiled credit statement",
            }],
          },
        },
      }),
    Error,
    "differs from filed Form 3800",
  );
});

Deno.test("Form 8582-CR passive orphan-drug credit matches the current K-1", () => {
  const source = {
    ...otherCredit,
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Clinical partnership",
      ein: "123456789",
    },
  };
  const input = {
    credit_sources: [source],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  };
  const allocation = calculateForm8582CR(inputSchema.parse(input))
    .sourceAllocations[0];
  const context = {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    pending: {
      f3800: { passive_source_allocations: [allocation] },
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Clinical partnership",
          partnership_ein: "123456789",
          source_document_reference: source.source_document_reference,
          box15_code_z_orphan_drug_credit: 1_500,
          orphan_drug_credit_subject_to_passive_activity_limit: true,
        }],
      },
    },
  };
  assertStringIncludes(
    form8582cr.build(input, context),
    "<AllowedCreditsAmt>1000</AllowedCreditsAmt>",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        ...context,
        pending: { f3800: context.pending.f3800 },
      }),
    Error,
    "does not reconcile to K-1 box 15 code Z",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        ...context,
        pending: {
          ...context.pending,
          k1_partnership: {
            k1_partnerships: [{
              ...context.pending.k1_partnership.k1_partnerships[0],
              box15_code_z_orphan_drug_credit: 1_499,
            }],
          },
        },
      }),
    Error,
    "does not reconcile to K-1 box 15 code Z",
  );
});

Deno.test("Form 8582-CR passive New Markets Credit matches the K-1 code ZZ statement", () => {
  const source = {
    ...otherCredit,
    source_form: "Form 8874",
    form3800_credit_line: "1i" as const,
    source_origin: {
      kind: PassiveCreditSourceOrigin.Trust,
      entity_reference: "Community trust",
      ein: "123456789",
    },
    source_document_reference: "2025 trust K-1",
    source_statement_reference: "New Markets statement",
  };
  const input = {
    credit_sources: [source],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  };
  const allocation = calculateForm8582CR(inputSchema.parse(input))
    .sourceAllocations[0];
  const context = {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    pending: {
      f3800: { passive_source_allocations: [allocation] },
      k1_trust: {
        k1_trusts: [{
          estate_trust_name: "Community trust",
          entity_type: "trust" as const,
          estate_trust_ein: "123456789",
          source_document_reference: "2025 trust K-1",
          box13_code_zz_new_markets_statement_reference:
            "New Markets statement",
          box13_code_zz_new_markets_credit: 1_500,
          new_markets_credit_subject_to_passive_activity_limit: true,
        }],
      },
    },
  };
  assertStringIncludes(
    form8582cr.build(input, context),
    "<AllowedCreditsAmt>1000</AllowedCreditsAmt>",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        ...context,
        pending: {
          ...context.pending,
          k1_trust: {
            k1_trusts: [{
              ...context.pending.k1_trust.k1_trusts[0],
              box13_code_zz_new_markets_statement_reference: "Other statement",
            }],
          },
        },
      }),
    Error,
    "does not reconcile to trust K-1 code ZZ statement",
  );
});

Deno.test("Form 8582-CR estate orphan-drug credit matches K-1 code M", () => {
  const source = {
    ...otherCredit,
    source_origin: {
      kind: PassiveCreditSourceOrigin.Estate,
      entity_reference: "Clinical estate",
      ein: "123456789",
    },
    source_document_reference: "2025 Estate K-1",
  };
  const input = {
    credit_sources: [source],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
  };
  const allocation = calculateForm8582CR(inputSchema.parse(input))
    .sourceAllocations[0];
  const context = {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    pending: {
      f3800: { passive_source_allocations: [allocation] },
      k1_trust: {
        k1_trusts: [{
          estate_trust_name: "Clinical estate",
          entity_type: "estate",
          estate_trust_ein: "123456789",
          source_document_reference: "2025 Estate K-1",
          box13_code_m_orphan_drug_credit: 1_500,
          orphan_drug_credit_subject_to_passive_activity_limit: true,
        }],
      },
    },
  };
  assertStringIncludes(
    form8582cr.build(input, context),
    "<AllowedCreditsAmt>1000</AllowedCreditsAmt>",
  );
  assertThrows(
    () =>
      form8582cr.build(input, {
        ...context,
        pending: {
          ...context.pending,
          k1_trust: {
            k1_trusts: [{
              ...context.pending.k1_trust.k1_trusts[0],
              box13_code_m_orphan_drug_credit: 1_499,
            }],
          },
        },
      }),
    Error,
    "does not reconcile to K-1 box 13 code M",
  );
});

Deno.test("Form 8582-CR passive disabled-access credit matches K-1 source evidence", () => {
  for (
    const entry of [
      {
        kind: PassiveCreditSourceOrigin.Partnership,
        pendingKey: "k1_partnership" as const,
        item: {
          partnership_name: "Access partnership",
          partnership_ein: "123456789",
          source_document_reference: "2025 access K-1",
          box15_code_k_disabled_access_credit: 1_500.25,
          disabled_access_credit_subject_to_passive_activity_limit: true,
        },
      },
      {
        kind: PassiveCreditSourceOrigin.SCorporation,
        pendingKey: "k1_s_corp" as const,
        item: {
          corporation_name: "Access S corporation",
          corporation_ein: "123456789",
          source_document_reference: "2025 access K-1",
          box13_code_k_disabled_access_credit: 1_500.25,
          disabled_access_credit_subject_to_passive_activity_limit: true,
        },
      },
      {
        kind: PassiveCreditSourceOrigin.Trust,
        pendingKey: "k1_trust" as const,
        item: {
          estate_trust_name: "Access trust",
          entity_type: "trust",
          estate_trust_ein: "123456789",
          source_document_reference: "2025 Trust K-1",
          box13_code_zz_disabled_access_credit: 1_500.25,
          box13_code_zz_disabled_access_statement_reference:
            "2025 access statement",
          disabled_access_credit_subject_to_passive_activity_limit: true,
        },
      },
      {
        kind: PassiveCreditSourceOrigin.Estate,
        pendingKey: "k1_trust" as const,
        item: {
          estate_trust_name: "Access estate",
          entity_type: "estate",
          estate_trust_ein: "123456789",
          source_document_reference: "2025 Estate K-1",
          box13_code_zz_disabled_access_credit: 1_500.25,
          box13_code_zz_disabled_access_statement_reference:
            "2025 access statement",
          disabled_access_credit_subject_to_passive_activity_limit: true,
        },
      },
    ]
  ) {
    const source = {
      ...otherCredit,
      source_form: "Form 8826",
      form3800_credit_line: "1e",
      source_document_reference: entry.kind === PassiveCreditSourceOrigin.Trust
        ? "2025 Trust K-1"
        : entry.kind === PassiveCreditSourceOrigin.Estate
        ? "2025 Estate K-1"
        : "2025 access K-1",
      ...(entry.kind === PassiveCreditSourceOrigin.Trust ||
          entry.kind === PassiveCreditSourceOrigin.Estate
        ? { source_statement_reference: "2025 access statement" }
        : {}),
      source_origin: {
        kind: entry.kind,
        entity_reference: "Access entity",
        ein: "123456789",
      },
    };
    const input = {
      credit_sources: [source],
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 9_000,
    };
    const allocation = calculateForm8582CR(inputSchema.parse(input))
      .sourceAllocations[0];
    const pending = {
      f3800: { passive_source_allocations: [allocation] },
      [entry.pendingKey]: {
        [
          entry.pendingKey === "k1_partnership"
            ? "k1_partnerships"
            : entry.pendingKey === "k1_s_corp"
            ? "k1_s_corps"
            : "k1_trusts"
        ]: [entry.item],
      },
    };
    const context = {
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      pending,
    };
    assertStringIncludes(
      form8582cr.build(input, context),
      "<AllowedCreditsAmt>1000</AllowedCreditsAmt>",
    );
    if (
      entry.kind === PassiveCreditSourceOrigin.Trust ||
      entry.kind === PassiveCreditSourceOrigin.Estate
    ) {
      assertThrows(
        () =>
          form8582cr.build(input, {
            ...context,
            pending: {
              ...pending,
              k1_trust: {
                k1_trusts: [{
                  ...entry.item,
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
          form8582cr.build(input, {
            ...context,
            pending: {
              ...pending,
              k1_trust: {
                k1_trusts: [{
                  ...entry.item,
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
    assertThrows(
      () =>
        form8582cr.build(input, {
          ...context,
          pending: { f3800: pending.f3800 },
        }),
      Error,
      entry.kind === PassiveCreditSourceOrigin.Partnership
        ? "K-1 box 15 code K"
        : entry.kind === PassiveCreditSourceOrigin.SCorporation
        ? "K-1 box 13 code K"
        : "K-1 box 13 code ZZ statement",
    );
  }
});

Deno.test("Form 8582-CR reconciles one K-1 credit split across two activities", () => {
  for (
    const credit of [
      {
        sourceForm: "Form 8820",
        line: "1h",
        amount: 1_000,
        k1Field: "box15_code_z_orphan_drug_credit",
      },
      {
        sourceForm: "Form 8826",
        line: "1e",
        amount: 1_000.25,
        k1Field: "box15_code_k_disabled_access_credit",
      },
    ] as const
  ) {
    const creditSources = [250, 750].map((amount, index) => ({
      activity_reference: `Clinical activity ${index + 1}`,
      source_form: credit.sourceForm,
      source_document_reference: "2025 clinical K-1",
      source_origin: {
        kind: PassiveCreditSourceOrigin.Partnership,
        entity_reference: "Clinical partnership",
        ein: "123456789",
      },
      category: PassiveCreditCategory.Other,
      reporting_route: PassiveCreditReportingRoute.Form3800Line3,
      form3800_credit_line: credit.line,
      current_year_credit: amount,
      prior_unallowed_credits: [],
      publicly_traded_partnership: false,
    }));
    const input = {
      credit_sources: creditSources,
      regular_tax_all_income: 10_000,
      regular_tax_without_passive: 9_000,
    };
    const allocations = calculateForm8582CR(inputSchema.parse(input))
      .sourceAllocations;
    const xml = form8582cr.build(input, {
      pending: {
        f3800: { passive_source_allocations: allocations },
        k1_partnership: {
          k1_partnerships: [{
            partnership_name: "Clinical partnership",
            partnership_ein: "123456789",
            source_document_reference: "2025 clinical K-1",
            [credit.k1Field]: credit.amount,
            ...(credit.sourceForm === "Form 8820"
              ? { orphan_drug_credit_subject_to_passive_activity_limit: true }
              : {
                disabled_access_credit_subject_to_passive_activity_limit: true,
              }),
          }],
        },
      },
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
    });
    assertStringIncludes(xml, "<AllowedCreditsAmt>1000</AllowedCreditsAmt>");
  }
});

Deno.test("Form 8582-CR: active rental Part II serializes the tax limitation", () => {
  const xml = form8582cr.build({
    credit_sources: [rentalCredit],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    filing_status: "single",
    modified_agi: 120_000,
    form8582_line9_special_allowance_used: 5_000,
    part_ii_tax_on_income_less_line14: 9_000,
  });
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAmt>3000</CurrentYearCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalArcherMSADistributionAmt>150000</TotalArcherMSADistributionAmt>",
  );
  assertStringIncludes(xml, "<ModifiedAGIAmt>120000</ModifiedAGIAmt>");
  assertStringIncludes(xml, "<NetAGIAmt>30000</NetAGIAmt>");
  assertStringIncludes(xml, "<PercentNetAGIAmt>15000</PercentNetAGIAmt>");
  assertStringIncludes(
    xml,
    "<AllowedRentalRealtyLossAmt>5000</AllowedRentalRealtyLossAmt>",
  );
  assertStringIncludes(xml, "<TaxableAmt>10000</TaxableAmt>");
  assertStringIncludes(xml, "<AttributableTaxAmt>1000</AttributableTaxAmt>");
  assertStringIncludes(xml, "<SmallestTaxAmt>1000</SmallestTaxAmt>");
  assertStringIncludes(xml, "<AllowedCreditsAmt>1000</AllowedCreditsAmt>");
});

Deno.test("Form 8582-CR: MFS lived-with rental credit appears in other credits", () => {
  const xml = form8582cr.build({
    credit_sources: [rentalCredit],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 9_000,
    filing_status: "mfs",
    mfs_lived_apart_all_year: false,
  });
  assertStringIncludes(xml, "<AllPassiveCreditGrp>");
  assertStringIncludes(xml, "<OtherCurrentYearAmt>3000</OtherCurrentYearAmt>");
  assertEquals(xml.includes("<RentalCreditGrp>"), false);
  assertEquals(xml.includes("<SpecialAllowActiveGrp>"), false);
});

Deno.test("Form 8582-CR: Part III and IV serialize separate tax limits", () => {
  const xml = form8582cr.build({
    credit_sources: [{
      ...otherCredit,
      category: PassiveCreditCategory.RehabilitationOrPre1990Housing,
      source_document_reference: "2025 rehabilitation credit statement",
    }, {
      ...otherCredit,
      category: PassiveCreditCategory.LowIncomeHousing,
      source_document_reference: "2025 low-income housing credit statement",
    }],
    regular_tax_all_income: 10_000,
    regular_tax_without_passive: 10_000,
    modified_agi: 180_000,
    form8582_line9_special_allowance_used: 0,
    part_iii_tax_on_income_less_line26: 8_500,
    part_iv_tax_on_income_less_remaining_allowance: 7_000,
    filing_status: "single",
  });
  assertStringIncludes(xml, "<RehabilitationCreditGrp>");
  assertStringIncludes(xml, "<LowIncomeCreditGrp>");
  assertStringIncludes(xml, "<SpecialAllowRehabGrp>");
  assertStringIncludes(xml, "<SmallestRehabTaxAmt>1500</SmallestRehabTaxAmt>");
  assertStringIncludes(xml, "<SpecialAllowLowIncomeGrp>");
  assertStringIncludes(xml, "<TaxAmt>1500</TaxAmt>");
  assertStringIncludes(xml, "<AllowedCreditsAmt>3000</AllowedCreditsAmt>");
});

Deno.test("Form 8582-CR: missing worksheet tax stops XML generation", () => {
  assertThrows(
    () =>
      form8582cr.build({
        credit_sources: [{
          ...otherCredit,
          category: PassiveCreditCategory.LowIncomeHousing,
        }],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 10_000,
        modified_agi: 180_000,
        form8582_line9_special_allowance_used: 0,
        filing_status: "single",
      }),
    Error,
    "line 35 needs tax",
  );
});

Deno.test("Form 8582-CR: Form 8834 credit does not export without its filing route", () => {
  assertThrows(
    () =>
      form8582cr.build({
        credit_sources: [{
          ...otherCredit,
          source_form: "Form 8834",
          source_origin: { kind: PassiveCreditSourceOrigin.Self },
          reporting_route: PassiveCreditReportingRoute.Form8834,
          form3800_credit_line: undefined,
        }],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 8_000,
      }),
    Error,
    "separate filing route",
  );
});
