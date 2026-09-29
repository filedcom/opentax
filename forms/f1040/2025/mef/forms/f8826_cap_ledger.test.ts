import { assertEquals, assertThrows } from "@std/assert";
import { disabledAccessLimit } from "../../../nodes/intermediate/forms/disabled_access_limit/index.ts";
import {
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { readDisabledAccessCapLedger } from "./f8826_cap_ledger.ts";

const raw = {
  credit_sources: [{
    activity_reference: "Access partnership activity",
    source_form: "Form 8826",
    source_document_reference: "2025 passive access K-1",
    source_origin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: "Access partnership",
      ein: "123456789",
    },
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1e",
    current_year_credit: 3_000,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  }],
  required_disabled_access_k1_credits: [{
    source_type: "partnership",
    source_ein: "123456789",
    source_document_reference: "2025 passive access K-1",
    credit_amount: 3_000,
  }],
  regular_tax_all_income: 0,
  regular_tax_without_passive: 0,
  f8826_credit_entries: [{
    source_type: "s_corporation",
    source_ein: "987654321",
    source_document_reference: "2025 nonpassive access K-1",
    credit_amount: 4_000,
    subject_to_passive_activity_limit: false,
  }],
};

Deno.test("MeF disabled-access ledger preserves gross K-1 amounts while checking capped rows", () => {
  const calculated = disabledAccessLimit.compute(
    { taxYear: 2025, formType: "f1040" },
    disabledAccessLimit.inputSchema.parse(raw),
  );
  const passive = calculated.outputs.find((item) =>
    item.nodeType === "form8582cr"
  )?.fields;
  const nonpassive = calculated.outputs.find((item) =>
    item.nodeType === "f3800"
  )?.fields;
  const pending = {
    disabled_access_limit: raw,
    form8582cr: passive,
    f3800: nonpassive,
    k1_s_corp: {
      k1_s_corps: [{
        corporation_name: "Access S corporation",
        corporation_ein: "987654321",
        source_document_reference: "2025 nonpassive access K-1",
        box13_code_k_disabled_access_credit: 4_000,
        disabled_access_credit_subject_to_passive_activity_limit: false,
      }],
    },
  };
  const ledger = readDisabledAccessCapLedger({ pending });
  assertEquals(ledger?.rawPassiveSources[0].current_year_credit, 3_000);
  assertEquals(ledger?.cappedPassiveSources[0].current_year_credit, 2_143);
  assertEquals(ledger?.rawEntries[0].credit_amount, 4_000);
  assertEquals(ledger?.cappedEntries[0].credit_amount, 2_857);
  const capped = ledger?.cappedEntries[0];
  if (!capped) throw new Error("Missing capped nonpassive source");
  assertThrows(() =>
    readDisabledAccessCapLedger({
      pending: {
        ...pending,
        f3800: {
          ...nonpassive,
          f8826_credit_entries: [{
            ...capped,
            credit_amount: 2_858,
          }],
        },
      },
    })
  );
});

Deno.test("MeF disabled-access ledger checks a K-1 even when its cap share rounds to zero", () => {
  const tinySource = {
    credit_sources: [{
      activity_reference: "Self-earned passive access",
      source_form: "Form 8826",
      source_document_reference: "2025 self-earned access credit",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      category: PassiveCreditCategory.Other,
      reporting_route: PassiveCreditReportingRoute.Form3800Line3,
      form3800_credit_line: "1e",
      current_year_credit: 5_000,
      prior_unallowed_credits: [],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
    f8826_credit_entries: [{
      source_type: "s_corporation",
      source_ein: "987654321",
      source_document_reference: "2025 tiny access K-1",
      credit_amount: 0.01,
      subject_to_passive_activity_limit: false,
    }],
  };
  const calculated = disabledAccessLimit.compute(
    { taxYear: 2025, formType: "f1040" },
    disabledAccessLimit.inputSchema.parse(tinySource),
  );
  const pending = {
    disabled_access_limit: tinySource,
    form8582cr: calculated.outputs.find((item) =>
      item.nodeType === "form8582cr"
    )?.fields,
    k1_s_corp: {
      k1_s_corps: [{
        corporation_name: "Access S corporation",
        corporation_ein: "987654321",
        source_document_reference: "2025 tiny access K-1",
        box13_code_k_disabled_access_credit: 0.01,
        disabled_access_credit_subject_to_passive_activity_limit: false,
      }],
    },
  };
  assertEquals(readDisabledAccessCapLedger({ pending })?.cappedEntries, []);
  assertThrows(() =>
    readDisabledAccessCapLedger({
      pending: {
        ...pending,
        k1_s_corp: {
          k1_s_corps: [{
            ...pending.k1_s_corp.k1_s_corps[0],
            box13_code_k_disabled_access_credit: 0.02,
          }],
        },
      },
    })
  );
});

Deno.test("MeF disabled-access ledger ties a passive self-earned source to Form 8826", () => {
  const selfForm = {
    eligible_expenditures: 6_250,
    prior_year_gross_receipts: 500_000,
    prior_year_full_time_employee_count: 20,
    subject_to_passive_activity_limit: true,
    source_document_reference: "2025 self-earned Form 8826",
  };
  const gross = {
    required_disabled_access_self_credit: {
      source_document_reference: "2025 self-earned Form 8826",
      credit_amount: 3_000,
    },
    credit_sources: [{
      activity_reference: "Self-earned passive access",
      source_form: "Form 8826",
      source_document_reference: "2025 self-earned Form 8826",
      source_origin: { kind: PassiveCreditSourceOrigin.Self },
      category: PassiveCreditCategory.Other,
      reporting_route: PassiveCreditReportingRoute.Form3800Line3,
      form3800_credit_line: "1e",
      current_year_credit: 3_000,
      prior_unallowed_credits: [],
      publicly_traded_partnership: false,
    }],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
  };
  const capped = disabledAccessLimit.compute(
    { taxYear: 2025, formType: "f1040" },
    disabledAccessLimit.inputSchema.parse(gross),
  );
  const pending = {
    f8826: selfForm,
    disabled_access_limit: gross,
    form8582cr: capped.outputs.find((item) => item.nodeType === "form8582cr")
      ?.fields,
  };
  assertEquals(
    readDisabledAccessCapLedger({ pending })?.rawPassiveSources[0]
      .current_year_credit,
    3_000,
  );
  assertThrows(() =>
    readDisabledAccessCapLedger({
      pending: {
        ...pending,
        f8826: { ...selfForm, eligible_expenditures: 5_250 },
      },
    })
  );
});

Deno.test("MeF disabled-access ledger ties passive pass-through evidence to Form 8826", () => {
  const form8826 = {
    eligible_expenditures: 0,
    subject_to_passive_activity_limit: false,
    pass_through_credits: [{
      entity_type: "partnership",
      entity_ein: "123456789",
      source_document_reference: "2025 passive access K-1",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: true,
    }],
  };
  const gross = {
    required_form8826_pass_through_credits: [{
      source_type: "partnership",
      source_ein: "123456789",
      source_document_reference: "2025 passive access K-1",
      credit_amount: 3_000,
    }],
    credit_sources: [raw.credit_sources[0]],
    regular_tax_all_income: 0,
    regular_tax_without_passive: 0,
  };
  const capped = disabledAccessLimit.compute(
    { taxYear: 2025, formType: "f1040" },
    disabledAccessLimit.inputSchema.parse(gross),
  );
  const pending = {
    f8826: form8826,
    disabled_access_limit: gross,
    form8582cr: capped.outputs.find((item) => item.nodeType === "form8582cr")
      ?.fields,
  };
  assertEquals(
    readDisabledAccessCapLedger({ pending })?.rawPassiveSources[0]
      .current_year_credit,
    3_000,
  );
  assertThrows(() =>
    readDisabledAccessCapLedger({
      pending: {
        ...pending,
        f8826: {
          ...form8826,
          pass_through_credits: [{
            ...form8826.pass_through_credits[0],
            credit_amount: 2_999,
          }],
        },
      },
    })
  );
});
