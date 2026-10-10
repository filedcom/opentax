import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../2025/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { form8941OwnedInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-owned.fixture.ts";
import { form8941FamilyInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-family.fixture.ts";
import { form8941MultiplePlanInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-multiple-plans.fixture.ts";
import { form8941Pdf } from "../../../../2025/pdf/forms/credits/health/f8941.ts";
import { calculateForm8941 } from "../../../../nodes/inputs/credits/health/f8941/index.ts";
import { form8941AveragePremiums } from "../../../../nodes/inputs/credits/health/f8941/average-premiums.ts";
import { multiplePlanWorksheet } from "../../../../nodes/inputs/credits/health/f8941/multiple_plans.ts";

const cases = [
  {
    state: "NY",
    county: "Bronx",
    inputs: () => form8941OwnedInputs(),
    cap: 29178,
    credit: 12500,
  },
  {
    state: "TX",
    county: "Travis",
    inputs: () => form8941FamilyInputs(),
    cap: 40223,
    credit: 20112,
  },
  {
    state: "NJ",
    county: "Essex",
    inputs: () => form8941MultiplePlanInputs("reference-list"),
  },
];
for (const scenario of cases) {
  Deno.test(`SHOP ${scenario.state}/${scenario.county} table reaches complete native and PDF projection`, async () => {
    const original = scenario.inputs() as any;
    const priorRows = "monthly_plan_arrangements" in original.f8941
      ? multiplePlanWorksheet(original.f8941).rows
      : undefined;
    // New synthetic issued/source identifiers remain consistent across the source inventory.
    const inputs = JSON.parse(
      JSON.stringify(original).replaceAll("NY-SHOP", `${scenario.state}-SHOP`),
    );
    const source = inputs.f8941;
    const rates = form8941AveragePremiums(scenario.state, scenario.county);
    Object.assign(source.shop_review, {
      irs_table_state: scenario.state,
      irs_table_county: scenario.county,
      irs_table_employee_only_average_premium: rates.employeeOnly,
      ...(source.shop_review.irs_table_family_average_premium === undefined
        ? {}
        : { irs_table_family_average_premium: rates.family }),
    });
    for (const e of source.employees) {
      Object.assign(e, {
        rating_area_state: scenario.state,
        rating_area_county: scenario.county,
        irs_2025_rating_area_average_premium: e.coverage_tier === "family"
          ? rates.family
          : rates.employeeOnly,
      });
    }
    const lines = calculateForm8941(source);
    if (scenario.cap !== undefined) {
      assertEquals(lines.line5, scenario.cap);
      assertEquals(lines.line16, scenario.credit);
    } else {
      // Only geography changed: each month's prior qualified contribution share is retained.
      const expected = priorRows!.reduce(
        (sum, row) =>
          sum + row.adjusted_average_premium /
            (row.coverage_tier === "family" ? 24527 : 9358) *
            (row.coverage_tier === "family" ? 27428 : 9236),
        0,
      );
      assertEquals(lines.line5, Math.round(expected));
    }
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(inputs.general)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<SumSmllrAmtAndCreditForHIPAmt>${lines.line16}</SumSmllrAmtAndCreditForHIPAmt>`,
    );
    const pending = prepared.bundle.pending as any;
    const projected = form8941Pdf.projectFields!(pending.f8941, pending);
    assertEquals(projected.line5, lines.line5);
    assertEquals(projected.line16, lines.line16);
    let evidence: string | undefined;
    try {
      evidence = Deno.env.get("FORM8941_RATING_EVIDENCE");
    } catch { /* Optional evidence only. */ }
    if (evidence) {
      await Deno.mkdir(evidence, { recursive: true });
      await Deno.writeTextFile(
        `${evidence}/${scenario.state}.xml`,
        prepared.bundle.xml,
      );
      await Deno.writeTextFile(
        `${evidence}/${scenario.state}.json`,
        JSON.stringify({ inputs, filer, pending, lines, projected }, null, 2),
      );
    }

    for (
      const mutate of [
        (p: any) =>
          p.f8941.shop_review.irs_table_employee_only_average_premium++,
        (p: any) => p.f8941.employees[0].rating_area_county = "Wrong County",
        (p: any) => p.f8941.shop_review.irs_table_state = "HI",
      ]
    ) {
      const bad = structuredClone(pending);
      mutate(bad);
      await assertRejects(() => f1040_2025.prepareReturn(bad, filer));
      assertThrows(() => form8941Pdf.projectFields!(bad.f8941, bad));
    }
  });
}
