import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  form8941MultiplePlanInputs,
  form8941MultiplePlanSource,
  type MultiplePlanKind,
} from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-multiple-plans.fixture.ts";
import { inputSchema as form3800Schema } from "../../../../nodes/inputs/credits/business/f3800/index.ts";
import { calculateForm8941 } from "../../../../nodes/inputs/credits/health/f8941/index.ts";
import { multiplePlanWorksheet } from "../../../../nodes/inputs/credits/health/f8941/multiple_plans.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../../../../nodes/inputs/income/business/schedule_c/model.ts";
const dir = new URL(
  "../../../../../../.state/research/2026-10-06-form8941-multiplan/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);
function run(kind: MultiplePlanKind, receipts = 350000) {
  const input = form8941MultiplePlanInputs(kind, receipts),
    result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
  assertEquals(result.diagnostics, []);
  return {
    input,
    pending: result.pending,
    filer: extractFilerIdentity(input.general)!,
  };
}
const cases: readonly [
  string,
  MultiplePlanKind,
  number,
  number,
  number,
  number,
  number,
][] = [
  [
    "independent-mixed",
    "independent-mixed",
    350000,
    39245,
    29228,
    14614,
    14614,
  ],
  [
    "reference-composite",
    "reference-composite",
    350000,
    31607,
    23554,
    11777,
    11777,
  ],
  [
    "reference-cheaper",
    "reference-cheaper",
    350000,
    26957,
    41503,
    13479,
    13479,
  ],
  ["reference-list", "reference-list", 350000, 29777, 19461, 9731, 9731],
  [
    "reference-list-partial-use",
    "reference-list",
    210000,
    29777,
    19461,
    9731,
    5297,
  ],
  ["reference-list-zero-use", "reference-list", 135000, 29777, 19461, 9731, 0],
];
for (const [name, kind, receipts, paid, cap, credit, use] of cases) {
  Deno.test({
    name:
      `TY2025 Form8941 multiple QHP ${name}: public source to full XSD and IRS PDF`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      const { input, pending, filer } = run(kind, receipts),
        lines = calculateForm8941(input.f8941),
        worksheet = multiplePlanWorksheet(input.f8941);
      assertEquals([
        lines.line1,
        lines.line2,
        lines.line3,
        lines.line4,
        lines.line5,
        lines.line16,
        lines.line13,
        lines.line14,
      ], [6, 5, 22000, paid, cap, credit, 5, 4]);
      assertEquals(worksheet.rows.length, 52);
      assertEquals(worksheet.enrolledEmployeeReferences.length, 5);
      const source = input.f8941;
      if (!("monthly_plan_arrangements" in source)) {
        throw new Error("Expected multi-plan source");
      }
      assertEquals(source.monthly_plan_arrangements.length, 24);
      assertEquals(
        source.monthly_plan_arrangements[0].eligible_employee_quotes.length,
        5,
      );
      assertEquals(
        source.monthly_plan_arrangements.find((p) =>
          p.month === 6 && p.shop_plan_reference === source.shop_plan_reference
        )!.eligible_employee_quotes.length,
        6,
      );
      assertEquals(
        source.monthly_plan_arrangements.find((p) =>
          p.month === 10 && p.shop_plan_reference === source.shop_plan_reference
        )!.eligible_employee_quotes.length,
        5,
      );
      assertEquals(
        source.shop_review.employee_premium_reviews[5].monthly_premiums,
        [],
      );
      assertEquals(source.employees[5].employer_premium_paid, 0);
      const benefits = 1000 + paid - credit;
      assertEquals(
        projectScheduleCItems(scheduleCSchema.parse(pending.schedule_c))[0]
          .line_14_employee_benefits,
        benefits,
      );
      assertEquals(
        scheduleCSchema.parse(pending.schedule_c).schedule_cs[0]
          .line_14_employee_benefits,
        1000 + paid,
      );
      assertEquals(
        pending.f1040.line8_additional_income,
        receipts - 110000 - benefits,
      );
      assertEquals(pending.f3800.form8941_applied_credit, use);
      assertEquals(
        Number(pending.f1040.line20_nonrefundable_credits ?? 0),
        use,
      );
      const bundle = await buildMefBundle(buildPending(pending), {
        filer,
        attachments: [],
      });
      const allocation = bundle.form3800Parts!.currentAmounts.find((r) =>
        r.line === "4h"
      )!;
      assertEquals([allocation.totalCredit, allocation.appliedCredit], [
        credit,
        use,
      ]);
      assertStringIncludes(bundle.xml, "<IRS8941 ");
      assertStringIncludes(
        bundle.xml,
        "<PaidHIPForEmplForPrpsOfCrCnt>5</PaidHIPForEmplForPrpsOfCrCnt>",
      );
      assertStringIncludes(
        bundle.xml,
        "<FTEEmplPdHIPForPrpsOfCrCnt>4</FTEEmplPdHIPForPrpsOfCrCnt>",
      );
      assertEquals(
        form3800Schema.parse(pending.f3800).f8941_direct_employer_credit!
          .shop_plan_references,
        source.offered_qhps.map((p) => p.shop_plan_reference),
      );
      assertStringIncludes(
        bundle.xml,
        `<SumSmllrAmtAndCreditForHIPAmt>${credit}</SumSmllrAmtAndCreditForHIPAmt>`,
      );
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        dir + name + ".json",
        JSON.stringify(
          {
            input,
            lines,
            pending,
            preparedParts: bundle.form3800Parts,
            worksheet,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(dir + name + ".xml", bundle.xml);
      const valid = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, dir + name + ".xml"],
        stderr: "piped",
      }).output();
      assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
      await Deno.writeFile(
        dir + name + ".pdf",
        await buildPdfBytes(
          bundle.pending,
          filer,
          dir + "irs-pdf-cache",
          bundle,
        ),
      );
      const text = await new Deno.Command("pdftotext", {
        args: ["-layout", dir + name + ".pdf", "-"],
        stdout: "piped",
      }).output();
      assertEquals(text.code, 0);
      const packet = new TextDecoder().decode(text.stdout);
      await Deno.writeTextFile(dir + name + ".txt", packet);
      assertStringIncludes(packet, "Small Employer Health Insurance");
      assertStringIncludes(packet, String(credit));
      assertStringIncludes(packet, String(benefits));
      const creditHeader = packet.search(/\fForm\s+8941\s+Credit/),
        qbiHeader = packet.search(/\fForm\s+8995\s+Qualified Business Income/),
        medicare = packet.search(/\fForm\s+8959\s+Additional Medicare Tax/),
        niit = packet.search(/\fForm\s+8960\s+Net Investment Income/);
      assertEquals(creditHeader > 0, true);
      if (qbiHeader > 0) assertEquals(qbiHeader < creditHeader, true);
      if (medicare > 0) assertEquals(creditHeader < medicare, true);
      if (niit > 0) assertEquals(creditHeader < niit, true);
    },
  });
}

// Mutations use the retained public source, then exercise both actual export paths.
type Mutation = readonly [string, (s: any) => void];
const sourceMutations: readonly Mutation[] = [
  ["reference-unavailable-to-declined-eligible-worker", (s) => {
    s.employees[5].plan_eligibility_periods.splice(0, 1);
    s.shop_review.employee_premium_reviews[5].plan_eligibility_periods.splice(
      0,
      1,
    );
  }],
  [
    "offered-plan-owner",
    (s) => s.offered_qhps[1].payer_employment_ein = "999887777",
  ],
  [
    "offered-plan-SHOP",
    (s) => s.offered_qhps[1].shop_marketplace_identifier = "wrong",
  ],
  [
    "duplicate-offered-plan",
    (s) =>
      s.offered_qhps[1].shop_plan_reference =
        s.offered_qhps[0].shop_plan_reference,
  ],
  [
    "wrong-reference-plan",
    (s) => s.reference_shop_plan_reference = "unoffered",
  ],
  ["missing-reference-plan", (s) => delete s.reference_shop_plan_reference],
  [
    "missing-offered-policy-month",
    (s) => s.monthly_plan_arrangements.splice(0, 1),
  ],
  [
    "duplicate-plan-month",
    (s) =>
      s.monthly_plan_arrangements.push(
        structuredClone(s.monthly_plan_arrangements[0]),
      ),
  ],
  [
    "policy-owner",
    (s) => s.monthly_plan_arrangements[0].payer_employment_ein = "999887777",
  ],
  [
    "policy-not-offered-month",
    (s) => s.offered_qhps[0].offering_period.first_month = 2,
  ],
  [
    "eligible-roster-omission",
    (s) => s.monthly_plan_arrangements[0].eligible_employee_quotes.pop(),
  ],
  [
    "eligible-quote-SSN",
    (s) =>
      s.monthly_plan_arrangements[0].eligible_employee_quotes[0].employee_ssn =
        "999887777",
  ],
  [
    "eligible-quote-reuse",
    (s) =>
      s.monthly_plan_arrangements[0].eligible_employee_quotes[1]
        .quote_source_reference =
          s.monthly_plan_arrangements[0].eligible_employee_quotes[0]
            .quote_source_reference,
  ],
  [
    "quote-before-hire-eligibility",
    (s) =>
      s.monthly_plan_arrangements[0].eligible_employee_quotes.push(
        structuredClone(
          s.monthly_plan_arrangements[5].eligible_employee_quotes[2],
        ),
      ),
  ],
  [
    "quote-after-termination",
    (s) =>
      s.monthly_plan_arrangements[9].eligible_employee_quotes.push(
        structuredClone(
          s.monthly_plan_arrangements[8].eligible_employee_quotes[3],
        ),
      ),
  ],
  ["eligibility-outside-employment", (s) => {
    s.employees[2].plan_eligibility_periods[0].first_month = 1;
    s.employees[2].plan_eligibility_periods[0].coverage_start_date =
      "2025-01-01";
  }],
  ["enrollment-before-eligible", (s) => {
    s.employees[2].enrollment_selections[0].first_month = 5;
    s.employees[2].enrollment_selections[0].coverage_start_date = "2025-05-01";
  }],
  [
    "duplicate-selected-month",
    (s) =>
      s.employees[0].enrollment_selections.push(
        structuredClone(s.employees[0].enrollment_selections[0]),
      ),
  ],
  [
    "payroll-review-eligibility-tamper",
    (s) =>
      s.shop_review.employee_premium_reviews[0].plan_eligibility_periods[0]
        .last_month = 11,
  ],
  [
    "unenrolled-payroll-wages",
    (s) =>
      s.shop_review.employee_premium_reviews[5]
        .payroll_social_security_medicare_wages = 1,
  ],
  [
    "unenrolled-premium-claim",
    (s) => s.employees[5].employer_premium_paid = 1000,
  ],
  [
    "missing-reference-entitlements",
    (s) => delete s.monthly_plan_arrangements[0].reference_contributions,
  ],
  [
    "reference-entitlement-underfunded",
    (s) =>
      s.monthly_plan_arrangements[0].reference_contributions[0]
        .employee_only_contribution -= 1,
  ],
  [
    "reference-entitlement-SSN",
    (s) =>
      s.monthly_plan_arrangements[0].reference_contributions[0].employee_ssn =
        "999887777",
  ],
  [
    "reference-entitlement-document-reuse",
    (s) =>
      s.monthly_plan_arrangements[0].reference_contributions[0]
        .contribution_source_reference =
          s.monthly_plan_arrangements[0].employer_policy_reference,
  ],
  [
    "selected-plan-rule-substitution",
    (s) =>
      s.monthly_plan_arrangements[12].employee_only_rule = {
        method: "uniform_percentage",
        employer_basis_points: 5000,
      },
  ],
  [
    "invoice-selected-plan",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[6]
        .shop_plan_reference = s.shop_plan_reference,
  ],
  [
    "invoice-reference-policy",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[6]
        .reference_policy_reference = "wrong",
  ],
  [
    "invoice-reference-entitlement",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[6]
        .reference_contribution_source_reference = "wrong",
  ],
  [
    "invoice-selected-quote",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[6]
        .insured_quote_reference = "wrong",
  ],
  [
    "invoice-payment-underfunded",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[6]
        .employer_payment -= 1,
  ],
  [
    "duplicate-invoice",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[1]
        .shop_invoice_reference =
          s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
            .shop_invoice_reference,
  ],
  [
    "duplicate-payment",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[1]
        .employer_payment_reference =
          s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
            .employer_payment_reference,
  ],
  [
    "wrong-payment-year",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .payment_date = "2026-01-15",
  ],
  [
    "dependent-wrong-plan-eligibility",
    (s) => s.employees[0].covered_dependents[0].plan_eligibility_records.pop(),
  ],
  [
    "dependent-plan-document-reuse",
    (s) =>
      s.employees[0].covered_dependents[0].plan_eligibility_records[0]
        .plan_dependent_eligibility_source_reference =
          s.employees[0].employment_period.enrollment_source_reference,
  ],
  [
    "wrong-IRS-family-table",
    (s) => s.shop_review.irs_table_family_average_premium = 9358,
  ],
  [
    "source-precision",
    (s) =>
      s.monthly_plan_arrangements[0].eligible_employee_quotes[0]
        .employee_only_premium += .001,
  ],
];
Deno.test({
  name:
    "TY2025 Form8941 multiple QHP: sourced conflicts reject public graph and actual native/PDF",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const { pending, filer } = run("reference-list"),
      bundle = await buildMefBundle(buildPending(pending), {
        filer,
        attachments: [],
      });
    const rejected = [];
    for (const [name, mutate] of sourceMutations) {
      const input = form8941MultiplePlanInputs("reference-list");
      mutate(input.f8941);
      assertThrows(() => calculateForm8941(input.f8941));
      const result = execute(plan, registry, input, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics.length > 0, true, name);
      assertThrows(() => buildMefXml(buildPending(result.pending), filer));
      await assertRejects(() =>
        buildPdfBytes(result.pending, filer, dir + "negative-cache")
      );
      const bad = structuredClone(bundle.pending);
      mutate(bad.f8941);
      assertThrows(() => buildMefXml(buildPending(bad), filer));
      await assertRejects(() =>
        buildPdfBytes(bad, filer, dir + "negative-cache", {
          ...bundle,
          pending: bad,
        })
      );
      rejected.push(name);
    }
    const totals: readonly Mutation[] = [
      [
        "missing-credit-QHP-roster",
        (p) => delete p.f3800.f8941_direct_employer_credit.shop_plan_references,
      ],
      [
        "credit-QHP-roster-tamper",
        (p) => p.f3800.f8941_direct_employer_credit.shop_plan_references.pop(),
      ],
      [
        "gross-premium-deduction",
        (p) => p.schedule_c.schedule_cs[0].line_14_employee_benefits += 1,
      ],
      [
        "allowed-only-deduction-reduction",
        (p) => p.schedule_c.form8941_premium_reductions[0].credit_amount = 5297,
      ],
      [
        "determined-credit",
        (p) => p.f3800.f8941_direct_employer_credit.credit_amount += 1,
      ],
      ["applied-credit", (p) => p.f3800.form8941_applied_credit += 1],
      ["enrolled-count-source-omission", (p) => p.f8941.employees.pop()],
      ["1040-credit", (p) => p.f1040.line20_nonrefundable_credits += 1],
    ];
    for (const [name, mutate] of totals) {
      const bad = structuredClone(bundle.pending);
      mutate(bad);
      assertThrows(() => buildMefXml(buildPending(bad), filer));
      await assertRejects(() =>
        buildPdfBytes(bad, filer, dir + "negative-cache", {
          ...bundle,
          pending: bad,
        })
      );
    }
    await Deno.writeTextFile(
      dir + "negative-proof.json",
      JSON.stringify(
        {
          publicGraphNativeAndPdfRejected: rejected,
          nativeAndPreparedPdfRejected: [
            ...rejected,
            ...totals.map(([name]) => name),
          ],
        },
        null,
        2,
      ),
    );
  },
});
Deno.test("TY2025 Form8941 multiple QHP: computed reference denominator retains declined workers and changes only with sourced eligibility", () => {
  const s = form8941MultiplePlanSource("reference-list");
  if (!("monthly_plan_arrangements" in s)) {
    throw new Error("Expected multi-plan");
  }
  const p = s.monthly_plan_arrangements[0],
    june = s.monthly_plan_arrangements[5],
    oct = s.monthly_plan_arrangements[9];
  assertEquals(
    p.eligible_employee_quotes.map((q) => q.employee_reference).includes(
      s.employees[5].employee_reference,
    ),
    true,
  );
  assertEquals(
    p.eligible_employee_quotes.map((q) => q.employee_reference).includes(
      s.employees[2].employee_reference,
    ),
    false,
  );
  assertEquals(
    june.eligible_employee_quotes.map((q) => q.employee_reference).includes(
      s.employees[2].employee_reference,
    ),
    true,
  );
  assertEquals(
    oct.eligible_employee_quotes.map((q) => q.employee_reference).includes(
      s.employees[3].employee_reference,
    ),
    false,
  );
  assertEquals(
    p.eligible_employee_quotes.reduce(
      (sum, q) => sum + q.employee_only_premium,
      0,
    ) / 5,
    1580.05,
  );
  const actualEnrollees = p.eligible_employee_quotes.filter((q) =>
    s.employees.find((e) => e.employee_reference === q.employee_reference)!
      .enrollment_selections.some((v) =>
        v.first_month <= 1 && v.last_month >= 1
      )
  );
  const incorrectEnrolledAverage =
    actualEnrollees.reduce((sum, q) => sum + q.employee_only_premium, 0) /
    actualEnrollees.length;
  assertEquals(incorrectEnrolledAverage, 1225.05);
  assertEquals(650.01 > incorrectEnrolledAverage / 2, true);
  assertEquals(650.01 <= 1580.05 / 2, true);
  assertEquals(
    multiplePlanWorksheet(s).rows.filter((r) =>
      r.employee_reference === s.employees[5].employee_reference
    ).length,
    0,
  );
});
