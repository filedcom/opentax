import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { calculateBonus4562 } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/bonus.ts";
import { reconcileBonus4562 } from "../../../../mef/forms/deductions/business/f4562_bonus.ts";
import { form8911 } from "../../../../mef/forms/credits/business/f8911.ts";
import { form3800 } from "../../../../mef/forms/credits/business/f3800/f3800.ts";

import {
  bonusCreditInput,
  bonusFilerFixture,
} from "./form8911_bonus_fixture.ts";
export {
  bonusCreditInput,
  bonusFilerFixture,
} from "./form8911_bonus_fixture.ts";

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
