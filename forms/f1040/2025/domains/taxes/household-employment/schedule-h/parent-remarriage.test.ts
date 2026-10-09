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
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import { scheduleH } from "../../../../mef/forms/taxes/household-employment/schedule_h.ts";
import { scheduleHPdf } from "../../../../pdf/forms/taxes/household-employment/schedule_h.ts";
import { FilingStatus } from "../../../../mef/types.ts";
import {
  parentRemarriageCases,
  parentRemarriageInput,
} from "./parent-remarriage.fixture.ts";

function pdfContext(pending: ReturnType<typeof buildPending>) {
  return {
    schedule_h: pending.schedule_h ?? {},
    schedule2: pending.schedule2 ?? {},
    f1040: pending.f1040 ?? {},
    w2: { w2s: pending.w2?.w2s },
  };
}

Deno.test("Schedule H remarriage joins split service time, wages, married ownership and final tax", async () => {
  for (const c of parentRemarriageCases) {
    const input = parentRemarriageInput(c), before = structuredClone(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, [], c.id);
    assertEquals(
      result.pending.schedule2.line9_household_employment,
      c.tax,
      c.id,
    );
    assertEquals(result.pending.f1040.line23_other_taxes, c.tax, c.id);
    // TY2025 Tax Table: MFJ taxable income43,500–43,549 gives4,746.
    assertEquals(result.pending.f1040.line15_taxable_income, 43_500, c.id);
    assertEquals(result.pending.f1040.line16_income_tax, 4_746, c.id);
    assertEquals(result.pending.f1040.line24_total_tax, 4_746 + c.tax, c.id);
    assertEquals(
      result.pending.f1040.line35a_refund,
      11_000 - 4_746 - c.tax,
      c.id,
    );
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertStringIncludes(
      bundle.xml,
      `<CombinedFUTATaxPlusNetTaxesAmt>${c.tax}</CombinedFUTATaxPlusNetTaxesAmt>`,
    );
    assertStringIncludes(
      bundle.xml,
      `<SocialSecurityTaxCashWagesAmt>${
        2800 + c.wages
      }</SocialSecurityTaxCashWagesAmt>`,
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
    assertEquals(computeScheduleHAmounts(input.schedule_h, 2025).futaTax, 0);
    assertEquals(input, before);
  }
});

Deno.test("Schedule H remarriage rejects conflicting event, service, source and year-end facts", async () => {
  const input = parentRemarriageInput(parentRemarriageCases[0]);
  const result = f1040_2025.executeReturn(input),
    pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  for (
    const variant of [
      "wrong-quarter",
      "late-prior-event",
      "duplicate-reference",
      "wrong-prior-record",
      "wrong-later-spouse",
      "cross-event-service",
      "changed-wages",
      "quarterly-review",
    ]
  ) {
    const h = structuredClone(input.schedule_h);
    const parent = h.fica_only_payroll!.employee_wages.find((p) =>
      p.relationship === "parent"
    );
    if (
      !parent || parent.relationship !== "parent" ||
      parent.parent_fica_review.classification !== "dated_service_periods"
    ) throw new Error("Expected dated parent");
    const review = parent.parent_fica_review;
    const event = review.quarterly_circumstances[1].employer_circumstances;
    const prior = review.quarterly_circumstances[0].employer_circumstances;
    const later = review.quarterly_circumstances[3].employer_circumstances;
    if (
      event.kind !== "remarried_capable_spouse" ||
      prior.kind !== "divorced_not_remarried" ||
      later.kind !== "married_capable_spouse"
    ) throw new Error("Expected marital timeline");
    if (variant === "wrong-quarter") event.remarriage_date = "2025-07-15";
    if (variant === "late-prior-event") {
      event.prior_marriage_end_date = "2025-02-01";
    }
    if (variant === "duplicate-reference") {
      event.marriage_source_reference =
        event.prior_marriage_end_source_reference;
    }
    if (variant === "wrong-prior-record") {
      prior.divorce_source_reference = "other-divorce-record";
    }
    if (variant === "wrong-later-spouse") later.spouse_ssn = "999887777";
    if (variant === "cross-event-service") {
      review.wage_payments[2].service_from = "2025-05-14";
    }
    if (variant === "changed-wages") h.ss_wages = h.medicare_wages = 7800;
    if (variant === "quarterly-review") {
      parent.parent_fica_review = {
        classification: "quarterly_circumstances",
        quarterly_circumstances: review.quarterly_circumstances,
        wage_payments: review.wage_payments.map((
          {
            payment_reference,
            paid_date,
            service_from,
            service_to,
            cash_wages,
          },
        ) => ({
          payment_reference,
          paid_date,
          service_from,
          service_to,
          cash_wages,
        })),
      };
    }
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
      f1040_2025.executeReturn({ ...input, schedule_h: h }).diagnostics.length >
        0,
      true,
      variant,
    );
  }
  for (
    const badFiler of [
      { ...filer, spouse: { ...filer.spouse!, ssn: "999887777" } },
      { ...filer, filingStatus: FilingStatus.Single },
    ]
  ) {
    assertThrows(
      () => scheduleH.build(pending.schedule_h!, { filer: badFiler, pending }),
      Error,
      "remarriage must join",
    );
    await assertRejects(() =>
      buildMefBundle(pending, { filer: badFiler, attachments: [] })
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
  }
});
