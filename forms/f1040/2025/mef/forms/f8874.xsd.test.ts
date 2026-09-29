import { assertEquals } from "@std/assert";
import { buildForm8874Document } from "./f8874.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS8874/IRS8874.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test({
  name: "XSD: Form 8874 qualified investment and pass-through line 2 credit",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildForm8874Document({
    investments: [{
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
    }],
  }, 1_250).replace(
    "<IRS8874>",
    '<IRS8874 xmlns="http://www.irs.gov/efile" documentId="IRS88740">',
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const result = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
  } finally {
    await Deno.remove(path);
  }
});
