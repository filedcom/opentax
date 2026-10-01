import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8941, f8941 } from "./index.ts";
import { form8941DirectFixture } from "./fixture.ts";

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
  const source = form8941DirectFixture();
  source.employees = Array.from({ length: 11 }, (_, index) => ({
    ...source.employees[0],
    employee_reference: `EMP-${index + 1}`,
    enrollment_and_payroll_record_reference: `SHOP-PAYROLL-${index + 1}`,
    social_security_medicare_wages: 34_000,
  }));
  source.shop_review.employee_premium_reviews = Array.from(
    { length: 11 },
    (_, index) => ({
      ...source.shop_review.employee_premium_reviews[0],
      employee_reference: `EMP-${index + 1}`,
      enrollment_and_payroll_record_reference: `SHOP-PAYROLL-${index + 1}`,
      monthly_premiums: source.shop_review.employee_premium_reviews[0]
        .monthly_premiums.map((month) => ({
          ...month,
          shop_invoice_reference: `SHOP-INV-${index + 1}-${month.month}`,
          employer_payment_reference: `SHOP-PAID-${index + 1}-${month.month}`,
        })),
    }),
  );
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
  assertThrows(() => calculateForm8941(table), Error, "not authenticated");

  const area = form8941DirectFixture();
  area.shop_review.irs_table_county = "Albany County";
  assertThrows(() => calculateForm8941(area), Error, "not authenticated");

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

Deno.test("Form 8941 source remains closed to public Schedule 3 output", () => {
  assertThrows(
    () =>
      f8941.compute(
        { taxYear: 2025, formType: "f1040" },
        form8941DirectFixture(),
      ),
    Error,
    "Form 3800 source reconciliation before export",
  );
});
