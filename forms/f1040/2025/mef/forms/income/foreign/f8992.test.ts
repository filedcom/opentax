import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../domains/income/foreign/form8992/form8992.fixture.ts";
import { form8992 } from "./f8992.ts";
import { form8992ScheduleA } from "./f8992_schedule_a.ts";

const sharedSchemaRoot = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(sharedSchemaRoot).isDirectory;
} catch {
  // The research schema bundle is optional in other workspaces.
}

async function validateStandaloneSchema(xml: string, schema: string) {
  const command = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", `${sharedSchemaRoot}${schema}`, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = command.stdin.getWriter();
  await writer.write(new TextEncoder().encode(
    xml.replace(
      /^<([A-Za-z0-9]+)/,
      '<$1 xmlns="http://www.irs.gov/efile" documentId="$1Test1"',
    ),
  ));
  await writer.close();
  const result = await command.output();
  assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
}

Deno.test("Form 8992 and Schedule A serialize the same reviewed Category 5a CFC", () => {
  const context = {
    filer: form8992Filer,
    pending: form8992Pending,
    documentIdsByPendingKey: { form8992_schedule_a: ["IRS8992ScheduleA1"] },
  };
  const parent = form8992.build({}, context);
  const schedule = form8992ScheduleA.build({}, context);
  assertStringIncludes(parent, 'referenceDocumentId="IRS8992ScheduleA1"');
  assertStringIncludes(
    parent,
    "<ShareholderPersonNm>Alex Taxpayer</ShareholderPersonNm>",
  );
  assertStringIncludes(
    parent,
    "<NetCFCTestedIncomeAmt>50000</NetCFCTestedIncomeAmt>",
  );
  assertStringIncludes(parent, "<GILTIReceivedAmt>42000</GILTIReceivedAmt>");
  assertStringIncludes(
    schedule,
    "<ForeignEntityReferenceIdNum>FC001</ForeignEntityReferenceIdNum>",
  );
  assertStringIncludes(
    schedule,
    "<ProRataShareCFCTestedIncmAmt>50000</ProRataShareCFCTestedIncmAmt>",
  );
  assertStringIncludes(
    schedule,
    "<GILTIAllocationRt>1.0000</GILTIAllocationRt>",
  );
  assertStringIncludes(
    schedule,
    "<TotGILTIAllocTestedIncmCFCAmt>42000</TotGILTIAllocTestedIncmCFCAmt>",
  );
});

Deno.test("Form 8992 blocks source, filer, return, and companion-document tampering", () => {
  assertThrows(
    () =>
      form8992.build({}, {
        filer: form8992Filer,
        pending: {
          ...form8992Pending,
          schedule1: { line8o_section951aa_inclusion: 41_999 },
        },
      }),
    Error,
    "Schedule 1 lines 8n and 8o",
  );
  assertThrows(
    () =>
      form8992ScheduleA.build({}, {
        filer: { ...form8992Filer, primarySSN: "999887777" },
        pending: form8992Pending,
      }),
    Error,
    "shareholder TIN differs",
  );
  assertThrows(() =>
    form8992.build({}, {
      filer: form8992Filer,
      pending: {
        ...form8992Pending,
        f5471: {
          f5471s: [{
            ...form8992Cfc,
            schedule_i1: {
              ...form8992Cfc.schedule_i1,
              pro_rata_tested_income: 49_000,
            },
          }],
        },
      },
    }), Error);
  assertThrows(
    () =>
      form8992.build({}, {
        filer: form8992Filer,
        pending: form8992Pending,
        documentIdsByPendingKey: {},
      }),
    Error,
    "one linked Schedule A",
  );
});

Deno.test("Form 8992 Schedule A uses EIN when sourced as EIN", () => {
  const cfc = {
    ...form8992Cfc,
    foreign_corp_reference_id: undefined,
    foreign_corp_ein: "123456789",
  };
  const xml = form8992ScheduleA.build({}, {
    filer: form8992Filer,
    pending: { ...form8992Pending, f5471: { f5471s: [cfc] } },
  });
  assertStringIncludes(xml, "<EIN>123456789</EIN>");
  assertEquals(xml.includes("ForeignEntityIdentificationGrp"), false);
});

Deno.test({
  name: "Form 8992 and Schedule A standalone XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const context = {
      filer: form8992Filer,
      pending: form8992Pending,
      documentIdsByPendingKey: { form8992_schedule_a: ["IRS8992ScheduleA1"] },
    };
    await validateStandaloneSchema(
      form8992.build({}, context),
      "IRS8992/IRS8992.xsd",
    );
    await validateStandaloneSchema(
      form8992ScheduleA.build({}, context),
      "IRS8992ScheduleA/IRS8992ScheduleA.xsd",
    );
  },
});
