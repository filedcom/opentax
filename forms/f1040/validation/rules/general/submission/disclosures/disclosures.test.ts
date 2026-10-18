import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { F7204_RULES } from "./f7204.ts";
import { F7211_RULES } from "./f7211.ts";
import { F7218_RULES } from "./f7218.ts";
import { F8082_RULES } from "./f8082.ts";
import { F8594_RULES } from "./f8594.ts";

const attachment = (desc: string) => `<BinaryAttachment documentId="b"><Desc>${desc}</Desc></BinaryAttachment>`;

test("F7204-002 needs Form 56 for a trustee or fiduciary", () => {
  const form = '<IRS7204 documentId="a"><TrusteeInd>X</TrusteeInd></IRS7204>';
  assertEquals(emittedRulePasses(F7204_RULES, "F7204-002", { documents: form + attachment("Form 56") }), true);
  assertEquals(emittedRulePasses(F7204_RULES, "F7204-002", { documents: form }), false);
});

test("F7211-002 and F7211-003 check each production group", () => {
  const grp = (credit: number, year = 2025) =>
    `<IRS7211 documentId="a"><CleanElectricityProdGrp><CalendarYr>${year}</CalendarYr><KilowattHrsQty>100000</KilowattHrsQty>` +
    `<InflationAdjustedCreditRtAmt>0.003</InflationAdjustedCreditRtAmt><CalculatedCreditAmt>${credit}</CalculatedCreditAmt></CleanElectricityProdGrp></IRS7211>`;
  assertEquals(emittedRulePasses(F7211_RULES, "F7211-002", { documents: grp(300) }), true);
  assertEquals(emittedRulePasses(F7211_RULES, "F7211-002", { documents: grp(400) }), false);
  assertEquals(emittedRulePasses(F7211_RULES, "F7211-003", { documents: grp(300, 2024) }), false);
});

test("F7218-001 multiplies emissions rate, gallons and inflation-adjusted amount", () => {
  const grp = (credit: number) =>
    `<IRS7218 documentId="a"><ClnAvnNonAvnFuelPrdcdSoldGrp><CalcFacilityEmissionsValueOrRt>0.5</CalcFacilityEmissionsValueOrRt>` +
    `<GallonsOrGallonsEquivalentQty>1000</GallonsOrGallonsEquivalentQty><InflationAdjFuelSoldAmt>1.06</InflationAdjFuelSoldAmt>` +
    `<ClnAvnNonAvnFuelProdCrAmt>${credit}</ClnAvnNonAvnFuelProdCrAmt></ClnAvnNonAvnFuelPrdcdSoldGrp></IRS7218>`;
  assertEquals(emittedRulePasses(F7218_RULES, "F7218-001", { documents: grp(530) }), true);
  assertEquals(emittedRulePasses(F7218_RULES, "F7218-001", { documents: grp(600) }), false);
});

test("F8082-006 needs the signature document when the AAR answer is No", () => {
  const form = '<IRS8082 documentId="a"><AARAdjImputedUnderpaymentInd>false</AARAdjImputedUnderpaymentInd></IRS8082>';
  assertEquals(emittedRulePasses(F8082_RULES, "F8082-006", { documents: form + attachment("8082 Signature Document") }), true);
  assertEquals(emittedRulePasses(F8082_RULES, "F8082-006", { documents: form }), false);
});

test("F8594-001-01 needs the consideration statement when line 6 is Yes", () => {
  const form = '<IRS8594 documentId="a"><PrchsOrEntrAgrmtWithSellrInd>true</PrchsOrEntrAgrmtWithSellrInd></IRS8594>';
  const statement = '<ConsiderationComputationStatement documentId="s"><Desc>x</Desc></ConsiderationComputationStatement>';
  assertEquals(emittedRulePasses(F8594_RULES, "F8594-001-01", { documents: form + statement }), true);
  assertEquals(emittedRulePasses(F8594_RULES, "F8594-001-01", { documents: form }), false);
});
