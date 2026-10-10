import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../2025/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { form8941PartYearInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-partyear.fixture.ts";
import { form8941PartMonthInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-partmonth.fixture.ts";
import { form8941TierChangeInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-tier-changes.fixture.ts";
import { form8941FarmShopInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-farm-shop.fixture.ts";
import { form8941IndependentSpouseInputs } from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-independent-spouses.fixture.ts";
import {
  calculateForm8941,
  independentSpouseForm8941,
} from "../../../../nodes/inputs/credits/health/f8941/index.ts";
import { form8941AveragePremiums } from "../../../../nodes/inputs/credits/health/f8941/average-premiums.ts";
import { multiplePlanWorksheet } from "../../../../nodes/inputs/credits/health/f8941/multiple_plans.ts";
import { form8941Pdf } from "../../../../2025/pdf/forms/credits/health/f8941.ts";

// These are synthetic employer locations; household mailing addresses are independent.
const scenarios = [
  {
    name: "partial-year",
    inputs: form8941PartYearInputs,
    areas: [["AK", "Anchorage"]],
  },
  {
    name: "partial-month",
    inputs: form8941PartMonthInputs,
    areas: [["CA", "Los Angeles"]],
  },
  {
    name: "tier-change",
    inputs: form8941TierChangeInputs,
    areas: [["WY", "Albany"]],
  },
  { name: "farm", inputs: form8941FarmShopInputs, areas: [["TX", "Travis"]] },
  {
    name: "spouse-locations",
    inputs: form8941IndependentSpouseInputs,
    areas: [["NJ", "Essex"], ["AK", "Anchorage"]],
  },
];
for (const scenario of scenarios) {
  Deno.test(`SHOP geographic ${scenario.name} retains periods, owners and complete export joins`, async () => {
    const inputs: any = JSON.parse(JSON.stringify(scenario.inputs()));
    // Fixture-only oracle metadata is not a public filing input.
    delete inputs.expected;
    const members = inputs.f8941.independent_members ?? [inputs.f8941];
    const expectedCaps: number[] = [];
    const memberLines = () =>
      inputs.f8941.independent_members
        ? independentSpouseForm8941(inputs.f8941).lines
        : [calculateForm8941(inputs.f8941)];
    for (const [index, source] of members.entries()) {
      const [state, county] = scenario.areas[index];
      const rates = form8941AveragePremiums(state, county);
      const before = memberLines()[index];
      // Hold actual contribution percentages, dates and enrollment fixed while
      // independently rescaling each tier's existing qualified contribution share.
      const expectedCap = "monthly_plan_arrangements" in source
        ? multiplePlanWorksheet(source).rows.reduce((sum, row) =>
          sum +
          row.adjusted_average_premium /
            (row.coverage_tier === "family" ? 24527 : 9358) *
            (row.coverage_tier === "family"
              ? rates.family
              : rates.employeeOnly), 0)
        // This fixture retains exactly 34 enrolled employee-months at 50%.
        : rates.employeeOnly * 34 / 12 * .5;
      expectedCaps.push(Math.round(expectedCap));
      Object.assign(source.shop_review, {
        irs_table_state: state,
        irs_table_county: county,
        irs_table_employee_only_average_premium: rates.employeeOnly,
        ...(source.shop_review.irs_table_family_average_premium === undefined
          ? {}
          : {
            irs_table_family_average_premium: rates.family,
          }),
      });
      for (const employee of source.employees) {
        Object.assign(employee, {
          rating_area_state: state,
          rating_area_county: county,
          irs_2025_rating_area_average_premium:
            employee.coverage_tier === "family"
              ? rates.family
              : rates.employeeOnly,
        });
      }
      const after = memberLines()[index];
      assertEquals(after.line5, expectedCaps[index]);
      for (
        const key of [
          "line1",
          "line2",
          "line3",
          "line4",
          "line13",
          "line14",
        ] as const
      ) {
        assertEquals(
          after[key],
          before[key],
          `${scenario.name}: geography must not change payroll or enrollment`,
        );
      }
    }
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const filer = extractFilerIdentity(inputs.general)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending: any = prepared.bundle.pending;
    const lines = memberLines();
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8941\b/g) ?? []).length,
      members.length,
    );
    for (const line of lines) {
      assertStringIncludes(
        prepared.bundle.xml,
        `<SumSmllrAmtAndCreditForHIPAmt>${line.line16}</SumSmllrAmtAndCreditForHIPAmt>`,
      );
    }
    const projected = form8941Pdf.projectFields!(pending.f8941, pending);
    assertEquals(projected.line5, expectedCaps[0]);
    assertEquals(projected.line16, lines[0].line16);
    const copies = form8941Pdf.instances!(
      projected,
      filer,
      pending,
      prepared.bundle.form3800Parts,
    );
    assertEquals(copies.length, members.length);
    copies.forEach((copy, index) => {
      assertEquals(copy.owner_ssn, members[index].owner_ssn);
      assertEquals(copy.employment_ein, members[index].employment_ein);
      assertEquals(copy.line5, expectedCaps[index]);
      assertEquals(copy.line16, lines[index].line16);
    });
    for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
      for (
        const mutate of [
          (source: any) =>
            source.shop_review.irs_table_employee_only_average_premium = 9358,
          (source: any) =>
            source.employees[0].rating_area_county = "Wrong County",
          (source: any) => source.shop_review.irs_table_state = "HI",
        ]
      ) {
        const bad = structuredClone(pending);
        mutate((bad.f8941.independent_members ?? [bad.f8941])[memberIndex]);
        await assertRejects(() => f1040_2025.prepareReturn(bad, filer));
        assertThrows(() => form8941Pdf.projectFields!(bad.f8941, bad));
      }
    }
    let evidence: string | undefined;
    try {
      evidence = Deno.env.get("FORM8941_GEOGRAPHIC_ROUTES_EVIDENCE");
    } catch { /* Optional local evidence. */ }
    if (evidence) {
      await Deno.mkdir(evidence, { recursive: true });
      await Deno.writeTextFile(
        `${evidence}/${scenario.name}.xml`,
        prepared.bundle.xml,
      );
      await Deno.writeTextFile(
        `${evidence}/${scenario.name}.json`,
        JSON.stringify(
          { inputs, filer, pending, lines, expectedCaps, projected },
          null,
          2,
        ),
      );
    }
  });
}
