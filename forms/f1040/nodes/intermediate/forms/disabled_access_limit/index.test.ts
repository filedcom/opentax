import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { disabledAccessLimit } from "./index.ts";
import {
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "../form8582cr/index.ts";

const passiveSource = {
  activity_reference: "Access partnership activity",
  source_form: "Form 8826",
  source_document_reference: "2025 access partnership K-1",
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
};

const input = {
  credit_sources: [passiveSource],
  required_disabled_access_k1_credits: [{
    source_type: "partnership",
    source_ein: "123456789",
    source_document_reference: "2025 access partnership K-1",
    credit_amount: 3_000,
  }],
  regular_tax_all_income: 0,
  regular_tax_without_passive: 0,
  f8826_credit_entries: [{
    source_type: "s_corporation",
    source_ein: "987654321",
    source_document_reference: "2025 access S corporation K-1",
    credit_amount: 4_000,
    subject_to_passive_activity_limit: false,
  }],
};

Deno.test("disabled-access node caps mixed current-year sources before Form 8582-CR", () => {
  const result = disabledAccessLimit.compute(
    { taxYear: 2025, formType: "f1040" },
    disabledAccessLimit.inputSchema.parse(input),
  );
  const passive = result.outputs.find((item) => item.nodeType === "form8582cr")
    ?.fields;
  const nonpassive = result.outputs.find((item) => item.nodeType === "f3800")
    ?.fields;
  assertEquals(
    (passive?.credit_sources as Array<{ current_year_credit: number }>)[0]
      .current_year_credit,
    2_143,
  );
  assertEquals(
    (nonpassive?.f8826_credit_entries as Array<{ credit_amount: number }>)[0]
      .credit_amount,
    2_857,
  );
  assertEquals(passive?.required_disabled_access_k1_credits, undefined);
});

Deno.test("disabled-access node retains the passive K-1 gross-source check", () => {
  assertThrows(() =>
    disabledAccessLimit.compute(
      { taxYear: 2025, formType: "f1040" },
      disabledAccessLimit.inputSchema.parse({
        ...input,
        required_disabled_access_k1_credits: [{
          ...input.required_disabled_access_k1_credits[0],
          credit_amount: 2_999,
        }],
      }),
    )
  );
  assertThrows(() =>
    disabledAccessLimit.compute(
      { taxYear: 2025, formType: "f1040" },
      disabledAccessLimit.inputSchema.parse({
        required_disabled_access_k1_credits:
          input.required_disabled_access_k1_credits,
      }),
    )
  );
});

Deno.test("mixed K-1 disabled-access amounts pass through one upstream cap in the return graph", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111223333",
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
      credit_sources: [passiveSource],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.disabled_access_limit.f8826_credit_entries as Array<{
      credit_amount: number;
    }>)[0].credit_amount,
    4_000,
  );
  assertEquals(
    (result.pending.form8582cr.credit_sources as Array<{
      current_year_credit: number;
    }>)[0].current_year_credit,
    2_143,
  );
  assertEquals(
    (result.pending.f3800.f8826_credit_entries as Array<{
      credit_amount: number;
    }>)[0].credit_amount,
    2_857,
  );
  assertEquals(
    result.diagnostics.some((item) =>
      item.nodeType === "disabled_access_limit" ||
      item.nodeType === "form8582cr"
    ),
    false,
  );
});

Deno.test("passive self-earned Form 8826 and nonpassive K-1 share the upstream cap", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111223333",
    },
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
        reporting_route: PassiveCreditReportingRoute.Form3800Line3,
        form3800_credit_line: "1e",
        current_year_credit: 3_000,
        prior_unallowed_credits: [],
        publicly_traded_partnership: false,
      }],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.form8582cr.credit_sources as Array<{
      current_year_credit: number;
    }>)[0].current_year_credit,
    2_143,
  );
  assertEquals(
    (result.pending.f3800.f8826_credit_entries as Array<{
      credit_amount: number;
    }>)[0].credit_amount,
    2_857,
  );
});

Deno.test("passive self-earned Form 8826 needs matching Form 8582-CR activity facts", () => {
  assertThrows(() =>
    disabledAccessLimit.compute(
      { taxYear: 2025, formType: "f1040" },
      disabledAccessLimit.inputSchema.parse({
        required_disabled_access_self_credit: {
          source_document_reference: "2025 self-earned Form 8826",
          credit_amount: 3_000,
        },
      }),
    )
  );
  assertThrows(() =>
    disabledAccessLimit.compute(
      { taxYear: 2025, formType: "f1040" },
      disabledAccessLimit.inputSchema.parse({
        required_disabled_access_self_credit: {
          source_document_reference: "2025 self-earned Form 8826",
          credit_amount: 3_000,
        },
        credit_sources: [{
          ...passiveSource,
          source_origin: { kind: PassiveCreditSourceOrigin.Self },
          source_document_reference: "2025 self-earned Form 8826",
          current_year_credit: 2_999,
        }],
        regular_tax_all_income: 0,
        regular_tax_without_passive: 0,
      }),
    )
  );
});

Deno.test("passive Form 8826 pass-through marker shares the cap without duplicating its K-1", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111223333",
    },
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
      credit_sources: [passiveSource],
      regular_tax_all_income: 0,
      regular_tax_without_passive: 0,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(
    (result.pending.disabled_access_limit
      .required_form8826_pass_through_credits as Array<{
        credit_amount: number;
      }>)[0].credit_amount,
    3_000,
  );
  assertEquals(
    (result.pending.form8582cr.credit_sources as Array<{
      current_year_credit: number;
    }>)[0].current_year_credit,
    2_143,
  );
  assertEquals(
    (result.pending.f3800.f8826_credit_entries as Array<{
      credit_amount: number;
    }>)[0].credit_amount,
    2_857,
  );
});

Deno.test("passive Form 8826 pass-through amount must match its activity rows", () => {
  assertThrows(() =>
    disabledAccessLimit.compute(
      { taxYear: 2025, formType: "f1040" },
      disabledAccessLimit.inputSchema.parse({
        ...input,
        required_form8826_pass_through_credits: [{
          source_type: "partnership",
          source_ein: "123456789",
          source_document_reference: "2025 access partnership K-1",
          credit_amount: 2_999,
        }],
      }),
    )
  );
});
