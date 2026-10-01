import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../form8992.fixture.ts";
import { form5471ScheduleM } from "./f5471_schedule_m.ts";

const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS5471ScheduleM/IRS5471ScheduleM.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // Research schema bundle is optional in another workspace.
}

Deno.test("Schedule M reports the reviewed sale to the sole shareholder", () => {
  const xml = form5471ScheduleM.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(
    xml,
    "<FunctionalCurrencyDesc>EUR</FunctionalCurrencyDesc>",
  );
  assertStringIncludes(xml, "<ExchangeRt>1.0000</ExchangeRt>");
  assertStringIncludes(xml, "<InventorySalesAmt>10000</InventorySalesAmt>");
  assertStringIncludes(
    xml,
    "<TotalTransactionsReceivedAmt>10000</TotalTransactionsReceivedAmt>",
  );
  assertStringIncludes(xml, "<AccountsReceivableAmt>0</AccountsReceivableAmt>");
  assertEquals(xml.includes("<DomCorpPrtshpUSPersonFilingGrp>"), false);
  assertThrows(() =>
    form5471ScheduleM.build({}, {
      filer: form8992Filer,
      pending: {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_m: {
              ...form8992Cfc.schedule_m,
              inventory_sales_to_filer_usd: 9_999,
            },
          }],
        },
      },
    }), Error);
});

Deno.test({
  name: "Schedule M bounded native XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleM.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleM/,
      '<IRS5471ScheduleM xmlns="http://www.irs.gov/efile" documentId="IRS5471ScheduleMTest1"',
    );
    const command = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = command.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const result = await command.output();
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  },
});
