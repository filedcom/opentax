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
  primarySSN: "123456789",
  firstNameWithInitial: "Alex",
  lastName: "Taxpayer",
  fullName: "Alex Taxpayer",
  nameLine1: "ALEX TAXPAYER",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Schedule 3 line 6h rejects bare DC homebuyer credit", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line20_nonrefundable_credits: 100,
    },
    schedule3: {
      line6h_dc_homebuyer_credit: 100,
      line7_total: 100,
      line8_total: 100,
    },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 3 line 6h differs from retained Form 8859 credit",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 3 line 6h differs from retained Form 8859 credit",
  );
});

Deno.test("Schedule 3 line 6h replays a retained Form 8859 carryforward in native and PDF", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line16_income_tax: 1_000,
      line20_nonrefundable_credits: 830,
    },
    schedule3: {
      line6h_dc_homebuyer_credit: 830,
      line7_total: 830,
      line8_total: 830,
    },
    f8859: {
      f8859s: [{ carryforward_amount: 1_200 }],
      line1_carryforward: 1_200,
      line2_limit: 830,
      line3_allowed_credit: 830,
      line4_carryforward: 370,
      worksheet_line1_tax: 1_000,
      worksheet_line2_credits: 170,
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    '<DCHmByrCurrentYearCreditAmt referenceDocumentId="IRS8859',
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
          schedule3: {
            line6h_dc_homebuyer_credit: 829,
            line7_total: 829,
            line8_total: 829,
          },
          f1040: { ...pending.f1040, line20_nonrefundable_credits: 829 },
        }, { filer, attachments: [] }),
      () =>
        buildPdfBytes({
          ...pending,
          schedule3: {
            line6h_dc_homebuyer_credit: 829,
            line7_total: 829,
            line8_total: 829,
          },
          f1040: { ...pending.f1040, line20_nonrefundable_credits: 829 },
        }, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 3 line 6h differs from retained Form 8859 credit",
    );
  }
});
