import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../form8992.fixture.ts";
import { form5471ScheduleH } from "./f5471_schedule_h.ts";

const xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS5471ScheduleH/IRS5471ScheduleH.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // The research schema bundle is optional in other workspaces.
}

Deno.test("Category 5a Schedule H prints reviewed book E&P and general allocation", () => {
  const xml = form5471ScheduleH.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(
    xml,
    "<ForeignCYNetIncomePerBooksAmt>50000</ForeignCYNetIncomePerBooksAmt>",
  );
  assertStringIncludes(xml, "<TotalNetAdditionsAmt>0</TotalNetAdditionsAmt>");
  assertStringIncludes(
    xml,
    "<TotalNetSubtractionsAmt>0</TotalNetSubtractionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<EPDASTMGeneralCatIncmAmt>50000</EPDASTMGeneralCatIncmAmt>",
  );
  assertStringIncludes(
    xml,
    "<CurrEarnAndPrftInUSDollarsAmt>50000</CurrEarnAndPrftInUSDollarsAmt>",
  );
  assertEquals(xml.includes("OtherAdjustmentsNetAddnAmt"), false);
});

Deno.test("Schedule H refuses a nonzero unsupported adjustment and changed USD E&P", () => {
  const source = (schedule_h: unknown) => ({
    ...form8992Pending,
    f5471: { f5471s: [{ ...form8992Cfc, schedule_h }] },
  });
  assertThrows(() =>
    form5471ScheduleH.build({}, {
      filer: form8992Filer,
      pending: source({
        ...form8992Cfc.schedule_h,
        adjustments: {
          ...form8992Cfc.schedule_h.adjustments,
          income_taxes_add: 1,
        },
      }),
    }), Error);
  assertThrows(() =>
    form5471ScheduleH.build({}, {
      filer: form8992Filer,
      pending: source({ ...form8992Cfc.schedule_h, current_ep_usd: 49_999 }),
    }), Error);
});

Deno.test({
  name: "Category 5a Schedule H standalone XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleH.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleH/,
      '<IRS5471ScheduleH xmlns="http://www.irs.gov/efile" documentId="IRS5471ScheduleHTest1"',
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
