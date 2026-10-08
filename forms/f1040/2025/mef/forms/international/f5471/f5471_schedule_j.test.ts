import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../domains/international/form8992/form8992.fixture.ts";
import { form5471ScheduleJ } from "./f5471_schedule_j.ts";

const xsd = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Common/IRS5471ScheduleJ/IRS5471ScheduleJ.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // Research schema bundle is optional in another workspace.
}

Deno.test("Schedule J reconciles E&P, section 951A and subpart F PTEP", () => {
  const xml = form5471ScheduleJ.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(xml, "<SeparateCategoryCd>GEN</SeparateCategoryCd>");
  assertStringIncludes(
    xml,
    "<ReclassifiedSect959c2EPAmt>-52000</ReclassifiedSect959c2EPAmt>",
  );
  assertStringIncludes(
    xml,
    "<EarnInvstUSPropReclassifiedAmt>1000</EarnInvstUSPropReclassifiedAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReclassifiedSect959c1EPAmt>52000</ReclassifiedSect959c1EPAmt>",
  );
  assertStringIncludes(
    xml,
    "<BalanceBeginningNextYearAmt>17000</BalanceBeginningNextYearAmt>",
  );
  assertThrows(() =>
    form5471ScheduleJ.build({}, {
      filer: form8992Filer,
      pending: {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_j: {
              ...form8992Cfc.schedule_j,
              section951a_inclusion_functional: 41_999,
            },
          }],
        },
      },
    }), Error);
});

Deno.test({
  name: "Schedule J bounded native XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleJ.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleJ/,
      '<IRS5471ScheduleJ xmlns="http://www.irs.gov/efile" documentId="IRS5471ScheduleJTest1"',
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
