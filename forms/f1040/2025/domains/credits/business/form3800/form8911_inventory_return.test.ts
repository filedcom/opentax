import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { form4562Pdf } from "../../../../pdf/forms/deductions/business/f4562.ts";
import { f1040_2025 } from "../../../../index.ts";
import {
  bonusCreditInput,
  bonusFilerFixture,
} from "./form8911_bonus_fixture.ts";
import { calculateBonusInventory } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/bonus.ts";

export function bonusInventoryInput(
  separateBusinesses = false,
  costs = [10000, 20000],
) {
  const source = bonusCreditInput();
  const {
    no_other_depreciation_assets_on_return,
    return_asset_inventory_source_ref,
    ...asset
  } = source.form4562.bonus_asset;
  const assets = costs.map((cost, i) => ({
    ...asset,
    asset_reference: `asset-${i + 1}`,
    form8911_property_reference: `charger-${i + 1}`,
    business_reference: separateBusinesses
      ? `business-${i + 1}`
      : asset.business_reference,
    activity_description: separateBusinesses
      ? `Equipment services ${i + 1}`
      : asset.activity_description,
    source_document_ref: `invoice-${i + 1}`,
    asset_description: `Business charger ${i + 1}`,
    cost,
    credit_basis_reduction: cost * 0.06,
  }));
  const refs = [...new Set(assets.map((a) => a.business_reference))];
  return {
    ...source,
    form4562: {
      bonus_inventory: {
        assets,
        no_other_depreciation_assets_on_return,
        return_asset_inventory_source_ref,
      },
    },
    f8911: {
      properties: assets.map((a) => ({
        ...source.f8911.properties[0],
        property_reference: a.form8911_property_reference,
        property_description: a.asset_description,
        cost: a.cost,
        business_source: {
          ...source.f8911.properties[0].business_source,
          schedule_c_business_reference: a.business_reference,
          source_document_reference: a.source_document_ref,
        },
      })),
    },
    schedule_c: refs.map((ref) => {
      const items = assets.filter((a) => a.business_reference === ref);
      const deduction = items.reduce(
        (sum, a) => sum + a.cost - a.credit_basis_reduction,
        0,
      );
      return {
        ...source.schedule_c[0],
        business_reference: ref,
        line_a_principal_business: items[0].activity_description,
        line_1_gross_receipts: deduction,
        line_13_depreciation: deduction,
      };
    }),
  };
}

Deno.test("Form 8911 inventory groups depreciation per activity and limits only the current credit", async () => {
  for (
    const [separate, costs, allowed] of [
      [false, [10000, 20000], 1800],
      [true, [10000, 20000], 1800],
      [true, [100000, 10000], 3875],
    ] as const
  ) {
    const result = f1040_2025.executeReturn(
      bonusInventoryInput(separate, [...costs]),
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule1.line3_schedule_c, 0);
    assertEquals(result.pending.f3800.allowed_credit, allowed);
    assertEquals(result.pending.f1040.line24_total_tax, 3875 - allowed);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      bonusFilerFixture.filer,
    );
    const xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS4562 /g) ?? []).length, separate ? 2 : 1);
    assertEquals((xml.match(/<IRS8911ScheduleA /g) ?? []).length, 2);
    assertEquals((xml.match(/<IRS8911 /g) ?? []).length, 1);
    for (const amount of separate ? costs.map((cost) => cost * .94) : [28200]) {
      assertStringIncludes(
        xml,
        `<SpecialAllowanceAmt>${amount}</SpecialAllowanceAmt>`,
      );
      assertStringIncludes(
        xml,
        `<TotalDepreciationAmt>${amount}</TotalDepreciationAmt>`,
      );
    }
    const parentId = xml.match(/<IRS8911 documentId="([^"]+)"/)?.[1];
    assertStringIncludes(
      xml,
      `<Form8911PartICYCreditsGrp referenceDocumentId="${parentId}" referenceDocumentName="IRS8911">`,
    );
    await prepared.renderPdf();
  }
});

Deno.test("Form 4562 inventory rejects duplicate identities and incomplete eligibility", () => {
  const inventory = bonusInventoryInput().form4562.bonus_inventory;
  for (
    const patch of [
      { asset_reference: inventory.assets[0].asset_reference },
      {
        form8911_property_reference:
          inventory.assets[0].form8911_property_reference,
      },
      { acquired_date: "2025-01-19" },
      { activity_description: "Conflicting business name" },
      { proprietor_ssn: "999887777" },
    ]
  ) {
    assertThrows(() =>
      calculateBonusInventory({
        ...inventory,
        assets: [inventory.assets[0], { ...inventory.assets[1], ...patch }],
      })
    );
  }
  assertThrows(() =>
    calculateBonusInventory({
      ...inventory,
      no_other_depreciation_assets_on_return: false,
    })
  );
});

Deno.test("Form 8911 inventory rejects missing, swapped and unrepresented property and business sources", async () => {
  const input = bonusInventoryInput(true);
  const first = input.form4562.bonus_inventory.assets[0];
  const second = input.form4562.bonus_inventory.assets[1];
  const variations = [
    {
      ...input,
      form4562: {
        bonus_inventory: { ...input.form4562.bonus_inventory, assets: [first] },
      },
    },
    { ...input, f8911: { properties: [input.f8911.properties[0]] } },
    ...[
      { source_document_ref: "wrong-invoice" },
      {
        business_reference: first.business_reference,
        activity_description: first.activity_description,
      },
      { credit_basis_reduction: 1199 },
      { proprietor_ssn: "999887777" },
    ].map((patch) => ({
      ...input,
      form4562: {
        bonus_inventory: {
          ...input.form4562.bonus_inventory,
          assets: [first, { ...second, ...patch }],
        },
      },
    })),
    {
      ...input,
      schedule_c: input.schedule_c.map((c, i) => ({
        ...c,
        line_13_depreciation: i === 0 ? 9401 : 18799,
      })),
    },
  ];
  for (const changed of variations) {
    const { pending } = f1040_2025.executeReturn(changed);
    await assertRejects(() =>
      f1040_2025.prepareReturn(pending, bonusFilerFixture.filer)
    );
  }
});

Deno.test("Form 4562 inventory includes ordinary equipment without duplicating charger credits", async () => {
  const input = bonusInventoryInput();
  const { form8911_property_reference: _link, ...ordinary } =
    input.form4562.bonus_inventory.assets[1];
  const changed = {
    ...input,
    f8911: { properties: [input.f8911.properties[0]] },
    form4562: {
      bonus_inventory: {
        ...input.form4562.bonus_inventory,
        assets: [input.form4562.bonus_inventory.assets[0], {
          ...ordinary,
          credit_basis_reduction: 0,
        }],
      },
    },
    schedule_c: [{
      ...input.schedule_c[0],
      line_1_gross_receipts: 29400,
      line_13_depreciation: 29400,
    }],
  };
  const { pending, diagnostics } = f1040_2025.executeReturn(changed);
  assertEquals(diagnostics, []);
  assertEquals(pending.f3800.allowed_credit, 600);
  const prepared = await f1040_2025.prepareReturn(
    pending,
    bonusFilerFixture.filer,
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalDepreciationAmt>29400</TotalDepreciationAmt>",
  );
  assertEquals(
    (prepared.bundle.xml.match(/<IRS8911ScheduleA /g) ?? []).length,
    1,
  );
  const filed = calculateBonusInventory(changed.form4562.bonus_inventory);
  await assertRejects(() =>
    f1040_2025.prepareReturn({
      ...pending,
      form4562: {
        ...filed,
        bonus_activities: [{
          ...filed.bonus_activities[0],
          line22_total_depreciation: 30000,
        }],
      },
    }, bonusFilerFixture.filer)
  );
});

Deno.test("Form 4562 inventory PDF copies retain the asset proprietor without W-2 evidence", () => {
  const filed = calculateBonusInventory(
    bonusInventoryInput(true).form4562.bonus_inventory,
  );
  const copies = form4562Pdf.instances!(filed, bonusFilerFixture.filer, {});
  assertEquals(copies.length, 2);
  assertEquals(copies.map((c) => c.line22_total_depreciation), [9400, 18800]);
  assertThrows(
    () =>
      form4562Pdf.instances!(filed, {
        ...bonusFilerFixture.filer,
        primarySSN: "999887777",
      }, {}),
    Error,
    "asset proprietor",
  );
});
