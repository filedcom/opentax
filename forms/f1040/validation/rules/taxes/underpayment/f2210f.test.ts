import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../core/test-utils/emitted-rule.ts";
import { F2210F_RULES } from "./f2210f.ts";

test("F2210F-001 needs the waiver statement attached to line 16", () => {
  const form = (ref: string) =>
    `<IRS2210F documentId="f"><PenaltyWaiverRequestInd>X</PenaltyWaiverRequestInd><PenaltyAmt${ref}>10</PenaltyAmt></IRS2210F>`;
  const statement = '<WaiverExplanationStatement documentId="s"><ExplanationTxt>Casualty</ExplanationTxt></WaiverExplanationStatement>';
  assertEquals(emittedRulePasses(F2210F_RULES, "F2210F-001", { documents: form(' referenceDocumentId="s"') + statement }), true);
  assertEquals(emittedRulePasses(F2210F_RULES, "F2210F-001", { documents: form("") }), false);
});
