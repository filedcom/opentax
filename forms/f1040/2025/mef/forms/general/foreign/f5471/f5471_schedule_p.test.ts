import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471ScheduleP } from "./f5471_schedule_p.ts";

const xsd = new URL(
  "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS5471ScheduleP/IRS5471ScheduleP.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // Research schema bundle is optional in another workspace.
}

Deno.test("Schedule P sole-shareholder PTEP agrees with Schedule J", () => {
  const xml = form5471ScheduleP.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(xml, "<SeparateCategoryCd>GEN</SeparateCategoryCd>");
  assertStringIncludes(xml, "<FCGeneralSection959c1PTEPGrp>");
  assertStringIncludes(xml, "<USGeneralSection959c1PTEPGrp>");
  assertStringIncludes(
    xml,
    "<EarnInvstUSPropReclassifiedAmt>1000</EarnInvstUSPropReclassifiedAmt>",
  );
  assertStringIncludes(
    xml,
    "<BalanceBeginningNextYearAmt>53000</BalanceBeginningNextYearAmt>",
  );
  assertThrows(() =>
    form5471ScheduleP.build({}, {
      filer: form8992Filer,
      pending: {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_p: {
              ...form8992Cfc.schedule_p,
              section956_ptep_reclassified_usd_basis: 51_999,
            },
          }],
        },
      },
    }), Error);
});

Deno.test({
  name: "Schedule P bounded native XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleP.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleP/,
      '<IRS5471ScheduleP xmlns="http://www.irs.gov/efile" documentId="IRS5471SchedulePTest1"',
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
