import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { createReturnContext } from "../../../../../../core/validation/context.ts";
import { parseEmittedReturn } from "../../../../../../core/validation/emitted-documents.ts";
import { FIELD_REGISTRY } from "../../../field-registry.ts";
import { F1099R_RULES } from "./f1099r.ts";

function zipRulePasses(payerAddress: string): boolean {
  const xml =
    `<Return xmlns="http://www.irs.gov/efile"><ReturnHeader></ReturnHeader><ReturnData><IRS1099R documentId="IRS1099R1"><PayerUSAddress>${payerAddress}</PayerUSAddress></IRS1099R></ReturnData></Return>`;
  const emitted = parseEmittedReturn(xml);
  const context = createReturnContext(
    {},
    { primarySSN: "400001039", filingStatus: 1 },
    FIELD_REGISTRY,
    undefined,
    emitted,
    emitted.documents.find((document) => document.prefix === "F1099R"),
  );
  const rule = F1099R_RULES.find((entry) =>
    entry.ruleNumber === "F1099R-003-01"
  );
  if (!rule?.check) throw new Error("Missing rule F1099R-003-01");
  return rule.check(context);
}

test("F1099R-003-01 reads the filed payer ZIPCd element", () => {
  assertEquals(
    zipRulePasses(
      "<AddressLine1Txt>6000 Fremont Street</AddressLine1Txt><CityNm>Las Vegas</CityNm><StateAbbreviationCd>NV</StateAbbreviationCd><ZIPCd>89101</ZIPCd>",
    ),
    true,
  );
  assertEquals(
    zipRulePasses(
      "<AddressLine1Txt>6000 Fremont Street</AddressLine1Txt><CityNm>Las Vegas</CityNm><StateAbbreviationCd>NV</StateAbbreviationCd>",
    ),
    false,
  );
});
