import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { IND_RULES } from "./ind.ts";

const dependent = (ssn: string, relationship: string, ctc: boolean) =>
  `<DependentDetail><DependentSSN>${ssn}</DependentSSN><DependentRelationshipCd>${relationship}</DependentRelationshipCd>` +
  (ctc ? "<EligibleForChildTaxCreditInd>X</EligibleForChildTaxCreditInd>" : "") + "</DependentDetail>";
const f1040 = (body: string) => `<IRS1040 documentId="a">${body}</IRS1040>`;

test("IND-154-02 rejects an ITIN only on the dependent claimed for the child tax credit", () => {
  const credit = "<CTCODCAmt>2200</CTCODCAmt>";
  assertEquals(
    emittedRulePasses(IND_RULES, "IND-154-02", {
      documents: f1040(dependent("400001057", "SON", true) + dependent("912701234", "PARENT", false) + credit),
    }),
    true,
  );
  assertEquals(
    emittedRulePasses(IND_RULES, "IND-154-02", {
      documents: f1040(dependent("912701234", "SON", true) + credit),
    }),
    false,
  );
});

test("IND-088 reads each dependent's own relationship code", () => {
  const passes = (documents: string) => emittedRulePasses(IND_RULES, "IND-088", { documents });
  assertEquals(passes(f1040(dependent("400001057", "SON", true) + dependent("400001058", "PARENT", false))), true);
  assertEquals(passes(f1040(dependent("400001058", "PARENT", true) + dependent("400001057", "SON", false))), false);
});

test("IND-298-01 counts Forms 1310 and court certificates for two deceased filers", () => {
  const ret = f1040("<PrimaryDeathDt>2025-05-01</PrimaryDeathDt><SpouseDeathDt>2025-07-01</SpouseDeathDt><RefundAmt>500</RefundAmt>");
  const certificate = '<BinaryAttachment documentId="b"><Desc>Personal Representative Court Certificate</Desc></BinaryAttachment>';
  const passes = (documents: string, form1310: number) =>
    emittedRulePasses(IND_RULES, "IND-298-01", { documents, filingStatus: 2, forms: { form1310 } });
  assertEquals(passes(ret + certificate, 1), true);
  assertEquals(passes(ret, 2), true);
  assertEquals(passes(ret + certificate, 0), false);
});
