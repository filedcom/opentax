import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F3800_RULES } from "./f3800.ts";

const f3800 = (body: string, extra = "") => `<IRS3800 documentId="c">${body}</IRS3800>${extra}`;

test("F3800-489 needs Form 8936 for a line 1y credit without a pass-through EIN", () => {
  const line = (ein: string) =>
    `<Form8936PartIICYCreditsGrp>${ein}<GeneralBusCrFromNnPssvActyAmt>130</GeneralBusCrFromNnPssvActyAmt></Form8936PartIICYCreditsGrp>`;
  const passes = (body: string, form8936: number) =>
    emittedRulePasses(F3800_RULES, "F3800-489", { documents: f3800(body), forms: { form8936 } });
  assertEquals(passes(line(""), 1), true);
  assertEquals(passes(line(""), 0), false);
  assertEquals(passes(line("<PassThroughEntityEIN>000000001</PassThroughEntityEIN>"), 0), true);
  // Another line's EIN is not this line's.
  assertEquals(
    passes(line("") + "<Form8835PartIICYCreditsGrp><PassThroughEntityEIN>000000001</PassThroughEntityEIN></Form8835PartIICYCreditsGrp>", 0),
    false,
  );
});

test("F3800-557 needs the transfer election statement for a line 1f transfer", () => {
  const body = "<Form8835PartIICYCreditsGrp><CreditTransferElectionAmt>13200</CreditTransferElectionAmt></Form8835PartIICYCreditsGrp>";
  const statement = '<BinaryAttachment documentId="b"><Desc>Transfer Election Statement</Desc></BinaryAttachment>';
  assertEquals(emittedRulePasses(F3800_RULES, "F3800-557", { documents: f3800(body, statement) }), true);
  assertEquals(emittedRulePasses(F3800_RULES, "F3800-557", { documents: f3800(body) }), false);
});

test("F3800-409 needs a non-zero Part III line 1 column (e) behind the line 2 subtotal", () => {
  const subtotal = "<GenBusCYCreditsSubTotGrp><GeneralBusCrFromNnPssvActyAmt>130</GeneralBusCrFromNnPssvActyAmt></GenBusCYCreditsSubTotGrp>";
  const line = "<Form8936PartIICYCreditsGrp><GeneralBusCrFromNnPssvActyAmt>130</GeneralBusCrFromNnPssvActyAmt></Form8936PartIICYCreditsGrp>";
  assertEquals(emittedRulePasses(F3800_RULES, "F3800-409", { documents: f3800(line + subtotal) }), true);
  assertEquals(emittedRulePasses(F3800_RULES, "F3800-409", { documents: f3800(subtotal) }), false);
});

test("F3800-406-01 caps each line 1k aggregate group at 150,000", () => {
  const group = (amount: number) =>
    `<Frm8882CYAggrgtAmtGrp><OthThnCrTrnsfrElectCrNoLmtAmt>${amount}</OthThnCrTrnsfrElectCrNoLmtAmt></Frm8882CYAggrgtAmtGrp>`;
  const passes = (body: string) => emittedRulePasses(F3800_RULES, "F3800-406-01", { documents: f3800(body) });
  assertEquals(passes(group(100) + group(150_000)), true);
  assertEquals(passes(group(100) + group(150_001)), false);
});

test("F3800-424 reads the line 5 subtotal group", () => {
  const body = (allowed: string) =>
    "<GenBusCYCreditsSubTot2Grp><GeneralBusCrFromNnPssvActyAmt>50</GeneralBusCrFromNnPssvActyAmt></GenBusCYCreditsSubTot2Grp>" + allowed;
  assertEquals(emittedRulePasses(F3800_RULES, "F3800-424", { documents: f3800(body("<AllwGenBusCrFromNonPssvActyAmt>50</AllwGenBusCrFromNonPssvActyAmt>")) }), true);
  assertEquals(emittedRulePasses(F3800_RULES, "F3800-424", { documents: f3800(body("")) }), false);
});
