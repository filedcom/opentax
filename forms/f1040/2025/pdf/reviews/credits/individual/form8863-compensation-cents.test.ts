import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  serviceBusinessCases,
  serviceBusinessSource,
} from "./form8863-service-business.fixture.ts";
import { filer, ssn } from "./form8863-claimant-source.fixture.ts";
import {
  claimantRefundRestriction,
  claimantReviewSchema,
} from "../../../../../nodes/inputs/credits/individual/f8863/claimant-review.ts";
import {
  requiredServiceScholarshipAmount,
  requiredServiceScholarshipEarned,
  requiredServiceScholarshipSchema,
} from "../../../../../nodes/inputs/income/other/education_income/required-service-scholarship.ts";
import {
  educationMoney,
  sumEducationMoney,
} from "../../../../../nodes/inputs/income/other/education_income/money.ts";
import { scholarshipIncomeTotal } from "../../../../../nodes/inputs/income/other/education_income/sources.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";

function centsSource(
  payroll: boolean,
  cents: number,
  below: boolean,
  two: boolean,
) {
  const base = serviceBusinessSource({ ...serviceBusinessCases[0], payroll });
  const amount = two ? 4000 + cents / 200 : 8000 + cents / 100;
  const total = two ? 8000 + cents / 100 : amount;
  const original = base.inputs.education_income[0];
  const grants = Array.from({ length: two ? 2 : 1 }, (_, i) => {
    const grantRef = `cent-service-grant-${i}`;
    return requiredServiceScholarshipSchema.parse({
      ...original,
      source_document_reference: grantRef,
      taxable_amount: amount,
      payment_sources: original.payment_sources.map((p, j) => ({
        ...p,
        source_document_reference: `cent-service-payment-${i}-${j}`,
        grant_source_reference: grantRef,
        amount: j
          ? Math.round((amount - (two ? 2000.10 : 3500.10)) * 100) / 100
          : two
          ? 2000.10
          : 3500.10,
      })),
      required_service_sources: original.required_service_sources.map((
        s,
        j,
      ) => ({
        ...s,
        source_document_reference: `cent-service-performance-${i}-${j}`,
        grant_source_reference: grantRef,
        performance_record_reference: `cent-service-hours-${i}-${j}`,
        payment_source_references: [`cent-service-payment-${i}-${j}`],
      })),
      reporting: original.reporting.kind === "w2_box1"
        ? { ...original.reporting, w2_box1_wages: total }
        : original.reporting,
    });
  });
  if (base.review.kind !== "under_24") throw new Error("Expected student");
  const earned = sumEducationMoney([10000, 8364.30, total]);
  const support = (Math.round(earned * 100) * 2 + (below ? 2 : 0)) / 100;
  const wages = base.inputs.w2.map((w) =>
    w.source_document_reference === "service-issued-w2"
      ? {
        ...w,
        box1_wages: total,
        box3_ss_wages: total,
        box5_medicare_wages: total,
        box4_ss_withheld: Math.round(total * 6.2) / 100,
        box6_medicare_withheld: Math.round(total * 1.45) / 100,
      }
      : w
  );
  const review = claimantReviewSchema.parse({
    ...base.review,
    earned_income_service_scholarship_sources: grants,
    earned_income_w2_sources: base.review.earned_income_w2_sources.map((w) =>
      w.source_document_reference === "service-issued-w2"
        ? {
          ...w,
          box1_wages: total,
          box3_ss_wages: total,
        }
        : w
    ),
    support_sources: base.review.support_sources.map((s, i) => ({
      ...s,
      amount: i === 0 ? Math.round((support - 4500) * 100) / 100 : s.amount,
    })),
  });
  const agi = 37881 + (payroll ? total : Math.round(total));
  const inputs = {
    ...base.inputs,
    w2: wages,
    education_income: grants,
    general: { ...base.inputs.general, dependent_earned_income: agi },
    f8863_claimant_review: { claimant_review: review },
    f8863: base.inputs.f8863.map((s) => ({
      ...s,
      filer_magi: agi,
      education_expense_workpaper: {
        ...s.education_expense_workpaper,
        form1098t_box5_scholarships: sumEducationMoney([500, total]),
        issued_form1098t_source: {
          ...s.education_expense_workpaper.issued_form1098t_source,
          box5_scholarships: sumEducationMoney([500, total]),
        },
        assistance_sources: [
          ...s.education_expense_workpaper.assistance_sources.filter((a) =>
            a.tax_treatment === "tax_free"
          ),
          ...grants.map((g, i) => ({
            ...s.education_expense_workpaper.assistance_sources.find((a) =>
              a.tax_treatment === "taxable"
            )!,
            source_document_reference: `cent-school-grant-${i}`,
            student_income_source_reference: g.source_document_reference,
            amount: g.taxable_amount,
          })),
        ],
      },
    })),
  };
  return {
    inputs,
    review,
    grants,
    total,
    earned,
    support,
    agi,
    ordinaryTax: 2711,
    refundable: below ? 0 : 1000,
    education: below ? 2500 : 1500,
    ctc: 0,
    actc: 0,
    tax: below ? 4449 : 5449,
    refund: 551,
  };
}

Deno.test("education compensation validates exact cents and sums before filing rounding", () => {
  for (const bad of [-1, 0.001, Infinity, NaN, Number.MAX_SAFE_INTEGER]) {
    assertThrows(() => educationMoney.parse(bad));
  }
  assertEquals(sumEducationMoney([0.1, 0.2]), 0.3);
  const s = centsSource(false, 98, false, true);
  assertEquals(scholarshipIncomeTotal({ education_incomes: s.grants }), 8001);
  assertEquals(requiredServiceScholarshipEarned(s.grants, ssn), 8000.98);
  const grant = s.grants[0];
  assertThrows(() =>
    requiredServiceScholarshipAmount({
      ...grant,
      payment_sources: grant.payment_sources.map((p, i) => ({
        ...p,
        amount: p.amount + (i ? 0.01 : 0),
      })),
    })
  );
  assertThrows(() =>
    requiredServiceScholarshipSchema.parse({
      ...grant,
      taxable_amount: 4000.491,
    })
  );
});
for (const payroll of [false, true]) {
  for (
    const [cents, below, two] of [[49, false, false], [50, true, false], [
      98,
      false,
      true,
    ], [6, false, true]] as const
  ) {
    const name = `${payroll ? "w2" : "line8r"}-${cents}-${
      two ? "two-grants" : below ? "below" : "half"
    }`;
    Deno.test(`education compensation cents ${name} reconciles full return`, async () => {
      const s = centsSource(payroll, cents, below, two);
      assertEquals(claimantRefundRestriction(s.review, "single"), below);
      const result = f1040_2025.executeReturn(s.inputs);
      assertEquals(result.diagnostics, []);
      const pending = buildPending(result.pending);
      const f = pending.f1040!;
      assertEquals([
        f.line11_agi,
        f.line18_total_tax_before_credits,
        f.line29_refundable_aoc ?? 0,
        pending.schedule3?.line3_education_credit,
        f.line24_total_tax,
        f.line35a_refund,
      ], [s.agi, s.ordinaryTax, s.refundable, s.education, s.tax, s.refund]);
      assertEquals(
        pending.schedule1?.line8r_taxable_scholarships ?? 0,
        payroll ? 0 : Math.round(s.total),
      );
      const bundle = await buildMefBundle(pending, { filer, attachments: [] });
      const origins: PdfPageOrigin[] = [];
      const pdf = await buildPdfBytes(
        pending,
        filer,
        ".pdf-cache",
        bundle,
        origins,
      );
      if (s.review.kind !== "under_24") throw new Error("Expected student");
      const variants = [
        {
          ...pending,
          education_income: {
            education_incomes: s.grants.map((g) => ({
              ...g,
              taxable_amount: g.taxable_amount + 0.01,
            })),
          },
        },
        {
          ...pending,
          f8863: {
            ...pending.f8863!,
            claimant_review: {
              ...s.review,
              support_sources: s.review.support_sources.map((v, i) => ({
                ...v,
                amount: v.amount + (i === 0 ? (below ? -0.02 : 0.02) : 0),
              })),
            },
          },
        },
        {
          ...pending,
          schedule1: {
            ...pending.schedule1,
            line8r_taxable_scholarships: (payroll ? 0 : Math.round(s.total)) +
              1,
          },
        },
        {
          ...pending,
          f1040: { ...f, line29_refundable_aoc: s.refundable + 1 },
        },
      ];
      for (const changed of variants) {
        await assertRejects(() =>
          buildMefBundle(changed, { filer, attachments: [] })
        );
        await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
      }
      if (Deno.args.includes("--write-review-artifacts")) {
        const dir =
          `.state/research/form8863-compensation-cents-2026-10-09/${name}`;
        await Deno.mkdir(dir, { recursive: true });
        for (
          const [name, data] of [
            ["source", s.inputs],
            ["pending", result.pending],
            ["expected", s],
            ["origins", origins],
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
}
