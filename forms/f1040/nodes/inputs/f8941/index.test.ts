import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8941, f8941 } from "./index.ts";
import { form8941DirectFixture } from "./fixture.ts";
import { f3800 } from "../f3800/index.ts";

Deno.test("Form 8941 derives the Albany SHOP credit from employee hours, wages and premium cap", () => {
  const lines = calculateForm8941(form8941DirectFixture());
  assertEquals(lines.line1, 5);
  assertEquals(lines.line2, 5);
  assertEquals(lines.line3, 20_000);
  assertEquals(lines.line4, 25_000);
  assertEquals(lines.line5, 23_395);
  assertEquals(lines.line6, 23_395);
  assertEquals(lines.line7, 11_698);
  assertEquals(lines.line12, 11_698);
  assertEquals(lines.line13, 5);
  assertEquals(lines.line14, 5);
  assertEquals(lines.line16, 11_698);
});

Deno.test("Form 8941 applies both printed FTE and wage phaseouts", () => {
  const source = form8941DirectFixture(11, 34_000);
  const lines = calculateForm8941(source);
  assertEquals(lines.line2, 11);
  assertEquals(lines.line3, 34_000);
  if (!(lines.line9 < lines.line8 && lines.line8 < lines.line7)) {
    throw new Error("Expected both Form 8941 reductions");
  }
});

Deno.test("Form 8941 rejects altered SHOP contributions, rating area, history and old override shape", () => {
  const premium = form8941DirectFixture();
  premium.employees[0].employer_premium_paid = 6000;
  assertThrows(
    () => calculateForm8941(premium),
    Error,
    "monthly premiums differ from worksheet inputs",
  );
  const rating = form8941DirectFixture();
  rating.employees[0].irs_2025_rating_area_average_premium = 10_000;
  assertThrows(
    () => calculateForm8941(rating),
    Error,
    "employee rating area differs",
  );
  const incomplete = { ...form8941DirectFixture() };
  delete (incomplete as Partial<typeof incomplete>)
    .all_nonexcluded_employees_enrolled_verified;
  assertEquals(f8941.inputSchema.safeParse(incomplete).success, false);
  const history = {
    ...form8941DirectFixture(),
    credit_period_first_year: 2024 as const,
  };
  assertThrows(
    () => calculateForm8941(history),
    Error,
    "credit-period history",
  );
  assertEquals(
    f8941.inputSchema.safeParse({
      fte_count: 5,
      average_annual_wages: 20_000,
      premiums_paid: 25_000,
    }).success,
    false,
  );
});

Deno.test("Form 8941 review binds the IRS table, monthly coverage and paid premiums", () => {
  const table = form8941DirectFixture();
  table.shop_review.irs_table_employee_only_average_premium = 10_000;
  assertThrows(() => calculateForm8941(table), Error, "not supported");

  const area = form8941DirectFixture();
  area.shop_review.irs_table_county = "Albany County";
  assertThrows(() => calculateForm8941(area), Error, "not supported");

  const omitted = form8941DirectFixture();
  omitted.shop_review.employee_premium_reviews.pop();
  assertThrows(
    () => calculateForm8941(omitted),
    Error,
    "employee set is incomplete",
  );

  const month = form8941DirectFixture();
  month.shop_review.employee_premium_reviews[0].monthly_premiums[11].month = 11;
  assertThrows(() => calculateForm8941(month), Error, "month is duplicated");

  const payment = form8941DirectFixture();
  payment.shop_review.employee_premium_reviews[0].monthly_premiums[0]
    .employer_payment = 418;
  assertThrows(
    () => calculateForm8941(payment),
    Error,
    "monthly employer contribution",
  );

  const reused = form8941DirectFixture();
  reused.shop_review.employee_premium_reviews[1].monthly_premiums[0]
    .shop_invoice_reference =
      reused.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .shop_invoice_reference;
  assertThrows(
    () => calculateForm8941(reused),
    Error,
    "invoice or payment is reused",
  );

  const total = form8941DirectFixture();
  total.employees[0].full_year_employee_only_shop_premium = 9998;
  assertThrows(
    () => calculateForm8941(total),
    Error,
    "monthly premiums differ",
  );
});

Deno.test("Form 8941 sends only its bounded direct source to Form 3800", () => {
  const result = f8941.compute(
    { taxYear: 2025, formType: "f1040" },
    form8941DirectFixture(),
  );
  assertEquals(result.outputs[0].fields.f8941_direct_employer_credit, {
    credit_amount: 11_698,
    schedule_c_business_reference: "SHOP-BUSINESS-1",
    shop_plan_reference: "SHOP-PLAN-1",
    subject_to_passive_activity_limit: false,
  });
  const generalBusiness = f3800.compute(
    { taxYear: 2025, formType: "f1040" },
    f3800.inputSchema.parse(result.outputs[0].fields),
  );
  assertEquals(
    (generalBusiness.outputs[0].fields.form3800_source_credits as {
      specifiedCredit: number;
    }).specifiedCredit,
    11_698,
  );
});

Deno.test("Form8941 part-year enrollment prorates average premiums, not annual payroll hours", async () => {
  const { form8941PartYearSource } = await import(
    "../../../2025/pdf/reviews/composed/review-8941-partyear.fixture.ts"
  );
  const source = form8941PartYearSource();
  const lines = calculateForm8941(source);
  assertEquals(lines.line1, 5);
  assertEquals(lines.line2, 3);
  assertEquals(lines.line3, 25000);
  assertEquals(lines.line4, 17000);
  assertEquals(lines.line5, 13257);
  assertEquals(lines.line16, 6629);
  assertEquals(lines.line13, 5);
  assertEquals(lines.line14, 3);
  // Rounding each fractional employee cap first would incorrectly report13258.
  const individuallyRounded = source.employees.reduce(
    (sum, e) =>
      sum +
      Math.round(
        9358 * .5 *
          (e.enrollment_period.last_month - e.enrollment_period.first_month +
            1) /
          12,
      ),
    0,
  );
  assertEquals(individuallyRounded, 13258);
});
Deno.test("Form8941 part-year rejects missing/extra months and inconsistent dated paid evidence", async () => {
  const { form8941PartYearSource } = await import(
    "../../../2025/pdf/reviews/composed/review-8941-partyear.fixture.ts"
  );
  const priorInvoice = form8941PartYearSource();
  priorInvoice.shop_review.employee_premium_reviews[0].monthly_premiums[0]
    .invoice_date = "2024-12-20";
  assertEquals(calculateForm8941(priorInvoice).line16, 6629);
  const invalidDate = form8941PartYearSource();
  invalidDate.shop_review.employee_premium_reviews[0].monthly_premiums[0]
    .payment_date = "2025-13-15";
  assertThrows(
    () => calculateForm8941(invalidDate),
    Error,
    "paid-tax-year dates",
  );
  const missing = form8941PartYearSource();
  missing.shop_review.employee_premium_reviews[0].monthly_premiums.pop();
  assertThrows(
    () => calculateForm8941(missing),
    Error,
    "coverage is incomplete",
  );
  const outside = form8941PartYearSource();
  outside.shop_review.employee_premium_reviews[0].monthly_premiums[0].month = 6;
  assertThrows(
    () => calculateForm8941(outside),
    Error,
    "dates differ from enrollment",
  );
  const period = form8941PartYearSource();
  period.employees[0].enrollment_period.coverage_start_date = "2025-07-15";
  assertThrows(() => calculateForm8941(period), Error, "whole calendar months");
  const wrongYear = form8941PartYearSource();
  wrongYear.shop_review.employee_premium_reviews[0].monthly_premiums[0]
    .payment_date = "2024-07-15";
  assertThrows(
    () => calculateForm8941(wrongYear),
    Error,
    "paid-tax-year dates",
  );
  const reused = form8941PartYearSource();
  reused.shop_review.employee_premium_reviews[1].monthly_premiums[0]
    .employer_payment_reference =
      reused.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .employer_payment_reference;
  assertThrows(() => calculateForm8941(reused), Error, "payment is reused");
});
Deno.test("Form8941 actual annual wages trigger the wage ceiling despite short enrollment", async () => {
  const { form8941PartYearSource } = await import(
    "../../../2025/pdf/reviews/composed/review-8941-partyear.fixture.ts"
  );
  const source = form8941PartYearSource();
  source.employees.forEach((e, i) => {
    e.social_security_medicare_wages = 50000;
    source.shop_review.employee_premium_reviews[i]
      .payroll_social_security_medicare_wages = 50000;
  });
  assertThrows(() => calculateForm8941(source), Error, "wage ceiling");
});

Deno.test("Form8941 sourced Albany family and mixed tier premiums use their own table columns", async () => {
  const { form8941FamilySource } = await import(
    "../../../2025/pdf/reviews/composed/review-8941-family.fixture.ts"
  );
  const family = calculateForm8941(form8941FamilySource(true));
  assertEquals(family.line1, 5);
  assertEquals(family.line2, 5);
  assertEquals(family.line3, 20000);
  assertEquals(family.line4, 72000);
  assertEquals(family.line5, 61318);
  assertEquals(family.line16, 30659);
  const mixed = calculateForm8941(form8941FamilySource());
  assertEquals(mixed.line4, 55200);
  assertEquals(mixed.line5, 46149);
  assertEquals(mixed.line16, 23075);
  const months = calculateForm8941(form8941FamilySource(false, true));
  assertEquals(months.line2, 3);
  assertEquals(months.line3, 25000);
  assertEquals(months.line4, 32400);
  assertEquals(months.line5, 27162);
  assertEquals(months.line16, 13581);
});
Deno.test("Form8941 family rejects mismatched tier table and dependent enrollment allocations", async () => {
  const { form8941FamilySource } = await import(
    "../../../2025/pdf/reviews/composed/review-8941-family.fixture.ts"
  );
  const table = form8941FamilySource();
  table.shop_review.irs_table_family_average_premium = 9358;
  assertThrows(() => calculateForm8941(table), Error, "table row");
  const membership = form8941FamilySource();
  membership.shop_review.employee_premium_reviews[0].monthly_premiums[0]
    .covered_dependent_references.push("other-employee-dependent");
  assertThrows(() => calculateForm8941(membership), Error, "dependents differ");
  const reused = form8941FamilySource();
  reused.employees[2].covered_dependents[0].dependent_ssn =
    reused.employees[0].covered_dependents[0].dependent_ssn;
  reused.shop_review.employee_premium_reviews[2].covered_dependents[0]
    .dependent_ssn = reused.employees[0].covered_dependents[0].dependent_ssn;
  assertThrows(() => calculateForm8941(reused), Error, "source is reused");
});
Deno.test("Form8941 composite tier billing reconciles equal tier/month premiums and uniform employer share", async () => {
  const { form8941FamilySource } = await import(
    "../../../2025/pdf/reviews/composed/review-8941-family.fixture.ts"
  );
  const source = form8941FamilySource();
  const invoice =
    source.shop_review.employee_premium_reviews[2].monthly_premiums[0];
  invoice.billed_premium += 20;
  invoice.employer_payment += 10;
  source.employees[2].tax_year_shop_premium += 20;
  source.employees[2].employer_premium_paid += 10;
  assertThrows(
    () => calculateForm8941(source),
    Error,
    "composite tier monthly premium",
  );
  const payment = form8941FamilySource();
  payment.shop_review.employee_premium_reviews[0].monthly_premiums[0]
    .employer_payment = 500;
  assertThrows(
    () => calculateForm8941(payment),
    Error,
    "monthly employer contribution",
  );
});
