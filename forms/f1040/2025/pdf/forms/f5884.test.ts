import { assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
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

Deno.test("Form 5884 PDF prints controlled-group share and appends its calculation", async () => {
  const groupSource = {
    ...source,
    controlled_group: {
      kind: "controlled_corporations" as const,
      group_classification_document_reference: "2025 group ownership schedule",
      taxpayer_member_ein: "123456789",
      members: [
        { ein: "123456789", business_name: "Taxpayer Company" },
        { ein: "987654321", business_name: "Affiliate Company" },
      ],
    },
    f5884s: [
      {
        ...source.f5884s[0],
        employee_reference: "GROUP-1",
        employer_ein: "123456789",
        hours_worked: 200,
      },
      {
        ...source.f5884s[0],
        employee_reference: "GROUP-2",
        employer_ein: "987654321",
        wage_records: [{
          ...source.f5884s[0].wage_records[0],
          deduction_location: { kind: "entity_return" },
        }],
        hours_worked: 400,
      },
    ],
  };
  const projected = form5884Pdf.projectFields?.(groupSource, {
    f3800: { f5884_credit: { credit_amount: 1_950 } },
  }) ?? {};
  assertEquals(projected.line1aCredit, 1_500);
  assertEquals(projected.line1bCredit, 2_400);
  assertEquals(projected.line2, 1_950);
  assertEquals(projected.line4, 1_950);
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  await form5884Pdf.decoratePages?.(document, [page], projected, undefined);
  await form5884Pdf.appendSupplementalPages?.(document, projected, undefined);
  assertEquals(document.getPageCount(), 2);
  const manyMembers = {
    ...projected,
    controlled_group: {
      ...groupSource.controlled_group,
      members: [
        ...groupSource.controlled_group.members,
        ...Array.from({ length: 23 }, (_, index) => ({
          ein: String(100_000_000 + index),
          business_name: `Additional Group Member ${index + 1}`,
        })),
      ],
    },
  };
  const paginated = await PDFDocument.create();
  await form5884Pdf.appendSupplementalPages?.(
    paginated,
    manyMembers,
    undefined,
  );
  assertEquals(paginated.getPageCount(), 2);
});
