import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../../nodes/types.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";

const filer = {
  primarySSN: "111223333",
  firstNameWithInitial: "Alex",
  lastName: "Example",
  fullName: "Alex Example",
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

Deno.test("Schedule 2 line 4 rejects bare self-employment tax", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 1_412.955,
    },
    schedule2: { line4_se_tax: 1_412.955 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 4 differs from retained Schedule SE tax",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 4 differs from retained Schedule SE tax",
  );
});

Deno.test("Schedule 2 line 4 retains calculated Schedule SE tax in native and PDF returns", async () => {
  const pending = {
    general: {
      filing_status: NodeFilingStatus.Single,
      digital_assets: false,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111223333",
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    schedule_se: { net_profit_schedule_c: 60_000 },
    f1040: {
      filing_status: "single" as const,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111223333",
      digital_assets: false,
      line23_other_taxes: 8_478,
    },
    schedule2: { line4_se_tax: 8_478 },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<SelfEmploymentTaxAmt>8478</SelfEmploymentTaxAmt>",
  );
  const xsd = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
          schedule2: { line4_se_tax: 8_477.72 },
        }, { filer, attachments: [] }),
      () =>
        buildPdfBytes({
          ...pending,
          schedule2: { line4_se_tax: 8_477.72 },
        }, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 2 line 4 differs from retained Schedule SE tax",
    );
  }
});
