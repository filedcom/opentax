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
