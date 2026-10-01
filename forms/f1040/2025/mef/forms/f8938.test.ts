import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { form8938Fixture } from "./f8938.fixture.ts";
import { form8938 } from "./f8938.ts";

Deno.test("staged Form 8938 MeF projects Parts I-VI and Part IV exception", () => {
  const xml = form8938.build(form8938Fixture());
  assertStringIncludes(xml, "<IRS8938>");
  assertStringIncludes(xml, "<CalendarYr>2025</CalendarYr>");
  assertStringIncludes(xml, "<SpcfdIndividualInd>true</SpcfdIndividualInd>");
  assertStringIncludes(xml, "<ForeignDepositAcctCnt>1</ForeignDepositAcctCnt>");
  assertStringIncludes(
    xml,
    "<MaxAllFrgnDepositAcctValueAmt>80000</MaxAllFrgnDepositAcctValueAmt>",
  );
  assertStringIncludes(xml, "<ForeignAssetCnt>1</ForeignAssetCnt>");
  assertStringIncludes(
    xml,
    "<MaxAllFrgnAssetValueAmt>40000</MaxAllFrgnAssetValueAmt>",
  );
  assertStringIncludes(xml, "<Form8621Cnt>1</Form8621Cnt>");
  assertStringIncludes(
    xml,
    "<InterestSumGrp><ReportedOnFormOrScheduleAmt>200</ReportedOnFormOrScheduleAmt>",
  );
  assertStringIncludes(
    xml,
    "<WhereReportedSchAndLineTxt>Schedule B line 1</WhereReportedSchAndLineTxt>",
  );
  assertStringIncludes(
    xml,
    "<DividendSumGrp><ReportedOnFormOrScheduleAmt>100</ReportedOnFormOrScheduleAmt>",
  );
  assertStringIncludes(
    xml,
    "<WhereReportedFormAndLineTxt>Form 1040 line 3b</WhereReportedFormAndLineTxt>",
  );
  assertStringIncludes(xml, "<ForeignFinclAccountGrp>");
  assertStringIncludes(xml, "<OtherForeignAssetGrp>");
  assertEquals(xml.includes("PFIC-1"), false); // Part IV only, not repeated detail
});

Deno.test("staged Form 8938 MeF rejects tampered source and mismatched return status", () => {
  const source = form8938Fixture();
  assertThrows(() =>
    form8938.build({
      ...source,
      year_end_value_all_assets: 1,
    }), Error);
  assertThrows(() =>
    form8938.build({
      ...source,
      assets: source.assets.map((asset, index) =>
        index === 2
          ? { ...asset, filed_exception_form_reference: undefined }
          : asset
      ),
    }), Error);
  assertThrows(() =>
    form8938.build({
      ...source,
      assets: source.assets.map((asset, index) =>
        index === 0
          ? {
            ...asset,
            tax_items: [{
              kind: "interest",
              amount_usd: 200,
              filed_form_and_line: "unknown destination",
            }],
          }
          : asset
      ),
    }), Error);
  const filer = {
    filingStatus: FilingStatus.MarriedFilingJointly,
  } as FilerIdentity;
  assertThrows(() => form8938.build(source, { filer }), Error);
});
