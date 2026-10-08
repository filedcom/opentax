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

Deno.test("Schedule 2 line 5 rejects bare Form 4137 tip tax", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 230,
    },
    schedule2: { line5_unreported_tip_tax: 230 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 5 differs from retained Form 4137 tax",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 5 differs from retained Form 4137 tax",
  );
});

Deno.test("Schedule 2 line 5 retains Form 4137 tax in native and PDF returns", async () => {
  const pending = {
    w2: {
      w2s: [{
        employer_name: "CAFE",
        employer_ein: "123456789",
        employer_address_line1: "2 Employer Way",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78702",
        employee_ssn: "111223333",
        box1_wages: 30_000,
        box2_fed_withheld: 0,
        box3_ss_wages: 30_000,
      }],
    },
    form4137: {
      taxpayer_ssn: "111223333",
      forms: [{
        recipient: "taxpayer" as const,
        employers: [{
          name: "CAFE",
          ein: "12-3456789",
          tips_received: 5_000,
          tips_reported: 2_000,
        }],
        ss_wages_from_w2: 30_000,
      }],
      w2_tip_sources: [{
        employee_ssn: "111223333",
        employer_name: "CAFE",
        employer_ein: "123456789",
        allocated_tips: 0,
        ss_wages_and_tips: 30_000,
      }],
    },
    f1040: {
      filing_status: "single" as const,
      taxpayer_ssn: "111223333",
      digital_assets: false,
      line1a_wages: 30_000,
      line1c_unreported_tips: 3_000,
      line23_other_taxes: 230,
    },
    agi_aggregator: { line1c_unreported_tips: 3_000 },
    schedule2: { line5_unreported_tip_tax: 230 },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<SocSecMedicareTaxUnrptdTipAmt>230</SocSecMedicareTaxUnrptdTipAmt>",
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
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule2: { line5_unreported_tip_tax: 229 },
      }, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 5 differs from retained Form 4137 tax",
  );
  await assertRejects(
    () =>
      buildPdfBytes({
        ...pending,
        schedule2: { line5_unreported_tip_tax: 229 },
      }, filer),
    Error,
    "Schedule 2 line 5 differs from retained Form 4137 tax",
  );
});
