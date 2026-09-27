import { assertStringIncludes, assertThrows } from "@std/assert";
import { buildForm8874Document, form8874 } from "./f8874.ts";

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
    qualified_equity_investment_amount: 1_000_000,
    designation_notice_reference: "2023 QEI notice",
    held_on_credit_allowance_date: true,
    qualified_on_credit_allowance_date: true,
    recapture_notice_received: false,
    subject_to_passive_activity_limit: false,
  }],
};

Deno.test("Form 8874 MeF records an identified investment and 5 percent credit", () => {
  const xml = buildForm8874Document(source, 0);
  assertStringIncludes(xml, "<IRS8874>");
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>Community Development Entity</BusinessNameLine1Txt>",
  );
  assertStringIncludes(
    xml,
    "<InitialInvestmentDt>2023-04-15</InitialInvestmentDt>",
  );
  assertStringIncludes(
    xml,
    "<EquityInvestmentAmt>1000000</EquityInvestmentAmt>",
  );
  assertStringIncludes(xml, "<CreditRt>5</CreditRt>");
  assertStringIncludes(xml, "<CreditByRatioAmt>50000</CreditByRatioAmt>");
  assertStringIncludes(xml, "<TotalCreditAmt>50000</TotalCreditAmt>");
});

Deno.test("Form 8874 MeF requires matching linked Form 3800", () => {
  assertThrows(
    () => form8874.build(source, { pending: { f8874: source } }),
    Error,
    "does not reconcile",
  );
  assertThrows(
    () =>
      form8874.build(source, {
        pending: { f3800: { f8874_credit: { credit_amount: 50_000 } } },
        documentIdsByPendingKey: {},
      }),
    Error,
    "needs attached Form 3800",
  );
  const xml = form8874.build(source, {
    pending: { f3800: { f8874_credit: { credit_amount: 50_000 } } },
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(xml, "<CDETotalCreditAmt>50000</CDETotalCreditAmt>");
});

Deno.test("Form 8874 MeF reconciles passive and direct investments separately", () => {
  const passive = {
    ...source.investments[0],
    subject_to_passive_activity_limit: true,
    passive_activity_reference: "Community venture",
    passive_source_document_reference: "2025 community venture QEI",
  };
  const mixed = {
    investments: [passive, {
      ...source.investments[0],
      initial_investment_date: "2022-04-15",
      designation_notice_reference: "2022 QEI notice",
    }],
  };
  const activity = {
    activity_reference: "Community venture",
    source_form: "Form 8874",
    source_origin: { kind: "self" },
    source_document_reference: "2025 community venture QEI",
    category: "other",
    reporting_route: "form3800_line3",
    form3800_credit_line: "1i",
    current_year_credit: 50_000,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  };
  const pending = {
    f3800: { f8874_credit: { credit_amount: 60_000 } },
    form8582cr: {
      credit_sources: [activity],
      regular_tax_all_income: 50_000,
      regular_tax_without_passive: 40_000,
    },
  };
  const context = {
    pending,
    documentIdsByPendingKey: {
      f3800: ["IRS3800_1"],
      form8582cr: ["IRS8582CR_1"],
    },
  };
  assertStringIncludes(
    form8874.build(mixed, context),
    "<TotalCreditAmt>110000</TotalCreditAmt>",
  );
  assertThrows(
    () =>
      form8874.build(mixed, {
        ...context,
        pending: {
          ...pending,
          form8582cr: {
            ...pending.form8582cr,
            credit_sources: [{ ...activity, current_year_credit: 49_999 }],
          },
        },
      }),
    Error,
    "does not reconcile to Form 8582-CR",
  );
  assertThrows(
    () =>
      form8874.build(mixed, {
        ...context,
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "needs attached Form 8582-CR",
  );
});

Deno.test("Form 8874 line 2 includes filed partnership and S-corporation credits", () => {
  const pending = {
    f3800: {
      f8874_credit: {
        credit_amount: 50_000,
        subject_to_passive_activity_limit: false,
      },
      f8874_k1_credit_entries: [{
        source_type: "partnership",
        source_ein: "111111111",
        source_document_reference: "2025 partnership K-1",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }, {
        source_type: "s_corporation",
        source_ein: "222222222",
        source_document_reference: "2025 S corporation K-1",
        credit_amount: 750,
        subject_to_passive_activity_limit: false,
      }],
    },
    k1_partnership: {
      k1_partnerships: [{
        partnership_name: "Community partnership",
        partnership_ein: "111111111",
        source_document_reference: "2025 partnership K-1",
        box15_code_ad_new_markets_credit: 1_250,
        new_markets_credit_subject_to_passive_activity_limit: false,
      }],
    },
    k1_s_corp: {
      k1_s_corps: [{
        corporation_name: "Community corporation",
        corporation_ein: "222222222",
        source_document_reference: "2025 S corporation K-1",
        box13_code_ad_new_markets_credit: 750,
        new_markets_credit_subject_to_passive_activity_limit: false,
      }],
    },
  };
  const context = {
    pending,
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  };
  const xml = form8874.build(source, context);
  assertStringIncludes(xml, "<NewMarketsCreditAmt>2000</NewMarketsCreditAmt>");
  assertStringIncludes(xml, "<TotalCreditAmt>52000</TotalCreditAmt>");
  assertThrows(
    () =>
      form8874.build(source, {
        ...context,
        pending: {
          ...pending,
          f3800: {
            ...pending.f3800,
            f8874_k1_credit_entries: pending.f3800.f8874_k1_credit_entries
              .slice(0, 1),
          },
        },
      }),
    Error,
    "nonpassive K-1 credit differs from Form 3800",
  );
});

Deno.test("Form 8874 line 2 reconciles a passive partnership credit", () => {
  const activity = {
    activity_reference: "Community partnership activity",
    source_form: "Form 8874",
    source_origin: {
      kind: "partnership",
      entity_reference: "Community partnership",
      ein: "111111111",
    },
    source_document_reference: "2025 partnership K-1",
    category: "other",
    reporting_route: "form3800_line3",
    form3800_credit_line: "1i",
    current_year_credit: 1_250,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  };
  const context = {
    pending: {
      f3800: {
        f8874_credit: {
          credit_amount: 50_000,
          subject_to_passive_activity_limit: false,
        },
      },
      form8582cr: {
        credit_sources: [activity],
        regular_tax_all_income: 10_000,
        regular_tax_without_passive: 9_000,
      },
      k1_partnership: {
        k1_partnerships: [{
          partnership_name: "Community partnership",
          partnership_ein: "111111111",
          source_document_reference: "2025 partnership K-1",
          box15_code_ad_new_markets_credit: 1_250,
          new_markets_credit_subject_to_passive_activity_limit: true,
        }],
      },
    },
    documentIdsByPendingKey: {
      f3800: ["IRS3800_1"],
      form8582cr: ["IRS8582CR_1"],
    },
  };
  const xml = form8874.build(source, context);
  assertStringIncludes(xml, "<NewMarketsCreditAmt>1250</NewMarketsCreditAmt>");
  assertStringIncludes(xml, "<TotalCreditAmt>51250</TotalCreditAmt>");
  assertThrows(
    () =>
      form8874.build(source, {
        ...context,
        pending: {
          ...context.pending,
          form8582cr: {
            ...context.pending.form8582cr,
            credit_sources: [{ ...activity, current_year_credit: 1_249 }],
          },
        },
      }),
    Error,
    "passive K-1 credit differs from Form 8582-CR",
  );
  assertThrows(
    () =>
      form8874.build(source, {
        ...context,
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "needs attached Form 8582-CR",
  );
});
