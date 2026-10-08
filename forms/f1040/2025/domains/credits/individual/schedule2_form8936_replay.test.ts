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

Deno.test("Schedule 2 lines 1b and 1c reject bare dealer transfer repayments", async () => {
  for (
    const key of [
      "line1b_new_clean_vehicle_repayment",
      "line1c_prev_owned_clean_vehicle_repayment",
    ] as const
  ) {
    const pending = {
      f1040: {
        filing_status: "single" as const,
        digital_assets: false,
        line17_additional_taxes: 4_000,
        line18_total_tax_before_credits: 4_000,
      },
      schedule2: { [key]: 4_000 },
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
        "Schedule 2 dealer repayment differs from retained Form 8936",
      );
    }
  }
});

Deno.test("Schedule 2 line 1b replays a disqualified Form 8936 dealer transfer", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line9_total_income: 200_000,
      line11_agi: 200_000,
      line15_taxable_income: 200_000,
      line16_income_tax: 0,
      line17_additional_taxes: 7_500,
      line18_total_tax_before_credits: 7_500,
      line24_total_tax: 7_500,
    },
    schedule2: { line1b_new_clean_vehicle_repayment: 7_500 },
    f8936: {
      current_year_magi: { adjusted_gross_income: 200_000 },
      prior_year_magi: { adjusted_gross_income: 200_000 },
      filing_status: NodeFilingStatus.Single,
      prior_year_filing_status: NodeFilingStatus.Single,
      f8936s: [{
        vin: "1HGCM82633A004352",
        vehicle_year: 2025,
        vehicle_make: "Example",
        vehicle_model: "EV",
        placed_in_service_date: "2025-09-30",
        acquisition_date: "2025-09-30",
        seller_report_received: true,
        transferred_to_dealer: true,
        transferred_amount: 7_500,
        resold_within_30_days: false,
        acquired_for_use_not_resale: true,
        credit_kind: "new_clean_vehicle" as const,
        credit_amount: 7_500,
        msrp: 45_000,
        vehicle_type: "other" as const,
      }],
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    '<CrTrnsfrDlrSaleAmt referenceDocumentId="IRS8936',
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
          schedule2: { line1b_new_clean_vehicle_repayment: 7_499 },
        }, { filer, attachments: [] }),
      () =>
        buildPdfBytes({
          ...pending,
          schedule2: { line1b_new_clean_vehicle_repayment: 7_499 },
        }, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Form 8936 dealer repayment does not reconcile with Schedule 2 lines 1b and 1c",
    );
  }
});
