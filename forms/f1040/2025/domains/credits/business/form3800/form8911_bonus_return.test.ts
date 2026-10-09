import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { inputSchema as form8911Schema } from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import { calculateBonus4562 } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/bonus.ts";
import { reconcileBonus4562 } from "../../../../mef/forms/deductions/business/f4562_bonus.ts";
import { form8911 } from "../../../../mef/forms/credits/business/f8911.ts";
import { form3800 } from "../../../../mef/forms/credits/business/f3800/f3800.ts";

export const bonusFilerFixture = pdfReviewFixtures.find((f) =>
  f.id === "single-personal-home-charger-credit"
)!;
export function bonusCreditInput(cost = 10000) {
  const original = form8911Schema.parse(bonusFilerFixture.inputs.f8911);
  const credit = cost * 0.06;
  const property = {
    ...original,
    cost,
    business_use_pct: 1,
    main_home_property: false,
    property_reference: "charger-1",
    property_description: "Business EV charger",
    business_source: {
      proprietor_ssn: "111223333",
      schedule_c_business_reference: "equipment-services",
      source_document_reference: "charger-invoice-1",
      section179_deduction: 0,
      rate_basis: "base" as const,
      subject_to_passive_activity_limit: false,
    },
  };
  const {
    regular_tax_before_credits: _regular,
    tentative_minimum_tax: _tmt,
    foreign_tax_credit: _foreign,
    certain_allowable_credits: _other,
    ...propertyOnly
  } = property;
  return {
    ...bonusFilerFixture.inputs,
    f8911: { properties: [propertyOnly] },
    schedule_c: [{
      line_a_principal_business: "Equipment services",
      line_b_business_code: "811310",
      line_f_accounting_method: "cash",
      business_reference: "equipment-services",
      proprietor_recipient: "T",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: cost - credit,
      line_13_depreciation: cost - credit,
    }],
    form4562: {
      bonus_asset: {
        business_reference: "equipment-services",
        activity_description: "Equipment services",
        asset_description: "Business EV charger",
        source_document_ref: "charger-invoice-1",
        proprietor_ssn: "111223333",
        acquired_date: "2025-02-01",
        placed_in_service_date: property.placed_in_service,
        cost,
        macrs_recovery_period_years: 5,
        qualification_review_reference: "new-equipment-MACRS-review",
        original_use_began_with_taxpayer: true,
        business_use_pct: 100,
        is_listed_property: false,
        required_to_use_ads: false,
        excluded_from_bonus_under_section168k: false,
        bonus_elected_out: false,
        reduced_bonus_election: false,
        section179_deduction: 0,
        no_other_depreciation_assets_on_return: true,
        return_asset_inventory_source_ref: "2025-single-asset-register",
        form8911_property_reference: "charger-1",
        credit_basis_reduction: credit,
      },
    },
  };
}

Deno.test("Form 8911 business credit and reduced bonus basis reach the prepared return together", async () => {
  for (
    const [cost, credit, allowed] of [[10000, 600, 600], [100000, 6000, 3875]]
  ) {
    const result = f1040_2025.executeReturn(bonusCreditInput(cost));
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.form4562.line14_special_depreciation_allowance,
      cost - credit,
    );
    assertEquals(result.pending.schedule1.line3_schedule_c, 0);
    assertEquals(result.pending.f1040.line11_agi, 50000);
    assertEquals(result.pending.f3800.allowed_credit, allowed);
    assertEquals(result.pending.schedule3.line6a_total, allowed);
    assertEquals(result.pending.f1040.line24_total_tax, 3875 - allowed);
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      bonusFilerFixture.filer,
    );
    const xml = prepared.bundle.xml;
    assertStringIncludes(
      xml,
      `<SpecialAllowanceAmt>${cost - credit}</SpecialAllowanceAmt>`,
    );
    assertStringIncludes(
      xml,
      `<BusinessInvstUsePartOfCrAmt>${credit}</BusinessInvstUsePartOfCrAmt>`,
    );
    const parentId = xml.match(/<IRS8911 documentId="([^"]+)"/)?.[1];
    assertEquals(typeof parentId, "string");
    assertStringIncludes(
      xml,
      `<Form8911PartICYCreditsGrp referenceDocumentId="${parentId}" referenceDocumentName="IRS8911">`,
    );
    assertStringIncludes(xml, "<IRS8911ScheduleA ");
    await prepared.renderPdf();
  }
});

Deno.test("Form 8911/4562 filing rejects conflicting basis, source, deduction and document links", async () => {
  const { pending } = f1040_2025.executeReturn(bonusCreditInput());
  for (
    const patch of [
      { credit_basis_reduction: 599 },
      { source_document_ref: "other-invoice" },
      { proprietor_ssn: "999887777" },
      { form8911_property_reference: "other-property" },
    ]
  ) {
    const changed = {
      ...pending,
      form4562: {
        ...pending.form4562,
        bonus_asset: { ...bonusCreditInput().form4562.bonus_asset, ...patch },
      },
    };
    assertThrows(() => reconcileBonus4562(changed.form4562, changed));
    await assertRejects(() =>
      f1040_2025.prepareReturn(changed, bonusFilerFixture.filer)
    );
  }
  const source = bonusCreditInput();
  const changedDeduction = f1040_2025.executeReturn({
    ...source,
    schedule_c: [{ ...source.schedule_c[0], line_13_depreciation: 10000 }],
  });
  await assertRejects(() =>
    f1040_2025.prepareReturn(changedDeduction.pending, bonusFilerFixture.filer)
  );
  assertThrows(() => form8911.build(pending.f8911), Error, "Form 3800 path");
  assertThrows(() =>
    form3800.build(pending.f3800, {
      pending,
      documentIdsByPendingKey: {},
      documentIdsByTag: {},
    })
  );
});

Deno.test("Form 4562 bonus eligibility rejects cutoff, election and ADS conflicts", () => {
  const asset = bonusCreditInput().form4562.bonus_asset;
  for (
    const patch of [
      { acquired_date: "2025-01-19" },
      { acquired_date: "2025-02-30" },
      { bonus_elected_out: true },
      { reduced_bonus_election: true },
      { required_to_use_ads: true },
      { macrs_recovery_period_years: 27 },
      { macrs_recovery_period_years: 4 },
      { is_listed_property: true },
    ]
  ) {
    assertThrows(() => calculateBonus4562({ ...asset, ...patch }));
  }
});

Deno.test("Form 4562 single bonus asset also reconciles without a property credit", async () => {
  const source = bonusCreditInput();
  const { f8911: _credit, ...withoutCredit } = source;
  const result = f1040_2025.executeReturn({
    ...withoutCredit,
    schedule_c: [{
      ...source.schedule_c[0],
      line_1_gross_receipts: 10000,
      line_13_depreciation: 10000,
    }],
    form4562: {
      bonus_asset: {
        ...source.form4562.bonus_asset,
        credit_basis_reduction: 0,
        form8911_property_reference: undefined,
      },
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4562.line22_total_depreciation, 10000);
  assertEquals(result.pending.f1040.line24_total_tax, 3875);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    bonusFilerFixture.filer,
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<SpecialAllowanceAmt>10000</SpecialAllowanceAmt>",
  );
  assertEquals(prepared.bundle.xml.includes("<IRS8911 "), false);
});
