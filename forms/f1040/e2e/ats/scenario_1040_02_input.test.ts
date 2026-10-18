import { test } from "bun:test";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { w2 } from "../../nodes/inputs/income/wages/w2/index.ts";
import { scheduleC as scheduleCNode } from "../../nodes/inputs/income/business/schedule_c/index.ts";
import { scheduleC as scheduleCMef } from "../../2025/mef/forms/income/business/schedule_c.ts";
import { scheduleCPdf } from "../../2025/pdf/forms/income/business/schedule_c.ts";
import { fillFormPdf } from "../../2025/pdf/builder.ts";
import { testFiler } from "../../2025/mef/execution/test-filer.ts";
import {
  scenario104002Attachments,
  SCENARIO_1040_02_ASSUMPTIONS,
  scenario104002Input,
  SCENARIO_1040_02_RECONCILIATION,
} from "./scenario_1040_02_input.ts";
import {
  exportAtsReturn,
  validateReturn1040Xsd,
  xmlAmount,
  xmlDocuments,
  xmlValues,
  xsdAvailable,
} from "./ty2025-export.ts";
import { SCENARIO_1040_02_FACTS } from "./ty2025_cases.ts";
import { cliExport } from "./ats-export.ts";

test("ATS 1040 Scenario 2 issued W-2s reconcile to statutory Schedule C", async () => {
  const input = await scenario104002Input();
  const forms = input.w2 as Array<Record<string, unknown>>;
  const business = (input.schedule_c as Array<Record<string, unknown>>)[0];
  assertEquals(forms.length, 2);
  assertEquals(forms[0].employee_ssn, SCENARIO_1040_02_FACTS.taxpayer.ssn);
  assertEquals(forms[1].employee_ssn, SCENARIO_1040_02_FACTS.spouse.ssn);
  assertEquals(forms[0].box13_statutory_employee, true);
  assertEquals(forms[1].box13_statutory_employee, false);
  assertEquals(
    forms[0].source_document_reference,
    "irs-ty2025-ats-1040-02-w2-page-4",
  );

  const wages = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    w2.inputSchema.parse({ w2s: forms }),
  );
  const routed = (type: string) =>
    wages.outputs.find((item) => item.nodeType === type)?.fields;
  assertEquals(
    routed("f1040")?.line1a_wages,
    SCENARIO_1040_02_RECONCILIATION.regularW2Wages,
  );
  assertEquals(
    routed("f1040")?.line25a_w2_withheld,
    SCENARIO_1040_02_RECONCILIATION.totalW2Withholding,
  );
  const sources = routed("schedule_c")?.statutory_w2_sources;
  assertEquals((sources as unknown[])?.length, 1);
  assertEquals(
    (sources as Array<Record<string, unknown>>)[0].amount,
    SCENARIO_1040_02_RECONCILIATION.statutoryW2Receipts,
  );

  const scheduleCInput = scheduleCNode.inputSchema.parse({
    schedule_cs: [business],
    statutory_w2_sources: sources,
  });
  const result = scheduleCNode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleCInput,
  );
  const schedule1 = result.outputs.find((item) => item.nodeType === "schedule1")
    ?.fields;
  assertEquals(
    schedule1?.line3_schedule_c,
    SCENARIO_1040_02_RECONCILIATION.scheduleCProfit,
  );
  assertEquals(
    (business.line_8_advertising as number) +
      (business.line_9_car_truck_expenses as number) +
      (business.line_19_pension_plans as number) +
      (business.line_22_supplies as number) +
      (business.line_23_taxes_licenses as number),
    SCENARIO_1040_02_RECONCILIATION.scheduleCExpenses,
  );

  const filer = {
    ...testFiler(),
    primarySSN: SCENARIO_1040_02_FACTS.taxpayer.ssn,
    fullName: "John Jones",
  };
  const [xml] = scheduleCMef.build(scheduleCInput, { filer });
  assertStringIncludes(
    xml,
    "<TotalGrossReceiptsAmt>29513</TotalGrossReceiptsAmt>",
  );
  assertStringIncludes(xml, "<NetProfitOrLossAmt>26979</NetProfitOrLossAmt>");
  const projected = scheduleCPdf.projectFields!(scheduleCInput, {
    general: input.general as Record<string, unknown>,
    w2: { w2s: forms },
    schedule_c: scheduleCInput,
  });
  const [copy] = scheduleCPdf.instances!(projected, filer);
  assertEquals(copy.line1, 29_513);
  assertEquals(copy.line28, 2_534);
  assertEquals(copy.line31, 26_979);
  const bytes = await fillFormPdf(scheduleCPdf, copy, filer, ".pdf-cache");
  assertEquals((await PDFDocument.load(bytes!)).getPageCount(), 2);
});

test("ATS 1040 Scenario 2 records each assumption once", () => {
  const fields = SCENARIO_1040_02_ASSUMPTIONS.map((item) => item.field);
  assertEquals(new Set(fields).size, fields.length);
});

test("ATS 1040 Scenario 2 exports without force, XSD-valid, with the packet values", async () => {
  const exported = await exportAtsReturn(
    await scenario104002Input(),
    await scenario104002Attachments(),
  );
  assertEquals(exported.diagnostics, []);
  assertEquals(exported.rejects, []);
  assertEquals(exported.attachments, ["NonresidentSpouseChoiceStatement.pdf"]);
  if (xsdAvailable()) {
    const { success, stderr } = await validateReturn1040Xsd(exported.xml);
    assertEquals(success, true, stderr);
  }
  const { xml } = exported;
  const facts = SCENARIO_1040_02_FACTS;
  const a = SCENARIO_1040_02_RECONCILIATION.scheduleA;
  const f = SCENARIO_1040_02_RECONCILIATION.form1040;
  const amount = (root: string, tag: string) => xmlAmount(xml, root, tag);
  assertEquals(xmlValues(xml, "NameLine1Txt")[0], "JOHN &amp; JUDY DECD&lt;JONES");
  assertEquals(xmlValues(xml, "InCareOfNm"), ["% John Jones"]);
  assertEquals(xmlValues(xml, "SpouseIdentityProtectionPIN"), ["876543"]);
  assertEquals(xmlValues(xml, "PTIN"), [facts.preparer.ptin]);
  assertEquals(xmlValues(xml, "PreparerPersonNm"), [facts.preparer.name]);
  assertEquals(xmlValues(xml, "PreparerFirmEIN"), [facts.preparer.firmEin]);
  assertEquals(xmlValues(xml, "SpouseDeathDt"), [facts.spouse.dateOfDeath]);
  assertEquals(xmlValues(xml, "SurvivingSpouseInd"), ["X"]);
  assertEquals(xmlValues(xml, "PECFPrimaryInd"), ["X"]);
  assertEquals(xmlValues(xml, "IndividualReturnFilingStatusCd"), ["2"]);
  assertEquals(xmlValues(xml, "NRASpouseTreatedAsResidentInd"), ["X"]);
  assertEquals(xmlValues(xml, "SpouseNm"), ["Judy Jones"]);
  assertEquals(xmlValues(xml, "VirtualCurAcquiredDurTYInd"), ["false"]);
  assertEquals(xmlValues(xml, "DependentSSN"), [facts.dependent.ssn]);
  assertEquals(xmlValues(xml, "ChildIsAStudentUnder24Ind"), ["X"]);
  assertEquals(xmlValues(xml, "DoNotClaimEICInd"), ["X"]);
  assertStringIncludes(
    xml,
    `<EstimatedTaxPaymentsAmt divorcedSpouseSSN="${facts.formerSpouseSsn}">${f.line26}</EstimatedTaxPaymentsAmt>`,
  );
  assertEquals(xmlValues(xml, "StateIncomeTaxAmt"), ["927", "101"]);
  assertEquals(amount("IRS1040", "WagesAmt"), 8_513);
  assertEquals(amount("IRS1040", "TotalIncomeAmt"), f.line9);
  assertEquals(amount("IRS1040", "AdjustedGrossIncomeAmt"), f.line11);
  assertEquals(amount("IRS1040", "TotalItemizedOrStandardDedAmt"), f.line12e);
  assertEquals(amount("IRS1040", "TaxableIncomeAmt"), f.line15);
  assertEquals(amount("IRS1040", "TaxAmt"), f.line16);
  assertEquals(amount("IRS1040", "CTCODCAmt"), f.line19);
  assertEquals(amount("IRS1040", "TotalTaxAmt"), f.line24);
  assertEquals(amount("IRS1040", "WithholdingTaxAmt"), f.line25d);
  assertEquals(amount("IRS1040", "TotalPaymentsAmt"), f.line33);
  assertEquals(amount("IRS1040", "OverpaidAmt"), f.line34);
  assertEquals(amount("IRS1040Schedule1", "BusinessIncomeLossAmt"), 26_979);
  assertEquals(amount("IRS1040ScheduleA", "StateAndLocalTaxAmt"), a.line5a);
  assertEquals(amount("IRS1040ScheduleA", "RealEstateTaxesAmt"), a.line5b);
  assertEquals(amount("IRS1040ScheduleA", "RptHomeMortgIntAndPointsAmt"), a.line8a);
  assertEquals(amount("IRS1040ScheduleA", "Form1098PointsNotReportedAmt"), a.line8c);
  assertStringIncludes(
    xml,
    `<GiftsByCashOrCheckAmt qualifiedContributionsAmt="${a.line11QualifiedContributions}">${a.line11}</GiftsByCashOrCheckAmt>`,
  );
  assertEquals(amount("IRS1040ScheduleA", "OtherThanByCashOrCheckAmt"), a.line12);
  assertEquals(amount("IRS1040ScheduleA", "TotalItemizedDeductionsAmt"), a.line17);
  assertEquals(xmlValues(xml, "ItmzdDedLessThanStdDedInd"), ["X"]);
  assertEquals(amount("IRS1040ScheduleC", "TotalGrossReceiptsAmt"), 29_513);
  assertEquals(amount("IRS1040ScheduleC", "NetProfitOrLossAmt"), 26_979);
  assertEquals(xmlValues(xml, "DonorAcquiredDt"), ["VARIOUS"]);
  assertEquals(xmlValues(xml, "DonorAcquisitionDesc"), [facts.form8283.howAcquired]);
  assertEquals(xmlValues(xml, "FairMarketValueMethodDesc"), [
    facts.form8283.fairMarketValueMethod,
  ]);
  assertEquals(amount("IRS8283", "DonorCostOrAdjustedBasisAmt"), facts.form8283.costBasis);
  assertEquals(amount("IRS8283", "FairMarketValueAmt"), facts.form8283.fairMarketValue);
  assertEquals(xmlDocuments(xml, "IRS8995").length, 0);
}, 120_000);

test("ATS 1040 Scenario 2 exports through the CLI return store without force", async () => {
  const xml = await cliExport(
    await scenario104002Input(),
    await scenario104002Attachments(),
  );
  assertStringIncludes(
    xml,
    "<NRASpouseTreatedAsResidentInd>X</NRASpouseTreatedAsResidentInd>",
  );
  assertStringIncludes(xml, "<Desc>Nonresident Spouse Choice Statement</Desc>");
});
