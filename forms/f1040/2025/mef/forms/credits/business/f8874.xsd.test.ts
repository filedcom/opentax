import * as fs from "node:fs/promises";
import { test } from "bun:test";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assertEquals } from "@std/assert";
import { buildForm8874Document } from "./f8874.ts";
import { withReviewedForm8874A } from "../../../../../nodes/inputs/credits/business/f8874/issuance_fixture.ts";

const XSD_PATH = new URL(
  "../../../../../../../irs/mef/2025v5.4/CorporateIncomeTax/Common/IRS8874/IRS8874.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  sys.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

test.skipIf(!xsdAvailable)("XSD: Form 8874 qualified investment and pass-through line 2 credit", async () => {
  const xml = buildForm8874Document({
    investments: [withReviewedForm8874A(
      {
        cde_name: "Community Development Entity",
        cde_ein: "123456789",
        cde_address: {
          line1: "10 Main Street",
          city: "Wilmington",
          state: "DE",
          zip: "19801",
        },
        initial_investment_date: "2023-04-15",
        credit_allowance_date: "2025-04-15",
        qualified_equity_investment_amount: 100_000,
        designation_notice_reference: "2023 QEI notice",
        held_on_credit_allowance_date: true,
        qualified_on_credit_allowance_date: true,
        recapture_notice_received: false,
        subject_to_passive_activity_limit: false,
      },
      "Alex Owner",
      "111223333",
    )],
  }, 1_250).replace(
    "<IRS8874>",
    '<IRS8874 xmlns="http://www.irs.gov/efile" documentId="IRS88740">',
  );
  const path = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(path, xml);
    const result = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await sys.remove(path);
  }
});
