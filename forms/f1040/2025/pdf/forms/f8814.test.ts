import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { calculateForm8814 } from "../../../nodes/inputs/f8814/index.ts";
import {
  form8814DottedNotes,
  form8814ParentPrintAmounts,
  form8814Pdf,
} from "./f8814.ts";
import { schedule1Pdf } from "./schedule1.ts";
import { irs1040Pdf } from "./f1040.ts";
import { scheduleDPdf } from "./schedule_d.ts";
import { scheduleBForm8814DottedLines } from "./schedule_b.ts";

const election = {
  child_name: "Alex Rivera",
  child_name_control: "RIVE",
  child_ssn: "987654321",
  child_age_eligible: true as const,
  child_required_to_file: true as const,
  child_income_only_permitted_types: true as const,
  child_no_joint_return: true as const,
  child_no_estimated_payments: true as const,
  child_no_withholding: true as const,
  parent_eligible_to_elect: true as const,
  interest_income: 3700,
};

Deno.test("Form 8814 PDF expands one copy for each elected child", () => {
  const first = calculateForm8814(election);
  const second = calculateForm8814({ ...election, child_ssn: "111223333" });
  const instances = form8814Pdf.instances?.({ items: [first, second] }) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances[0].line12, 1000);
  assertEquals(instances[0].line15, 135);
  assertEquals(instances[0].multiple_forms, true);
});

Deno.test("Schedule 1 PDF prints Form 8814 on line 8z amount field", () => {
  const instances = schedule1Pdf.instances?.({ line8z_form8814: 1000 }) ?? [];
  assertEquals(instances[0].line8z_description, "Form 8814");
  assertEquals(instances[0].line8z_other, 1000);
  const amount = schedule1Pdf.fields.find((field) =>
    field.domainKey === "line8z_other"
  );
  assertEquals(amount?.pdfField, "topmostSubform[0].Page1[0].f1_36[0]");
});

Deno.test("Form 8814 PDF prints child nominee amounts beside lines 1a, 2a, and 3", () => {
  const line = calculateForm8814({
    ...election,
    interest_adjustments: { nominee_distribution: 120 },
    dividend_nominee_distribution: 90,
    capital_gain_nominee_distribution: 75,
  });
  const instance = form8814Pdf.instances?.({ items: [line] })[0] ?? {};
  assertEquals(form8814DottedNotes(instance), {
    interest: "ND $120",
    interestAttachment: [],
    dividends: "ND $90",
    capitalGains: "ND $75",
  });
});

Deno.test("Form 8814 PDF adds a child-specific line 1a continuation when adjustments do not fit", async () => {
  const line = calculateForm8814({
    ...election,
    interest_adjustments: {
      nominee_distribution: 120,
      accrued_interest: 30,
      abp_adjustment: 15,
      oid_adjustment: 5,
    },
  });
  const instance = form8814Pdf.instances?.({ items: [line] })[0] ?? {};
  assertEquals(form8814DottedNotes(instance), {
    interest: "See attached interest adjustments",
    interestAttachment: [
      "ND $120",
      "Accrued interest $30",
      "ABP adjustment $15",
      "OID adjustment $5",
    ],
    dividends: undefined,
    capitalGains: undefined,
  });
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await form8814Pdf.appendSupplementalPages?.(document, instance, undefined);
  assertEquals(document.getPageCount(), 2);
});

Deno.test("Form 8814 PDF follows the 2025 skip rule for lines 7 through 10", () => {
  const noPreferred = form8814Pdf.instances?.({
    items: [calculateForm8814(election)],
  })[0] ?? {};
  assertEquals(noPreferred.line7_fraction, undefined);
  assertEquals(noPreferred.line8_fraction, undefined);
  assertEquals(noPreferred.line9, undefined);
  assertEquals(noPreferred.line10, undefined);
  assertEquals(noPreferred.line11, "-0-");

  const onePreferred = form8814Pdf.instances?.({
    items: [calculateForm8814({
      ...election,
      dividend_income: 300,
      qualified_dividends: 300,
    })],
  })[0] ?? {};
  assertEquals(onePreferred.line8_fraction, "00000");
  assertEquals(onePreferred.line10, 0);
  assertEquals(
    form8814Pdf.fields.find((field) => field.domainKey === "line10"),
    {
      kind: "text",
      domainKey: "line10",
      pdfField: "topmostSubform[0].Page1[0].f1_18[0]",
      printZero: true,
    },
  );
});

Deno.test("2025 parent PDF marks Form 8814 dividends and direct child gain", () => {
  const child = calculateForm8814({
    ...election,
    dividend_income: 300,
    qualified_dividends: 300,
    capital_gain_distributions: 500,
  });
  const pending = { form8814: { items: [child] } };
  assertEquals(form8814ParentPrintAmounts(pending), {
    dividends: 120,
    capitalGain: 200,
  });
  const direct = irs1040Pdf.projectFields?.(
    { line7a_cap_gain_distrib: 200 },
    pending,
  ) ?? {};
  assertEquals(direct.print_form8814_line3a_included, true);
  assertEquals(direct.print_form8814_line3b_included, true);
  assertEquals(direct.print_form8814_line7a_included, true);
  assertEquals(direct.print_form8814_line7a_note, "Form 8814 $200");
  assertEquals(
    irs1040Pdf.fields.find((field) =>
      field.domainKey === "print_form8814_line3a_included"
    )?.pdfField,
    "topmostSubform[0].Page1[0].c1_33[0]",
  );
  assertEquals(
    irs1040Pdf.fields.find((field) =>
      field.domainKey === "print_form8814_line3b_included"
    )?.pdfField,
    "topmostSubform[0].Page1[0].c1_34[0]",
  );
  assertEquals(
    irs1040Pdf.fields.find((field) =>
      field.domainKey === "print_form8814_line7a_included"
    )?.pdfField,
    "topmostSubform[0].Page1[0].c1_44[0]",
  );
  assertEquals(
    irs1040Pdf.fields.find((field) =>
      field.domainKey === "line7a_cap_gain_distrib" &&
      field.kind === "checkbox"
    )?.pdfField,
    "topmostSubform[0].Page1[0].c1_43[0]",
  );
  assertEquals(
    irs1040Pdf.fields.find((field) => field.domainKey === "form8814_tax")
      ?.pdfField,
    "topmostSubform[0].Page2[0].c2_9[0]",
  );

  const withScheduleD = irs1040Pdf.projectFields?.(
    { line7_capital_gain: 200 },
    pending,
  ) ?? {};
  assertEquals(withScheduleD.print_form8814_line7a_note, undefined);
  assertEquals(withScheduleD.print_form8814_line7a_included, true);
  const scheduleD = scheduleDPdf.projectFields?.(
    { print_line13_cap_gain_distrib: 200 },
    pending,
  ) ?? {};
  assertEquals(scheduleD.print_form8814_line13_note, "Form 8814 $200");
});

Deno.test("Schedule B marks only the child foreign-account and trust lines", () => {
  assertEquals(scheduleBForm8814DottedLines({}), []);
  assertEquals(
    scheduleBForm8814DottedLines({ form8814_foreign_account: true }),
    ["7a"],
  );
  assertEquals(
    scheduleBForm8814DottedLines({ form8814_foreign_trust: true }),
    ["8"],
  );
  assertEquals(
    scheduleBForm8814DottedLines({
      form8814_foreign_account: true,
      form8814_foreign_trust: true,
    }),
    ["7a", "8"],
  );
});
