import { assertEquals, assertThrows } from "@std/assert";
import { TargetGroup } from "../../../nodes/inputs/f5884/index.ts";
import { form5884Pdf } from "./f5884.ts";

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
    first_year_wages: 6_000,
    hours_worked: 400,
  }],
};

Deno.test("Form 5884 PDF maps the official wage and credit widgets", () => {
  const names = Object.fromEntries(
    form5884Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.line1aWages, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(names.line1aCredit, "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(names.line1bWages, "topmostSubform[0].Page1[0].f1_5[0]");
  assertEquals(names.line1bCredit, "topmostSubform[0].Page1[0].f1_6[0]");
  assertEquals(names.line1cWages, "topmostSubform[0].Page1[0].f1_7[0]");
  assertEquals(names.line1cCredit, "topmostSubform[0].Page1[0].f1_8[0]");
  assertEquals(names.line2, "topmostSubform[0].Page1[0].f1_9[0]");
  assertEquals(names.line3, "topmostSubform[0].Page1[0].f1_10[0]");
  assertEquals(names.line4, "topmostSubform[0].Page1[0].f1_11[0]");
});

Deno.test("Form 5884 PDF omits pass-through-only credit and prints mixed line 3", () => {
  const passThrough = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 K-1 box 15 code J",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  assertEquals(
    form5884Pdf.includeWhen?.({
      subject_to_passive_activity_limit: false,
      f5884s: [],
      pass_through_credits: [passThrough],
    }),
    false,
  );
  const mixed = {
    ...source,
    pass_through_credits: [passThrough],
  };
  const projected = form5884Pdf.projectFields?.(mixed, {
    f3800: { f5884_credit: { credit_amount: 3_650 } },
  }) ?? {};
  assertEquals(projected.line2, 2_400);
  assertEquals(projected.line3, 1_250);
  assertEquals(projected.line4, 3_650);
});

Deno.test("Form 5884 PDF projects source credit and requires Form 3800 reconciliation", () => {
  const pending = {
    f3800: {
      f5884_credit: {
        credit_amount: 2_400,
        subject_to_passive_activity_limit: false,
      },
    },
  };
  assertEquals(form5884Pdf.includeWhen?.(source), true);
  const projected = form5884Pdf.projectFields?.(source, pending) ?? {};
  assertEquals(projected.line1bWages, 6_000);
  assertEquals(projected.line1bCredit, 2_400);
  assertEquals(projected.line2, 2_400);
  assertEquals(projected.line4, 2_400);
  assertThrows(
    () =>
      form5884Pdf.projectFields?.(source, {
        f3800: {
          f5884_credit: {
            credit_amount: 2_399,
            subject_to_passive_activity_limit: false,
          },
        },
      }),
    Error,
    "does not reconcile",
  );
});
