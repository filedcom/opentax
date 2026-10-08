import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  form8960,
  inputSchema as form8960InputSchema,
} from "../../../nodes/intermediate/forms/form8960/index.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

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

Deno.test("Schedule 2 line 12 rejects NIIT without a calculated Form 8960", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 380,
    },
    schedule2: { line12_niit: 380 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 12 differs from calculated Form 8960 tax",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 12 differs from calculated Form 8960 tax",
  );
});

Deno.test("Schedule 2 line 12 retains calculated Form 8960 tax in native and PDF returns", async () => {
  const result = form8960.compute(
    { taxYear: 2025, formType: "f1040" },
    form8960InputSchema.parse({
      filing_status: "single",
      magi: 300_000,
      line1_taxable_interest: 10_000,
    }),
  );
  const form = result.outputs.find((output) => output.nodeType === "form8960")
    ?.fields;
  assert(form);
  const pending = {
    form8960: form,
    f1040: {
      filing_status: "single" as const,
      taxpayer_ssn: "111223333",
      digital_assets: false,
      line23_other_taxes: 380,
    },
    schedule2: { line12_niit: 380 },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<IndivNetInvstIncomeTaxAmt>380</IndivNetInvstIncomeTaxAmt>",
  );
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
          schedule2: { line12_niit: 379 },
        }, { filer, attachments: [] }),
      () =>
        buildPdfBytes({
          ...pending,
          form8960: { ...form, line17_niit: 379 },
        }, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 2 line 12 differs from calculated Form 8960 tax",
    );
  }
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        form8960: { ...form, line17_niit: 379 },
        schedule2: { line12_niit: 379 },
      }, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 12 differs from calculated Form 8960 tax",
  );
});
