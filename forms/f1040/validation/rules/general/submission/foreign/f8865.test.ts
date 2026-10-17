import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { F8838P_RULES } from "./f8838p.ts";
import { F8865_RULES } from "./f8865.ts";
import { SCHK2K3_RULES } from "./schk2k3.ts";
import { SK1_RULES } from "./sk1.ts";

const f8865 = (body: string, refs = "") =>
  `<IRS8865 documentId="P"${refs ? ` referenceDocumentId="${refs}"` : ""}>${body}</IRS8865>`;

test("F8865-205-01 needs Schedule B line 7's own statement reference", () => {
  const line7 = (ref: string) =>
    `<IRS8865ScheduleB><OtherIncomeLossAmt referenceDocumentId="${ref}">10</OtherIncomeLossAmt></IRS8865ScheduleB>`;
  const statement = `<ItemizedOtherIncomeLossSch documentId="S"></ItemizedOtherIncomeLossSch>`;
  const passes = (documents: string) =>
    emittedRulePasses(F8865_RULES, "F8865-205-01", { documents });
  assertEquals(passes(f8865(line7("S")) + statement), true);
  assertEquals(passes(f8865(line7("S"))), false);
  // Schedule K line 11 naming the statement does not attach it to Schedule B.
  const scheduleK =
    `<IRS8865ScheduleB><OtherIncomeLossAmt>10</OtherIncomeLossAmt></IRS8865ScheduleB>` +
    `<IRS8865ScheduleK><OtherIncomeLossAmt referenceDocumentId="S">10</OtherIncomeLossAmt></IRS8865ScheduleK>`;
  assertEquals(passes(f8865(scheduleK) + statement), false);
});

test("F8865-193-01 and F8865-202-03", () => {
  const k1 = `<IRS8865ScheduleK1 documentId="K1"></IRS8865ScheduleK1>`;
  const filer2 = `<CategoryOfFiler2Ind>X</CategoryOfFiler2Ind>`;
  assertEquals(emittedRulePasses(F8865_RULES, "F8865-193-01", { documents: f8865(filer2, "K1") + k1 }), true);
  assertEquals(emittedRulePasses(F8865_RULES, "F8865-193-01", { documents: f8865(filer2) }), false);
  const ein = (v: string) =>
    f8865(`<ForeignPartnershipEIN>${v}</ForeignPartnershipEIN><FileForm1065Ind>X</FileForm1065Ind>`);
  assertEquals(emittedRulePasses(F8865_RULES, "F8865-202-03", { documents: ein("981234567") }), true);
  assertEquals(emittedRulePasses(F8865_RULES, "F8865-202-03", { documents: ein("071234567") }), false);
});

test("SK1-F8865-001 and SCHK2K3-001 count referencing parents", () => {
  const k1 = `<IRS8865ScheduleK1 documentId="K1"></IRS8865ScheduleK1>`;
  assertEquals(emittedRulePasses(SK1_RULES, "SK1-F8865-001", { documents: f8865("", "K1") + k1 }), true);
  assertEquals(emittedRulePasses(SK1_RULES, "SK1-F8865-001", { documents: f8865("") + k1 }), false);
  const stmt = `<SchedulesK2K31118ScheduleIStmt documentId="S"></SchedulesK2K31118ScheduleIStmt>`;
  const k2 = (id: string) =>
    `<IRS8865ScheduleK2 documentId="${id}"><Ind referenceDocumentId="S">X</Ind></IRS8865ScheduleK2>`;
  assertEquals(emittedRulePasses(SCHK2K3_RULES, "SCHK2K3-001", { documents: k2("A") + stmt }), true);
  assertEquals(emittedRulePasses(SCHK2K3_RULES, "SCHK2K3-001", { documents: k2("A") + k2("B") + stmt }), false);
});

test("F8838P-001 needs the signature attachment", () => {
  const form = `<IRS8838P documentId="P"></IRS8838P>`;
  const attachment = `<BinaryAttachment documentId="B"><Desc>8838P Signature Document</Desc></BinaryAttachment>`;
  assertEquals(emittedRulePasses(F8838P_RULES, "F8838P-001", { documents: form + attachment }), true);
  assertEquals(emittedRulePasses(F8838P_RULES, "F8838P-001", { documents: form }), false);
});
