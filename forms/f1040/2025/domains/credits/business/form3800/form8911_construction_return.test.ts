import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import {
  constructionCreditInput,
  constructionInventoryInput,
} from "./form8911_construction_fixture.ts";
import { bonusFilerFixture } from "./form8911_bonus_fixture.ts";
import { assertConstructionReview } from "../../../../../nodes/inputs/credits/business/f8911/construction-review.ts";

Deno.test("Construction-exception credits reconcile rate, cap, bonus basis, SE and QBI in full returns", async () => {
  for (
    const [cost, credit, allowed, physicalWork] of [
      [10000, 3000, 3000, true],
      [100000, 30000, 4763, false],
      [400000, 100000, 4763, true],
    ] as const
  ) {
    const input = constructionCreditInput(cost, physicalWork);
    const before = JSON.stringify(input);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const p = result.pending;
    assertEquals(
      p.form4562.line14_special_depreciation_allowance,
      cost - credit,
    );
    assertEquals(p.f1040.line11_agi, 59293);
    assertEquals(p.f1040.line13_qbi_deduction, 1859);
    assertEquals(p.f1040.line16_income_tax, 4763);
    assertEquals(p.f1040.line23_other_taxes, 1413);
    assertEquals(p.f3800.allowed_credit, allowed);
    assertEquals(p.f1040.line24_total_tax, 6176 - allowed);
    const prepared = await f1040_2025.prepareReturn(p, bonusFilerFixture.filer);
    assertStringIncludes(
      prepared.bundle.xml,
      `<BusinessInvstUsePartOfCrAmt>${credit}</BusinessInvstUsePartOfCrAmt>`,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      "<PWARequirementMetInd>false</PWARequirementMetInd>",
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<SpecialAllowanceAmt>${cost - credit}</SpecialAllowanceAmt>`,
    );
    assertEquals(prepared.bundle.xml.includes("<IRS7220"), false);
    await prepared.renderPdf();
    assertEquals(JSON.stringify(input), before);
  }
});

Deno.test("Construction exception rejects missing or conflicting reviewed facts before filing", async () => {
  const input = constructionCreditInput();
  const property = input.f8911.properties[0];
  const review = property.business_source.construction_review;
  for (
    const patch of [
      { property_references: ["unrelated-property"] },
      { construction_start_date: "2023-01-29" },
      { construction_start_date: "2023-02-30" },
      { continuity: { ...review.continuity, through_date: "2025-05-31" } },
      { reviewed_on: "2025-05-31" },
      { start: { ...review.start, source_references: [] } },
    ]
  ) {
    assertThrows(() =>
      assertConstructionReview(
        { ...review, ...patch },
        property.property_reference,
        property.construction_began,
        property.placed_in_service,
      )
    );
  }
  const fivePercent =
    constructionCreditInput(100000, false).f8911.properties[0].business_source
      .construction_review;
  assertThrows(() =>
    assertConstructionReview(
      {
        ...fivePercent,
        start: { ...fivePercent.start, cost_paid_or_incurred_by_start: 9999 },
      },
      property.property_reference,
      property.construction_began,
      property.placed_in_service,
    )
  );
  const result = f1040_2025.executeReturn({
    ...input,
    f8911: {
      properties: [{
        ...property,
        business_source: {
          ...property.business_source,
          construction_review: undefined,
        },
      }],
    },
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(result.pending, bonusFilerFixture.filer)
  );
});

Deno.test("Construction projects reconcile shared and mixed-rate property inventories", async () => {
  for (const mixed of [false, true]) {
    const r = f1040_2025.executeReturn(constructionInventoryInput(mixed));
    assertEquals(r.diagnostics, []);
    assertEquals(r.pending.f3800.allowed_credit, 3875);
    assertEquals(r.pending.f1040.line24_total_tax, 0);
    const prepared = await f1040_2025.prepareReturn(
      r.pending,
      bonusFilerFixture.filer,
    );
    assertStringIncludes(
      prepared.bundle.xml,
      `<BusinessInvstUsePartOfCrAmt>${
        mixed ? 4200 : 9000
      }</BusinessInvstUsePartOfCrAmt>`,
    );
    assertEquals((prepared.bundle.xml.match(/<IRS4562 /g) ?? []).length, 2);
    assertEquals(
      (prepared.bundle.xml.match(/<IRS8911ScheduleA /g) ?? []).length,
      2,
    );
    await prepared.renderPdf();
  }
  const input = constructionInventoryInput();
  const second = input.f8911.properties[1];
  const altered = {
    ...input,
    f8911: {
      properties: [input.f8911.properties[0], {
        ...second,
        business_source: {
          ...second.business_source,
          construction_review: {
            ...constructionCreditInput().f8911.properties[0].business_source
              .construction_review,
            property_references: ["charger-1", "charger-2"],
            reviewed_by: "Conflicting review",
          },
        },
      }],
    },
  };
  const result = f1040_2025.executeReturn(altered);
  await assertRejects(() =>
    f1040_2025.prepareReturn(result.pending, bonusFilerFixture.filer)
  );
});
