import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { FilingStatus } from "../../../../mef/types.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import { scheduleH } from "../../../../mef/forms/taxes/household-employment/schedule_h.ts";
import { scheduleHPdf } from "../../../../pdf/forms/taxes/household-employment/schedule_h.ts";
import {
  parentRemarriageCareCases,
  parentRemarriageCareInput,
} from "./parent-remarriage-care.fixture.ts";

function pdfContext(pending: ReturnType<typeof buildPending>) {
  return {
    schedule_h: pending.schedule_h ?? {},
    schedule2: pending.schedule2 ?? {},
    f1040: pending.f1040 ?? {},
    w2: { w2s: pending.w2?.w2s },
  };
}

Deno.test("Schedule H remarried spouse care periods and later recovery reach native and PDF filing", async () => {
  for (const c of parentRemarriageCareCases) {
    const inputs = parentRemarriageCareInput(c), held = structuredClone(inputs);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], c.id);
    assertEquals(
      result.pending.schedule2.line9_household_employment,
      c.tax,
      c.id,
    );
    assertEquals(result.pending.f1040.line23_other_taxes, c.tax, c.id);
    assertEquals(result.pending.f1040.line16_income_tax, 4746, c.id);
    assertEquals(result.pending.f1040.line24_total_tax, 4746 + c.tax, c.id);
    assertEquals(
      result.pending.f1040.line35a_refund,
      11000 - 4746 - c.tax,
      c.id,
    );
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertStringIncludes(
      bundle.xml,
      `<SocialSecurityTaxCashWagesAmt>${
        2800 + c.wages
      }</SocialSecurityTaxCashWagesAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<CombinedFUTATaxPlusNetTaxesAmt>${c.tax}</CombinedFUTATaxPlusNetTaxesAmt>`,
    );
    const projected = scheduleHPdf.projectFields!(
      pending.schedule_h!,
      pdfContext(pending),
    );
    assertEquals(projected.line8_fica_and_withholding, c.tax);
    assertEquals(
      scheduleHPdf.instances!(projected, filer, pdfContext(pending)).length,
      1,
    );
    assertEquals(computeScheduleHAmounts(inputs.schedule_h, 2025).futaTax, 0);
    assertEquals(inputs, held);
  }
});

Deno.test("Schedule H remarried spouse care rejects short, cross-quarter, prior-marriage and source conflicts", async () => {
  const inputs = parentRemarriageCareInput(parentRemarriageCareCases[1]);
  const result = f1040_2025.executeReturn(inputs),
    pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  for (
    const variant of [
      "27-days",
      "cross-quarter",
      "before-marriage",
      "missing-medical",
      "reused-marriage-record",
      "later-short",
      "later-wrong-spouse",
      "changed-wages",
    ]
  ) {
    const h = structuredClone(inputs.schedule_h);
    const parent = h.fica_only_payroll!.employee_wages.find((p) =>
      p.relationship === "parent"
    );
    if (
      !parent || parent.relationship !== "parent" ||
      parent.parent_fica_review.classification !== "dated_service_periods"
    ) throw new Error("Expected dated parent");
    const review = parent.parent_fica_review;
    const event = review.quarterly_circumstances[1].employer_circumstances;
    const later = review.quarterly_circumstances[2].employer_circumstances;
    if (
      event.kind !== "remarried_spouse_incapable" ||
      later.kind !== "spouse_incapable"
    ) throw new Error("Expected medical sources");
    if (variant === "27-days") event.incapable_care_period.to = "2025-06-10";
    if (variant === "cross-quarter") {
      event.incapable_care_period = {
        ...event.incapable_care_period,
        from: "2025-06-15",
        to: "2025-07-12",
      };
    }
    if (variant === "before-marriage") {
      event.incapable_care_period = {
        ...event.incapable_care_period,
        from: "2025-05-01",
        to: "2025-05-28",
      };
    }
    if (variant === "missing-medical") {
      event.incapable_care_period.medical_source_reference = "";
    }
    if (variant === "reused-marriage-record") {
      event.incapable_care_period.medical_source_reference =
        event.marriage_source_reference;
    }
    if (variant === "later-short") {
      later.incapable_care_period.to = "2025-07-27";
    }
    if (variant === "later-wrong-spouse") later.spouse_ssn = "999887777";
    if (variant === "changed-wages") h.ss_wages = h.medicare_wages = 7800;
    assertThrows(
      () => computeScheduleHAmounts(inputSchema.parse(h), 2025),
      Error,
      undefined,
      variant,
    );
    assertThrows(
      () =>
        scheduleH.build(h, { filer, pending: { ...pending, schedule_h: h } }),
      Error,
      undefined,
      variant,
    );
    assertThrows(
      () =>
        scheduleHPdf.instances!(
          scheduleHPdf.projectFields!(h, pdfContext(pending)),
          filer,
          { ...pdfContext(pending), schedule_h: h },
        ),
      Error,
      undefined,
      variant,
    );
    assertEquals(
      f1040_2025.executeReturn({ ...inputs, schedule_h: h }).diagnostics
        .length > 0,
      true,
      variant,
    );
  }
  for (
    const badFiler of [{
      ...filer,
      spouse: { ...filer.spouse!, ssn: "999887777" },
    }, { ...filer, filingStatus: FilingStatus.Single }]
  ) {
    assertThrows(
      () => scheduleH.build(pending.schedule_h!, { filer: badFiler, pending }),
      Error,
      "remarriage must join",
    );
    assertThrows(
      () =>
        scheduleHPdf.instances!(
          scheduleHPdf.projectFields!(pending.schedule_h!, pdfContext(pending)),
          badFiler,
          pdfContext(pending),
        ),
      Error,
      "remarriage must join",
    );
    await assertRejects(() =>
      buildMefBundle(pending, { filer: badFiler, attachments: [] })
    );
  }
});
