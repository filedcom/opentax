import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../../../2025/mef/builder.ts";
import { buildPending } from "../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { form8941PartYearInputs } from "../../../2025/pdf/reviews/composed/review-8941-partyear.fixture.ts";
import { projectScheduleCItems } from "../../../nodes/inputs/schedule_c/model.ts";
import { inputSchema as scheduleCSchema } from "../../../nodes/inputs/schedule_c/model.ts";
import { calculateForm8941 } from "../../../nodes/inputs/f8941/index.ts";
const dir = new URL(
  "../../../../../.state/research/2026-10-06-form8941-partyear/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);
function run(receipts = 180000) {
  const input = form8941PartYearInputs(receipts);
  const result = execute(plan, registry, input, {
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
for (
  const [name, receipts] of [["full", 180000], ["partial", 120000], [
    "zero",
    95000,
  ]] as const
) {
  Deno.test({
    name: `Form8941 part-year owned public ${name} tax-use full-XSD/PDF`,
    sanitizeOps: false,
    sanitizeResources: false,
  }, async () => {
    const { input, pending, filer } = run(receipts);
    const lines = calculateForm8941(input.f8941);
    const applied = Number(pending.f3800.form8941_applied_credit);
    assertEquals(lines.line16, 6629);
    assertEquals(lines.line2, 3);
    assertEquals(lines.line3, 25000);
    assertEquals(lines.line5, 13257);
    assertEquals(lines.line14, 3);
    assertEquals(
      input.f8941.employees.reduce((sum, e) => sum + e.hours_of_service, 0),
      7800,
    );
    assertEquals(
      projectScheduleCItems(scheduleCSchema.parse(pending.schedule_c))[0]
        .line_14_employee_benefits,
      11371,
    );
    assertEquals(
      scheduleCSchema.parse(pending.schedule_c).schedule_cs[0]
        .line_14_employee_benefits,
      18000,
    );
    assertEquals(pending.f1040.line8_additional_income, receipts - 86371);
    assertEquals(
      applied,
      Number(pending.f1040.line20_nonrefundable_credits ?? 0),
    );
    if (name === "full") assertEquals(applied, 6629);
    if (name === "partial") assertEquals(applied > 0 && applied < 6629, true);
    if (name === "zero") assertEquals(applied, 0);
    const bundle = await buildMefBundle(buildPending(pending), {
      filer,
      attachments: [],
    });
    assertEquals(
      bundle.form3800Parts!.currentAmounts.find((row) => row.line === "4h")!
        .appliedCredit,
      applied,
    );
    assertEquals(
      bundle.form3800Parts!.currentAmounts.find((row) => row.line === "4h")!
        .totalCredit,
      6629,
    );
    const xml = bundle.xml;
    assertStringIncludes(xml, "<IRS8941 ");
    assertStringIncludes(
      xml,
      "<SumSmllrAmtAndCreditForHIPAmt>6629</SumSmllrAmtAndCreditForHIPAmt>",
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
          worksheet4: input.f8941.employees.map((employee, index) => ({
            employee_reference: employee.employee_reference,
            enrollment_period: employee.enrollment_period,
            enrolled_months: employee.enrollment_period.last_month -
              employee.enrollment_period.first_month + 1,
            annual_hours_of_service: employee.hours_of_service,
            raw_payroll_hours_of_service:
              input.f8941.shop_review.employee_premium_reviews[index]
                .payroll_hours_of_service,
            employer_premium_paid: employee.employer_premium_paid,
            adjusted_average_premium:
              employee.irs_2025_rating_area_average_premium *
              input.f8941.uniform_employer_contribution_basis_points *
              (employee.enrollment_period.last_month -
                employee.enrollment_period.first_month + 1) /
              120000,
          })),
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(dir + name + ".xml", xml);
    const valid = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + name + ".xml"],
      stderr: "piped",
    }).output();
    assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
    await Deno.writeFile(
      dir + name + ".pdf",
      await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
    );
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", dir + name + ".pdf", "-"],
      stdout: "piped",
    }).output();
    assertEquals(text.code, 0);
    const packet = new TextDecoder().decode(text.stdout);
    await Deno.writeTextFile(dir + name + ".txt", packet);
    assertStringIncludes(packet, "Small Employer Health Insurance");
    assertStringIncludes(packet, "6629");
    assertStringIncludes(packet, "11371");
    if (name !== "zero") {
      assertEquals(
        packet.indexOf("Qualified Business Income") <
          packet.indexOf("Credit for Small Employer"),
        true,
      );
    }
  });
}
Deno.test({
  name:
    "Form8941 part-year actual native/PDF reject owned source and deduction/allocation tampering",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const baseline = run(120000);
  const bundle = await buildMefBundle(buildPending(baseline.pending), {
    filer: baseline.filer,
    attachments: [],
  });
  const mutations: [string, (pending: any) => void][] = [
    ["wage-ceiling", (p) => {
      p.f8941.employees.forEach((employee: any, index: number) => {
        employee.social_security_medicare_wages = 50000;
        p.f8941.shop_review.employee_premium_reviews[index]
          .payroll_social_security_medicare_wages = 50000;
      });
    }],
    [
      "omitted-month",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums.pop(),
    ],
    [
      "outside-enrollment",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
          .month = 6,
    ],
    [
      "duplicate-month",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[1]
          .month = 7,
    ],
    [
      "wrong-policy-period",
      (p) => p.f8941.employees[0].enrollment_period.first_month = 6,
    ],
    [
      "wrong-invoice-end",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
          .coverage_end_date = "2025-08-31",
    ],
    [
      "wrong-payment-year",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
          .payment_date = "2026-07-15",
    ],
    [
      "payroll-hours-tamper",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0]
          .payroll_hours_of_service = 1040,
    ],

    [
      "employee-owner",
      (p) => p.f8941.employees[0].employee_ssn = p.f8941.owner_ssn,
    ],
    [
      "payroll-employer",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].payroll_employment_ein =
          "987654321",
    ],
    [
      "invoice-plan",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
          .shop_plan_reference = "wrong-plan",
    ],
    [
      "payment-owner",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
          .payer_employment_ein = "987654321",
    ],
    [
      "reused-invoice",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[1].monthly_premiums[0]
          .shop_invoice_reference =
            p.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
              .shop_invoice_reference,
    ],
    [
      "payroll-amount",
      (p) =>
        p.f8941.shop_review.employee_premium_reviews[0]
          .payroll_social_security_medicare_wages++,
    ],
    [
      "gross-benefits",
      (p) =>
        p.schedule_c.schedule_cs[0].line_14_employee_benefits = 18000 -
          p.f3800.form8941_applied_credit,
    ],
    [
      "allowed-only-reduction",
      (p) =>
        p.schedule_c.form8941_premium_reductions[0].credit_amount =
          p.f3800.form8941_applied_credit,
    ],
    [
      "credit-total",
      (p) => p.f3800.f8941_direct_employer_credit.credit_amount++,
    ],
    ["allocation", (p) => p.f3800.form8941_applied_credit++],
    ["1040-total", (p) => p.f1040.line20_nonrefundable_credits++],
    ["owner-ssn", (p) => p.f8941.owner_ssn = "999887777"],
    ["owner-name", (p) => p.f8941.owner_name = "Other Employer"],
  ];
  for (const [name, mutate] of mutations) {
    const pending = structuredClone(bundle.pending);
    mutate(pending);
    assertThrows(
      () => buildMefXml(buildPending(pending), baseline.filer),
      Error,
      undefined,
      name,
    );
    await assertRejects(
      () =>
        buildPdfBytes(pending, baseline.filer, dir + "irs-pdf-cache", bundle),
      Error,
      undefined,
      name,
    );
  }
  await Deno.writeTextFile(
    dir + "negative-proof.json",
    JSON.stringify(
      { nativeAndPdfRejected: mutations.map(([name]) => name) },
      null,
      2,
    ),
  );
});
Deno.test({
  name:
    "Form8941 part-year public input rejects conflicting owned payroll and SHOP records",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  for (
    const kind of [
      "payroll",
      "invoice",
      "owner",
      "month",
      "payment-year",
      "wage-ceiling",
    ]
  ) {
    const input = form8941PartYearInputs();
    if (kind === "payroll") {
      input.f8941.shop_review.employee_premium_reviews[0]
        .payroll_social_security_medicare_wages++;
    }
    if (kind === "invoice") {
      input.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .payer_employment_ein = "987654321";
    }
    if (kind === "owner") {
      input.f8941.employees[0].employee_ssn = input.f8941.owner_ssn;
    }
    if (kind === "month") {
      input.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .month = 6;
    }
    if (kind === "payment-year") {
      input.f8941.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .payment_date = "2026-07-15";
    }
    if (kind === "wage-ceiling") {
      input.f8941.employees.forEach((employee, index) => {
        employee.social_security_medicare_wages = 50000;
        input.f8941.shop_review.employee_premium_reviews[index]
          .payroll_social_security_medicare_wages = 50000;
      });
    }
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics.length > 0, true, kind);
    const filer = extractFilerIdentity(input.general)!;
    assertThrows(() => buildMefXml(buildPending(result.pending), filer));
    await assertRejects(() => buildPdfBytes(result.pending, filer));
  }
});
