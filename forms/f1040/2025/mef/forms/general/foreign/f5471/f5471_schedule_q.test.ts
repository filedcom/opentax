import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471ScheduleQ } from "./f5471_schedule_q.ts";

const xsd = new URL(
  "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS5471ScheduleQ/IRS5471ScheduleQ.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // Research schema bundle is optional in another workspace.
}

Deno.test("Schedule Q joins reviewed sales and tested income groups", () => {
  const xml = form5471ScheduleQ.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(xml, "<SeparateCategoryCd>GEN</SeparateCategoryCd>");
  assertStringIncludes(
    xml,
    "<ForeignSourceIncomeInd>X</ForeignSourceIncomeInd>",
  );
  assertStringIncludes(xml, "<TotFrgnBaseCoSalesIncmGrp>");
  assertStringIncludes(xml, "<TotalGrossIncomeAmt>55000</TotalGrossIncomeAmt>");
  assertStringIncludes(xml, "<TotalNetIncomeAmt>60000</TotalNetIncomeAmt>");
  assertEquals(xml.includes("<TotalResidualIncomeGrp>"), false);
  assertThrows(() =>
    form5471ScheduleQ.build({}, {
      filer: form8992Filer,
      pending: {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_q: {
              ...form8992Cfc.schedule_q,
              tested_other_expenses_functional: 1_499,
            },
          }],
        },
      },
    }), Error);
});

Deno.test({
  name: "Schedule Q bounded native XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleQ.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleQ/,
      '<IRS5471ScheduleQ xmlns="http://www.irs.gov/efile" documentId="IRS5471ScheduleQTest1"',
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
