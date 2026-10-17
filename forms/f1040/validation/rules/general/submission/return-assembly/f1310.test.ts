import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { emittedRulePasses } from "../../../../../../../core/test-utils/emitted-rule.ts";
import { F1310_RULES } from "./f1310.ts";

const checked = F1310_RULES.map((r) => ({ ...r, category: "incorrect_data" as const }));
const f1310 = (id: string, body: string) => `<IRS1310 documentId="${id}">${body}</IRS1310>`;
const claimant = (ssn: string, nameControl = "DOE") =>
  `<PersonNameControlTxt>${nameControl}</PersonNameControlTxt><RefundClaimantSSN>${ssn}</RefundClaimantSSN>`;

test("F1310-016 needs one refund claimant across Forms 1310", () => {
  const run = (documents: string) => emittedRulePasses(F1310_RULES, "F1310-016", { documents, forms: { form1310: 2 } });
  assertEquals(run(f1310("a", claimant("400021111")) + f1310("b", claimant("400021111"))), true);
  assertEquals(run(f1310("a", claimant("400021111")) + f1310("b", claimant("400031111"))), false);
});

test("F1310-023-02 needs the court certificate unless one was filed before", () => {
  const rep = f1310("a", "<CourtOrPersonalRepGrp><CourtOrPersonalRepInd>X</CourtOrPersonalRepInd></CourtOrPersonalRepGrp>");
  const certificate = '<BinaryAttachment documentId="b"><Desc>Personal Representative Court Certificate</Desc></BinaryAttachment>';
  const run = (documents: string) => emittedRulePasses(F1310_RULES, "F1310-023-02", { documents });
  assertEquals(run(rep + certificate), true);
  assertEquals(run(rep), false);
});

test("F1310-518 checks the claimant's SSN and name control", () => {
  const header = "<Filer><SpouseNameControlTxt>DOE</SpouseNameControlTxt></Filer>";
  const run = (body: string) =>
    emittedRulePasses(checked, "F1310-518", { header, documents: f1310("a", body), spouseSSN: "400031111", filingStatus: 3 });
  assertEquals(run(claimant("400031111")), true);
  assertEquals(run(claimant("400031111", "ROE")), false);
  assertEquals(run(claimant("400030000")), false);
  assertEquals(run(claimant("400041111", "do1")), false);
});
