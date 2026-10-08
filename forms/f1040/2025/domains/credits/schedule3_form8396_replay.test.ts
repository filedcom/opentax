import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  calculateForm8396,
  form8396SourceSchema,
} from "../../../nodes/intermediate/forms/form8396/calculation.ts";
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

Deno.test("Schedule 3 line 6g rejects bare mortgage interest credit", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line20_nonrefundable_credits: 300,
    },
    schedule3: {
      line6g_mortgage_interest_credit: 300,
      line7_total: 300,
      line8_total: 300,
    },
  };
  for (
    const build of [
      () => buildMefBundle(pending, { filer, attachments: [] }),
      () => buildPdfBytes(pending, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 3 line 6g differs from retained Form 8396 credit",
    );
  }
});

Deno.test("Schedule 3 line 6g replays a retained Form 8396 carryforward", async () => {
  const source = form8396SourceSchema.parse({
    certificate_issuer_name: "Austin Housing Finance Corporation",
    certificate_number: "MCC-2022-104",
    certificate_issue_date: "2022-03-15",
    current_year_claim: false,
    prior_2024_form8396: {
      document_reference: "Filed 2024 Form 8396",
      line14_2023_carryforward: 0,
      line16_2022_carryforward: 0,
      line17_2024_carryforward: 300,
    },
  });
  const lines = calculateForm8396(source, 300);
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line16_income_tax: 1_000,
      line20_nonrefundable_credits: 300,
    },
    schedule3: {
      line6g_mortgage_interest_credit: 300,
      line7_total: 300,
      line8_total: 300,
    },
    form8396: {
      ...source,
      ...lines,
      credit_limit_worksheet_line1: 1_000,
      credit_limit_worksheet_line2: 700,
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<MortgageInterestCreditAmt>300</MortgageInterestCreditAmt>",
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
    f1040: { ...pending.f1040, line20_nonrefundable_credits: 299 },
    schedule3: {
      line6g_mortgage_interest_credit: 299,
      line7_total: 299,
      line8_total: 299,
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
      "Schedule 3 line 6g differs from retained Form 8396 credit",
    );
  }
});
