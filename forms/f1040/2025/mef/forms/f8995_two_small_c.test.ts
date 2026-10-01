import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { form8995Pdf } from "../../pdf/forms/f8995.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { form8995 } from "./f8995.ts";

function twoSmallBusinessInputs(secondProfit = 210) {
  const businessFixture = pdfReviewFixtures.find((item) =>
    item.id === "single-schedule-c"
  );
  const wageFixture = pdfReviewFixtures.find((item) =>
    item.id === "single-w2-refund"
  );
  if (!businessFixture || !wageFixture) {
    throw new Error("missing Schedule C or W-2 review fixture");
  }
  const originalBusinesses = businessFixture.inputs.schedule_c;
  const originalWages = wageFixture.inputs.w2;
  if (
    !Array.isArray(originalBusinesses) || originalBusinesses.length !== 1 ||
    !Array.isArray(originalWages) || originalWages.length !== 1
  ) throw new Error("expected one-business and one-wage source fixtures");
  const base = originalBusinesses[0];
  return {
    general: businessFixture.inputs.general,
    w2: [{
      ...originalWages[0],
      employee_ssn: "111-22-3333",
      employer_ein: "55-5555555",
      employer_name: "Wage Employer",
    }],
    schedule_c: [
      {
        ...base,
        business_reference: "small-repairs",
        line_c_business_name: "Small Repairs",
        line_d_ein: "12-3456789",
        line_1_gross_receipts: 140,
      },
      {
        ...base,
        business_reference: "small-services",
        line_c_business_name: "Small Services",
        line_d_ein: "98-7654321",
        line_1_gross_receipts: secondProfit,
      },
    ],
  };
}

function settled(secondProfit = 210) {
  return execute(
    buildExecutionPlan(registry),
    registry,
    twoSmallBusinessInputs(
      secondProfit,
    ),
    { taxYear: 2025, formType: "f1040" },
  );
}

Deno.test("two small Schedule C businesses occupy distinct Form 8995 native and PDF rows", () => {
  const result = settled();
  assertEquals(result.diagnostics, []);
  const { pending } = result;
  const fields = pending.form8995;
  assertEquals(pending.schedule1?.line3_schedule_c, 350);
  assertEquals(pending.schedule1?.line15_se_deduction ?? 0, 0);
  assertEquals(fields?.line1_qbi, 140);
  assertEquals(fields?.line1ii_qbi, 210);
  assertEquals(fields?.line2, 350);
  assertEquals(fields?.line15, 70);
  assertEquals(pending.f1040?.line13_qbi_deduction, 70);

  const xml = form8995.build(fields, { pending });
  assertEquals((xml.match(/<QualifiedBusinessIncomeDedGrp>/g) ?? []).length, 2);
  assertEquals(
    xml.includes("<BusinessNameLine1Txt>Small Repairs</BusinessNameLine1Txt>"),
    true,
  );
  assertEquals(
    xml.includes("<BusinessNameLine1Txt>Small Services</BusinessNameLine1Txt>"),
    true,
  );
  const pdf = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line1_business_name, "Small Repairs");
  assertEquals(pdf?.line1ii_business_name, "Small Services");
  assertEquals(pdf?.line1ii_ein, "987654321");
  assertEquals(pdf?.line2, 350);

  const changedSource = {
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      schedule_cs: twoSmallBusinessInputs().schedule_c.map((item, index) =>
        index === 1 ? { ...item, line_1_gross_receipts: 211 } : item
      ),
    },
  };
  const changedReturn = {
    ...pending,
    f1040: { ...pending.f1040, line13_qbi_deduction: 69 },
  };
  const form7206Source = pending.form7206?.schedule_c_source as {
    businesses: Array<Record<string, unknown>>;
    unadjusted_source: boolean;
  };
  const changedSourceJoin = {
    ...pending,
    form7206: {
      ...pending.form7206,
      schedule_c_source: {
        ...form7206Source,
        businesses: [
          form7206Source.businesses[0],
          {
            ...form7206Source.businesses[1],
            line31_net_profit: 211,
          },
        ],
      },
    },
  };
  const changedRows = { ...fields, line1ii_qbi: 211 };
  for (
    const [claim, graph] of [
      [fields, changedSource],
      [fields, changedReturn],
      [fields, changedSourceJoin],
      [changedRows, pending],
    ] as const
  ) {
    assertThrows(
      () =>
        form8995.build(claim as Parameters<typeof form8995.build>[0], {
          pending: graph,
        }),
      Error,
    );
    assertThrows(() => form8995Pdf.projectFields?.(claim, graph), Error);
  }
});

Deno.test("Form 8995 two-business route rejects profits entering Schedule SE", () => {
  const result = settled(260);
  assertEquals(result.diagnostics, []);
  assertThrows(
    () => form8995.build(result.pending.form8995, { pending: result.pending }),
    Error,
  );
  assertThrows(
    () => form8995Pdf.projectFields?.(result.pending.form8995, result.pending),
    Error,
  );
});
