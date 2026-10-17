import { test } from "bun:test";
import { assertEquals, assertInstanceOf, assertMatch } from "@std/assert";
import * as sys from "../../../../scripts/support/sys.ts";
import { createReturnCommand } from "../../../../cli/commands/return.ts";
import { formAddCommand } from "../../../../cli/commands/form.ts";
import {
  exportMefCommand,
  ExportRejectedError,
} from "../../../../cli/commands/export.ts";
import { parseEmittedReturn } from "../../../../core/validation/emitted-documents.ts";
import { f4868_2026 } from "../index.ts";
import {
  scenario486807Input,
  SCENARIO_4868_07_FACTS as FACTS,
  SCENARIO_4868_07_RECONCILIATION,
} from "../../e2e/ats/scenario_4868_07_input.ts";
import { return4868XsdAvailable, validateReturn4868Xsd } from "./xsd.ts";

/** Export the fixture as a user would: create, add the f4868 input, export MeF. */
async function cliExport(force: boolean): Promise<string> {
  const baseDir = await sys.makeTempDir();
  try {
    const { returnId } = await createReturnCommand({
      year: 2026,
      formType: "f4868",
      baseDir,
    });
    await formAddCommand({
      returnId,
      nodeType: "f4868",
      dataJson: JSON.stringify(scenario486807Input().f4868),
      baseDir,
    });
    return await exportMefCommand({ returnId, baseDir, force });
  } finally {
    await sys.remove(baseDir, { recursive: true });
  }
}

function leaf(xml: string, name: string): string | undefined {
  const { header, documents } = parseEmittedReturn(xml);
  return header.values.get(name)?.[0] ??
    documents.flatMap((d) => d.values.get(name) ?? [])[0];
}

test("ATS 4868 Scenario 7 (TY2026): exported XML carries every printed packet value", async () => {
  const result = f4868_2026.executeReturn(scenario486807Input());
  assertEquals(result.diagnostics, []);
  const xml = f4868_2026.buildMefXml(result.pending);
  const printed = FACTS.printedForm4868;
  const compared: ReadonlyArray<readonly [string, string | undefined]> = [
    ["PrimarySSN", FACTS.taxpayer.ssn],
    ["NameLine1Txt", "TERESA<MOREHOUSE"],
    ["PrimaryNameControlTxt", "MORE"],
    ["AddressLine1Txt", FACTS.taxpayer.address.line1],
    ["CityNm", FACTS.taxpayer.address.city],
    ["StateAbbreviationCd", FACTS.taxpayer.address.state],
    ["ZIPCd", FACTS.taxpayer.address.zip],
    ["TotalTaxLiabilityAmt", String(printed.line4EstimatedTotalTax)],
    ["TotalPaymentsAmt", String(printed.line5TotalPayments)],
    ["TaxpayerAbroadInd", undefined],
    ["NonresWithNoWagesSubjToWhInd", undefined],
    ["RoutingTransitNum", FACTS.payment.routingTransitNumber],
    ["BankAccountNum", FACTS.payment.bankAccountNumber],
    ["BankAccountTypeCd", "1"],
    ["PaymentAmt", FACTS.payment.amount.toFixed(2)],
    ["RequestedPaymentDt", FACTS.payment.dueDate],
    ["TaxpayerDaytimePhoneNum", FACTS.payment.phone],
    ["ReturnTypeCd", "4868"],
    ["TaxYr", String(FACTS.taxYear)],
  ];
  for (const [name, expected] of compared) {
    assertEquals(leaf(xml, name), expected, name);
  }
  // Lines 6 and 7 are printed blank: line 6 per the form, line 7 the p. 1 payment.
  assertEquals(
    leaf(xml, "BalanceDueAmt"),
    String(printed.line4EstimatedTotalTax - printed.line5TotalPayments),
  );
  assertEquals(leaf(xml, "TaxpayerIsPayingAmt"), String(FACTS.payment.amount));
  if (return4868XsdAvailable()) await validateReturn4868Xsd(xml);
});

test("ATS 4868 Scenario 7 (TY2026): the CLI export is blocked only by the packet's routing number", async () => {
  const error = await cliExport(false).catch((e: unknown) => e);
  assertInstanceOf(error, ExportRejectedError);
  assertEquals(
    error.entries.map((e) => e.ruleNumber),
    SCENARIO_4868_07_RECONCILIATION.conflicts.map((c) => c.rule),
  );
  const xml = await cliExport(true);
  assertMatch(xml, /^<Return returnVersion="2026v1.0"/);
  if (return4868XsdAvailable()) await validateReturn4868Xsd(xml);
});
