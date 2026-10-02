import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../mef/header.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";

const filer = {
  primarySSN: "111223333",
  firstNameWithInitial: "Alex",
  lastName: "Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Schedule 2 line 6 rejects bare Form 8919 tax", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 230,
    },
    schedule2: { line6_uncollected_8919: 230 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 6 differs from retained Form 8919 tax",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 6 differs from retained Form 8919 tax",
  );
});

Deno.test("Schedule 2 line 6 retains Form 8919 tax in native and PDF returns", async () => {
  const pending = {
    form8919: {
      taxpayer_ssn: "111223333",
      forms: [{
        recipient: "taxpayer" as const,
        employers: [{
          name: "Employer Inc",
          tin_type: "ein" as const,
          tin: "12-3456789",
          reason_code: "G" as const,
          ss8_filed_date: "2025-04-01",
          ss8_filing_reference: "SS-8 receipt",
          form1099_received: false,
          wages: 50_000,
        }],
      }],
    },
    f1040: {
      filing_status: "single" as const,
      taxpayer_ssn: "111223333",
      digital_assets: false,
      line1g_wages_8919: 50_000,
      line23_other_taxes: 3_825,
    },
    schedule2: { line6_uncollected_8919: 3_825 },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<UncollectedSocSecMedTaxAmt>3825</UncollectedSocSecMedTaxAmt>",
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, native.xml);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  assert((await buildPdfBytes(pending, filer)).length > 0);
  for (
    const build of [
      () =>
        buildMefBundle({
          ...pending,
          schedule2: { line6_uncollected_8919: 3_824 },
        }, { filer, attachments: [] }),
      () =>
        buildPdfBytes({
          ...pending,
          schedule2: { line6_uncollected_8919: 3_824 },
        }, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 2 line 6 differs from retained Form 8919 tax",
    );
  }
});
