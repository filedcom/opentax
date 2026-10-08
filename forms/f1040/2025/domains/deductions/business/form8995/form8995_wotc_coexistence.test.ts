import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { form8995 } from "../../../../mef/forms/deductions/business/f8995/f8995.ts";
import { form8995Pdf } from "../../../../pdf/forms/deductions/business/f8995/f8995.ts";
import { form5884Pdf } from "../../../../pdf/forms/credits/business/f5884.ts";
import { scheduleCPdf } from "../../../../pdf/forms/income/business/schedule_c.ts";
import { computeNetProfit } from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-certified-work-opportunity-credit"
)!;

async function assertFullReturnSchema(xml: string) {
  const xsd = new URL(
    "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const validator = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = validator.stdin.getWriter();
  await writer.write(new TextEncoder().encode(xml));
  await writer.close();
  const validated = await validator.output();
  assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
}

Deno.test("Form 5884 wage reduction reaches Schedule C, Form 8995, native XML and filled PDF", async () => {
  const original = (base.inputs.schedule_c as Record<string, unknown>[])[0];
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: [{
      ...original,
      line_c_business_name: "Example Retail",
      line_d_ein: "123456789",
      line_1_gross_receipts: 70_000,
      qbi_no_other_adjustments_confirmed: true,
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const business = pending.schedule_c.schedule_cs as Record<string, unknown>[];
  assertEquals(business[0].line_26_wages, 6_000);
  assertEquals(pending.schedule_c.wotc_wage_reductions, [{
    business_reference: "REVIEW-WOTC-BUSINESS-1",
    credit_amount: 2_400,
  }]);
  assertEquals(pending.schedule1.line3_schedule_c, 66_400);
  assertEquals(pending.form8995.qbi_from_schedule_c, 66_400);
  assertEquals(computeNetProfit(business[0] as never), 64_000);
  const f3800Credit = pending.f3800.f5884_credit as Record<string, unknown>;
  assertEquals(f3800Credit.credit_amount, 2_400);
  assertEquals(pending.schedule3.line6a_total, 2_400);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 2_400);
  const native = form8995.build(pending.form8995, {
    filer: base.filer,
    pending,
  });
  const pdfFields = form8995Pdf.projectFields!(pending.form8995, pending);
  const creditFields = form5884Pdf.projectFields!(pending.f5884, pending);
  const scheduleCFields = scheduleCPdf.projectFields!(
    pending.schedule_c,
    pending,
  );
  const scheduleCCopy =
    (scheduleCFields.schedule_c_instances as Record<string, unknown>[])[0];
  assertEquals(scheduleCCopy.line_26_wages, 3_600);
  assertEquals(scheduleCCopy.line31, 66_400);
  assertEquals(creditFields.line2, 2_400);
  assertEquals(pdfFields.line15, pending.f1040.line13_qbi_deduction);
  assertStringIncludes(
    native,
    `<QlfyBusinessIncomeOrLossAmt>${pdfFields.line1_qbi}</QlfyBusinessIncomeOrLossAmt>`,
  );
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS8995 documentId=");
  assertStringIncludes(prepared.bundle.xml, "<IRS5884 documentId=");
  await assertFullReturnSchema(prepared.bundle.xml);
  const pdf = await prepared.renderPdf();
  assert(pdf.length > 0);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../../../../.state/research/ty2025-filled-pdf-review/2026-10-06-form8995-wotc/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
    await Deno.writeTextFile(`${directory}return.xml`, prepared.bundle.xml);
  }

  const changed = {
    ...pending,
    f5884: {
      ...pending.f5884,
      f5884s: [{
        ...(pending.f5884.f5884s as Record<string, unknown>[])[0],
        hours_worked: 120,
      }],
    },
  };
  assertThrows(() =>
    form8995.build(pending.form8995, { filer: base.filer, pending: changed })
  );
  assertThrows(() => form8995Pdf.projectFields!(pending.form8995, changed));
  const { f5884: _source, ...withoutWotc } = pending;
  for (
    const altered of [withoutWotc, {
      ...pending,
      schedule_c: { ...pending.schedule_c, wotc_wage_reductions: [] },
    }, {
      ...pending,
      f3800: {
        ...pending.f3800,
        f5884_credit: {
          ...f3800Credit,
          subject_to_passive_activity_limit: true,
        },
      },
    }, {
      ...pending,
      schedule_c: {
        ...pending.schedule_c,
        wotc_wage_reductions: [{
          business_reference: "REVIEW-WOTC-BUSINESS-1",
          credit_amount: 2_300,
        }],
      },
    }, {
      ...pending,
      f3800: {
        ...pending.f3800,
        f5884_credit: { ...f3800Credit, credit_amount: 2_300 },
      },
    }]
  ) {
    assertThrows(() =>
      form8995.build(pending.form8995, { filer: base.filer, pending: altered })
    );
    assertThrows(() => form8995Pdf.projectFields!(pending.form8995, altered));
  }
});

Deno.test("tax-limited WOTC uses full line 2 for QBI before limiting Form 3800 credit", async () => {
  const { w2: _wages, ...inputs } = base.inputs;
  for (
    const [receipts, profit, qbiDeduction, allowed] of [
      [25_000, 21_400, 828, 333],
      [10_000, 6_400, 0, 0],
    ]
  ) {
    const result = f1040_2025.executeReturn({
      ...inputs,
      general: {
        ...(inputs.general as Record<string, unknown>),
        qbi_no_prior_loss_or_suspended_loss_confirmed: true,
        qbi_not_patron_of_specified_cooperative_confirmed: true,
      },
      schedule_c: [{
        ...(inputs.schedule_c as Record<string, unknown>[])[0],
        line_c_business_name: "Example Retail",
        line_d_ein: "123456789",
        line_1_gross_receipts: receipts,
        qbi_no_other_adjustments_confirmed: true,
      }],
    });
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.schedule1.line3_schedule_c, profit);
    assertEquals(pending.form8995.qbi_from_schedule_c, profit);
    assertEquals(
      pending.form8995.se_tax_deduction,
      pending.schedule1.line15_se_deduction,
    );
    assertEquals(pending.f1040.line13_qbi_deduction ?? 0, qbiDeduction);
    assertEquals(pending.f3800.allowed_credit, allowed);
    assertEquals(pending.f1040.line20_nonrefundable_credits, allowed);
    assertEquals(pending.f1040.line16_income_tax, allowed);
    assertEquals(pending.f1040.line22_tax_after_credits, 0);
    assertEquals(pending.schedule3?.line6a_total ?? 0, allowed);
    assertEquals(
      form5884Pdf.projectFields!(pending.f5884, pending).line2,
      2_400,
    );
    const businessFields = scheduleCPdf.projectFields!(
      pending.schedule_c,
      pending,
    )
      .schedule_c_instances as Record<string, unknown>[];
    assertEquals(businessFields[0].line_26_wages, 3_600);
    assertEquals(businessFields[0].line31, profit);
    // Identified positive QBI retains Form 8995 even when its income limit is zero.
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS5884 documentId=");
    assertStringIncludes(prepared.bundle.xml, "<IRS3800 documentId=");
    await assertFullReturnSchema(prepared.bundle.xml);
    if (qbiDeduction > 0) {
      assertStringIncludes(prepared.bundle.xml, "<IRS8995 documentId=");
      const fields = form8995Pdf.projectFields!(pending.form8995, pending);
      assertEquals(fields.line15, 828);
      assertStringIncludes(
        prepared.bundle.xml,
        "<QualifiedBusinessIncomeDedAmt>828</QualifiedBusinessIncomeDedAmt>",
      );
    } else {
      assertStringIncludes(prepared.bundle.xml, "<IRS8995 documentId=");
      assertEquals(
        form8995Pdf.projectFields!(pending.form8995, pending).line15,
        0,
      );
    }
  }
});
