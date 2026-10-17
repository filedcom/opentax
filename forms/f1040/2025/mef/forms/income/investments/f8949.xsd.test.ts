import * as fs from "node:fs/promises";
import { test } from "bun:test";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "../../../builder.ts";
import { type FilerIdentity, FilingStatus } from "../../../types.ts";
import { FilingStatus as NodeFilingStatus } from "../../../../../nodes/types.ts";

const XSD_PATH = new URL(
  "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  sys.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The IRS schema bundle is optional in CI.
}

const filer: FilerIdentity = {
  fullName: "Test Taxpayer",
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

test.skipIf(!xsdAvailable)("XSD: TY2025 Form 8949 keeps all twelve paper boxes in separate MeF groups", async () => {
  const parts = ["A", "B", "C", "G", "H", "I", "D", "E", "F", "J", "K", "L"];
  const transactions = parts.map((part, index) => ({
    part,
    description: `Asset ${part}`,
    date_acquired: index === 7
      ? "INHERITED"
      : index === 1
      ? "VARIOUS"
      : index < 6
      ? "2025-01-01"
      : "2023-01-01",
    date_sold: "2025-06-01",
    proceeds: 1000 + index,
    cost_basis: 500,
    gain_loss: 500 + index,
    is_long_term: index >= 6,
    ...(["A", "D"].includes(part)
      ? { adjustment_codes: "O", adjustment_amount: 0 }
      : {}),
  }));
  const xml = buildMefXml({
    general: { filing_status: NodeFilingStatus.Single, digital_assets: true },
    f1040: { filing_status: "single", digital_assets: true },
    schedule_d: { transaction: transactions },
    form8949: transactions,
  }, filer);
  assertStringIncludes(
    xml,
    "<TransRptOn1099DAThatShowBssInd>X</TransRptOn1099DAThatShowBssInd>",
  );
  assertStringIncludes(
    xml,
    "<NonDATransNotRptOn1099BOrDAInd>X</NonDATransNotRptOn1099BOrDAInd>",
  );
  assertStringIncludes(
    xml,
    "<DATransNotRptOn1099DAOrBInd>X</DATransNotRptOn1099DAOrBInd>",
  );
  assertStringIncludes(
    xml,
    "<DateAcquiredInheritedCd>VARIOUS</DateAcquiredInheritedCd>",
  );
  assertStringIncludes(
    xml,
    "<DateAcquiredInheritedCd>INHERITED</DateAcquiredInheritedCd>",
  );
  const tmpPath = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(tmpPath, xml);
    const result = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await sys.remove(tmpPath);
  }
});
