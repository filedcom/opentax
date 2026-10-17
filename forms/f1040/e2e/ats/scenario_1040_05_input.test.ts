import { test } from "bun:test";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { sha256Hex } from "../../2025/return-processing/prepared-source.ts";
import {
  cliExport,
  exportedReturn,
  validateAgainstXsd,
  xsdAvailable,
} from "./ats-export.ts";
import {
  scenario104005Input,
  scenario104005RetainedSourceDocuments,
  SCENARIO_1040_05_ASSUMPTIONS,
  SCENARIO_1040_05_RECONCILIATION,
} from "./scenario_1040_05_input.ts";
import { TY2025_ATS_CASES } from "./ty2025_cases.ts";

const recon = SCENARIO_1040_05_RECONCILIATION;

test("ATS 1040 Scenario 5 calculates the packet's household, credits and storage fees", async () => {
  const { result } = await exportedReturn(
    scenario104005Input(),
    [],
    scenario104005RetainedSourceDocuments(),
  );
  const form = result.pending.f1040;
  assertEquals(form.line1a_wages, recon.form1040Line1aWages);
  assertEquals(form.line25a_w2_withheld, recon.form1040Line25aWithholding);
  assertEquals(
    result.pending.schedule1.line14_moving_expenses,
    recon.schedule1Line14StorageFees,
  );
  assertEquals(form.line11_agi, recon.form1040Line11Agi);
  assertEquals(
    form.line12a_standard_deduction,
    recon.form1040Line12StandardDeduction,
  );
  assertEquals(form.line15_taxable_income, recon.form1040Line15TaxableIncome);
  assertEquals(form.line16_income_tax, recon.form1040Line18Tax);
  assertEquals(
    result.pending.schedule3.line2_childcare_credit,
    recon.schedule3Line2DependentCare,
  );
  assertEquals(form.line19_child_tax_credit ?? 0, recon.form1040Line19Ctc);
  assertEquals(form.line24_total_tax, recon.form1040Line24TotalTax);
  assertEquals(form.line29_refundable_aoc, recon.form8863Line8RefundableAoc);
  assertEquals(form.line28_actc ?? 0, recon.form1040Line28Actc);
  // 2025 EIC table, two children, $31,200-$31,250 earned income row.
  assertEquals(form.line27_eitc, 5_494);
  assertEquals(form.line35a_refund, 1_754 + 5_494 + 392);
});

test("ATS 1040 Scenario 5 exports without force, passes the v5.4 XSD and carries the packet values", async () => {
  const { xml, rejects } = await exportedReturn(
    scenario104005Input(),
    [],
    scenario104005RetainedSourceDocuments(),
  );
  assertEquals(rejects, []);
  if (await xsdAvailable()) await validateAgainstXsd(xml);
  const roots = [...xml.matchAll(/<(IRS[A-Za-z0-9]+) documentId=/g)].map((m) =>
    m[1]
  );
  for (
    const form of [
      "IRS1040",
      "IRSW2",
      "IRS1040Schedule1",
      "IRS1040Schedule3",
      "IRS2441",
      "IRS8862",
      "IRS8863",
      "IRS1040ScheduleEIC",
      "IRS1040Schedule8812",
    ]
  ) assertEquals(roots.includes(form), true, form);
  assertEquals(
    TY2025_ATS_CASES.find((c) => c.id === "1040-05")?.forms.length,
    roots.length,
  );
  for (
    const fragment of [
      "<PECFPrimaryInd>X</PECFPrimaryInd>",
      "<IndividualReturnFilingStatusCd>4</IndividualReturnFilingStatusCd>",
      "<DependentSSN>400001057</DependentSSN>",
      "<DependentSSN>400001058</DependentSSN>",
      "<SepdSpsFilingSepRetMeetsRqrInd>X</SepdSpsFilingSepRetMeetsRqrInd>",
      "<PrimaryBlindInd>X</PrimaryBlindInd>",
      "<DoNotClaimACTCInd>X</DoNotClaimACTCInd>",
      "<WagesAmt>31232</WagesAmt>",
      "<WithholdingAmt>1754</WithholdingAmt>",
      "<MovingExpenseAmt>1475</MovingExpenseAmt><ClaimStorageFeesInd>X</ClaimStorageFeesInd>",
      "<BusinessNameLine1Txt>Kid Korner</BusinessNameLine1Txt>",
      "<EIN>000000041</EIN>",
      "<PaidAmt>1300</PaidAmt>",
      "<BusinessNameLine1Txt>Little Genius</BusinessNameLine1Txt>",
      "<EIN>000000042</EIN>",
      "<PaidAmt>520</PaidAmt>",
      "<AddressLine1Txt>227 Maze Street</AddressLine1Txt>",
      "<AddressLine1Txt>7311 Apple Road</AddressLine1Txt>",
      "<QualifiedCareExpensesPaidAmt>1300</QualifiedCareExpensesPaidAmt>",
      "<QualifiedCareExpensesPaidAmt>520</QualifiedCareExpensesPaidAmt>",
      "<EICClaimedInd>X</EICClaimedInd>",
      "<AOTCClaimedInd>X</AOTCClaimedInd>",
      "<EICEligClmIncmIncorrectRptInd>false</EICEligClmIncmIncorrectRptInd>",
      "<EICEligClmQlfyChldOfOtherInd>false</EICEligClmQlfyChldOfOtherInd>",
      "<LiveInUSDayCnt>365</LiveInUSDayCnt>",
      "<EligibleStudentInd>true</EligibleStudentInd>",
      "<PriorYearCreditClaimedInd>false</PriorYearCreditClaimedInd>",
      "<TentativeAmerOppCreditAmt>980</TentativeAmerOppCreditAmt>",
      "<BusinessNameLine1Txt>University of Texas</BusinessNameLine1Txt>",
      "<AddressLine1Txt>1234 Blue Street</AddressLine1Txt>",
      "<ChildBirthYr>2015</ChildBirthYr>",
      "<ChildBirthYr>2016</ChildBirthYr>",
      "<MonthsChildLivedWithYouCnt>12</MonthsChildLivedWithYouCnt>",
      "<QlfyChildUnderAgeSSNCnt>2</QlfyChildUnderAgeSSNCnt>",
      "<CTCODCAmt>0</CTCODCAmt>",
    ]
  ) assertStringIncludes(xml, fragment);
  assertEquals(xml.includes("<IRS3903"), false);
  assertEquals(xml.includes("ClaimACTCAllFilersGrp"), false);
});

test("ATS 1040 Scenario 5 Form 8862 needs the retained prior notice copies", async () => {
  await assertRejects(
    () => exportedReturn(scenario104005Input()),
    Error,
    "retained prior IRS notice copy with matching SHA-256",
  );
  const [eic, aotc] = scenario104005RetainedSourceDocuments();
  await assertRejects(
    () =>
      exportedReturn(scenario104005Input(), [], [eic, {
        ...aotc,
        bytes: new TextEncoder().encode("different notice"),
      }]),
    Error,
    "Form 8862 AOTC export needs the retained prior IRS notice copy",
  );
  const general = scenario104005Input().general;
  assertEquals(
    general.prior_eic_disallowance_review.notice_copy_sha256,
    await sha256Hex(eic.bytes),
  );
  assertEquals(
    general.prior_aotc_disallowance_review.notice_copy_sha256,
    await sha256Hex(aotc.bytes),
  );
});

test("ATS 1040 Scenario 5 exports through the CLI return store without force", async () => {
  const xml = await cliExport(
    scenario104005Input(),
    [],
    scenario104005RetainedSourceDocuments(),
  );
  assertStringIncludes(xml, "<ClaimStorageFeesInd>X</ClaimStorageFeesInd>");
  assertStringIncludes(xml, "<EICClaimedInd>X</EICClaimedInd>");
});

test("ATS 1040 Scenario 5 records every assumption and answer-key conflict", () => {
  for (const row of SCENARIO_1040_05_ASSUMPTIONS) {
    assertEquals(row.field.length > 0 && row.why.length > 0, true);
  }
  assertEquals(recon.packetConflicts.length, 4);
});
