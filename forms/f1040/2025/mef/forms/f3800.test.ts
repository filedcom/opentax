import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
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

Deno.test("Form 3800 descriptor stays empty without credit and rejects legacy gross credit", () => {
  assertEquals(form3800.build({}), "");
  assertEquals(form3800.build({ f3800s: [{}] }), "");
  assertThrows(
    () => form3800.build({ f3800s: [{ research_credit: 500 }] }),
    Error,
    "legacy credit cannot be exported",
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
    pending: { f8826: selfEarned, schedule3: { line6a_total: 5_000 } },
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
          f8826: { ...selfEarned, eligible_expenditures: 5_000 },
          schedule3: { line6a_total: 5_000 },
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
    pending: { f8826: source, schedule3: { line6a_total: 1_250 } },
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
    pending: { f8826: source, schedule3: { line6a_total: 3_000 } },
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
