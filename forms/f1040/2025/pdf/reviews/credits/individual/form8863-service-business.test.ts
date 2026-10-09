import { assertEquals, assertRejects } from "@std/assert";
import { claimantRefundRestriction } from "../../../../../nodes/inputs/credits/individual/f8863/claimant-review.ts";
import { reviewedBusinessIncome } from "../../../../../nodes/inputs/credits/individual/f8863/business-review.ts";
import { requiredServiceScholarshipEarned } from "../../../../../nodes/inputs/income/other/education_income/required-service-scholarship.ts";
import { filer, ssn } from "./form8863-claimant-source.fixture.ts";
import {
  serviceBusinessCases as cases,
  serviceBusinessSource as source,
} from "./form8863-service-business.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";

for (const item of cases) {
  Deno.test(`Service scholarship/business AOTC ${item.name} reconciles complete return`, async () => {
    const s = source(item);
    if (s.review.kind !== "under_24") {
      throw new Error("Expected young claimant");
    }
    const derived = reviewedBusinessIncome(
      s.review.earned_income_business_sources!,
      s.review.earned_income_w2_sources,
      ssn,
    );
    assertEquals([
      derived.earned +
      requiredServiceScholarshipEarned(
        s.review.earned_income_service_scholarship_sources!,
        ssn,
      ),
      derived.businessEarned,
      derived.deduction,
      derived.seTax,
    ], [s.earned, s.businessEarned, 2119, 4238]);
    assertEquals(claimantRefundRestriction(s.review, "single"), item.below);
    const result = f1040_2025.executeReturn(s.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const f = pending.f1040!;
    assertEquals(
      f.line1a_wages,
      (item.phaseout ? 49119 : 10000) + (item.payroll ? 8000 : 0),
    );
    assertEquals(
      pending.schedule1?.line8r_taxable_scholarships ?? 0,
      item.payroll ? 0 : 8000,
    );
    assertEquals(f.line8_additional_income, item.payroll ? 30000 : 38000);
    assertEquals(f.line9_total_income, s.agi + 2119);
    assertEquals([
      f.line11_agi,
      f.line13_qbi_deduction,
      f.line18_total_tax_before_credits,
      f.line29_refundable_aoc ?? 0,
      pending.schedule3?.line3_education_credit,
      f.line19_child_tax_credit ?? 0,
      f.line28_actc ?? 0,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      s.agi,
      5576,
      s.ordinaryTax,
      s.refundable,
      s.education,
      s.ctc,
      s.actc,
      s.tax,
      s.refund,
    ]);
    if (item.child) {
      assertEquals(pending.f8812?.f8812s?.[0].line18a_earned_income, 37881);
    }
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const alteredReviews = [
      { ...s.review, earned_income_service_scholarship_sources: undefined },
      {
        ...s.review,
        earned_income_service_scholarship_sources: s.review
          .earned_income_service_scholarship_sources!.map((g) => ({
            ...g,
            student_ssn: "999887777",
          })),
      },
      {
        ...s.review,
        earned_income_service_scholarship_sources: s.review
          .earned_income_service_scholarship_sources!.map((g) => ({
            ...g,
            payment_sources: g.payment_sources.map((p) => ({
              ...p,
              amount: p.amount + 1,
            })),
          })),
      },
      {
        ...s.review,
        earned_income_w2_sources: s.review.earned_income_w2_sources.map((
          w,
        ) => ({ ...w, box1_wages: w.box1_wages + 1 })),
      },
      { ...s.review, earned_income_w2_sources: [] },
      {
        ...s.review,
        support_sources: s.review.support_sources.map((v) => ({
          ...v,
          beneficiary_ssn: "999887777",
        })),
      },
    ];
    const variants = [
      ...alteredReviews.map((claimant_review) => ({
        ...pending,
        f8863: { ...pending.f8863!, claimant_review },
      })),
      { ...pending, education_income: undefined },
      { ...pending, w2: undefined },
      { ...pending, schedule_c: undefined },
      { ...pending, schedule_se: { ...pending.schedule_se, w2_ss_wages: 1 } },
      {
        ...pending,
        schedule1: { ...pending.schedule1, line15_se_deduction: 2120 },
      },
      { ...pending, f1040: { ...f, line29_refundable_aoc: s.refundable + 1 } },
    ];
    for (const changed of variants) {
      await assertRejects(() =>
        buildMefBundle(changed, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir =
        `.state/research/form8863-service-business-2026-10-09/${item.name}`;
      await Deno.mkdir(dir, { recursive: true });
      for (
        const [name, data] of [
          ["source", s.inputs],
          ["pending", result.pending],
          ["origins", origins],
          ["expected", s],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
  });
}
