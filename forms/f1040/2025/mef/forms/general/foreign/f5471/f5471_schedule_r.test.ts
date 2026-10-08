import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form5471ScheduleR } from "./f5471_schedule_r.ts";

const xsd = new URL(
  "../../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS5471ScheduleR/IRS5471ScheduleR.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // Research schema bundle is optional in another workspace.
}

Deno.test("Schedule R reports reviewed no-distribution CFC identity", () => {
  const xml = form5471ScheduleR.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(xml, "<IRS5471ScheduleR>");
  assertStringIncludes(
    xml,
    "<ForeignEntityReferenceIdNum>FC001</ForeignEntityReferenceIdNum>",
  );
  assertEquals(xml.includes("<DistributionsFromFrgnCorpGrp>"), false);
  assertEquals(
    xml.includes("<DistributionFuncCurAmt>0</DistributionFuncCurAmt>"),
    false,
  );
  assertEquals(xml.includes("<DistributionDt>"), false);
  assertThrows(() =>
    form5471ScheduleR.build({}, {
      filer: form8992Filer,
      pending: {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_r: {
              ...form8992Cfc.schedule_r,
              distributions: [{ date: "2025-06-30", amount: 100 }],
            },
          }],
        },
      },
    }), Error);
});

Deno.test({
  name:
    "TY2025 v5.4 Schedule R has no zero-only XML field outside a dated distribution row",
  ignore: !schemaAvailable,
  fn: () => {
    const schema = Deno.readTextFileSync(xsd);
    const distribution = schema.indexOf('name="DistributionsFromFrgnCorpGrp"');
    const rowType = schema.indexOf('name="DistributionsFromFrgnCorpGrpType"');
    assertEquals(distribution > 0, true);
    assertEquals(rowType > distribution, true);
    assertEquals(
      schema.slice(distribution, rowType).includes('minOccurs="0"'),
      true,
    );
    const row = schema.slice(rowType);
    for (
      const field of [
        "RowId",
        "DistributionDesc",
        "DistributionDt",
        "DistributionFuncCurAmt",
        "DistributionFromEPFuncCurAmt",
      ]
    ) {
      assertEquals(row.includes(`name="${field}"`), true);
    }
  },
});

Deno.test({
  name: "Schedule R no-distribution native XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleR.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleR/,
      '<IRS5471ScheduleR xmlns="http://www.irs.gov/efile" documentId="IRS5471ScheduleRTest1"',
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
