import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

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

Deno.test("Schedule 3 line 6i rejects bare Form 8834 credit", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line20_nonrefundable_credits: 450,
    },
    schedule3: {
      line6i_qualified_electric_vehicle_credit: 450,
      line7_total: 450,
      line8_total: 450,
    },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 3 line 6i differs from retained Form 8834 credit",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 3 line 6i differs from retained Form 8834 credit",
  );
});

Deno.test("Schedule 3 line 6i replays a retained Form 8834 limited credit", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line16_income_tax: 1_000,
      line20_nonrefundable_credits: 450,
    },
    schedule3: {
      line6i_qualified_electric_vehicle_credit: 450,
      line7_total: 450,
      line8_total: 450,
    },
    f8834: {
      f8834s: [{
        source_form: "8582-CR" as const,
        source_activity_id: "rental-a",
        allowed_passive_activity_credit: 600,
      }],
      line1_source_credit: 600,
      line2_regular_tax: 1_000,
      line3a_foreign_tax_credit: 100,
      line3b_other_credits: 150,
      line3c_total_credits: 250,
      line4_net_regular_tax: 750,
      line5_tentative_minimum_tax: 300,
      line6_adjusted_regular_tax: 450,
      line7_allowed_credit: 450,
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    '<QlfyElecMotorVehCrAmt referenceDocumentId="IRS8834',
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
  const changed = {
    ...pending,
    f1040: { ...pending.f1040, line20_nonrefundable_credits: 449 },
    schedule3: {
      line6i_qualified_electric_vehicle_credit: 449,
      line7_total: 449,
      line8_total: 449,
    },
  };
  for (
    const build of [
      () => buildMefBundle(changed, { filer, attachments: [] }),
      () => buildPdfBytes(changed, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 3 line 6i differs from retained Form 8834 credit",
    );
  }
});
