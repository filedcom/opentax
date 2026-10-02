import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../mef/header.ts";
import { Box12Code } from "../nodes/inputs/w2/index.ts";
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

Deno.test("Schedule 2 line 13 rejects unsourced W-2 FICA amount at final export", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 300,
    },
    schedule2: { uncollected_fica: 300 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 13 differs from retained W-2 box 12 codes",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 13 differs from retained W-2 box 12 codes",
  );
});

Deno.test("Schedule 2 line 13 retains both W-2 code groups in native and PDF export", async () => {
  const pending = {
    w2: {
      w2s: [{
        employer_ein: "123456789",
        employer_name: "Example Employer",
        employer_address_line1: "2 Employer Way",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78702",
        employee_ssn: "111223333",
        box1_wages: 0,
        box2_fed_withheld: 0,
        box12_entries: [
          { code: Box12Code.A, amount: 120 },
          { code: Box12Code.M, amount: 80 },
        ],
      }],
    },
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 200,
    },
    schedule2: {
      uncollected_fica: 120,
      uncollected_fica_gtl: 80,
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<UncollSSMedcrRRTAGrpInsTxAmt>200</UncollSSMedcrRRTAGrpInsTxAmt>",
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
    assertEquals(
      validated.code,
      0,
      new TextDecoder().decode(validated.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, filer);
  assert(pdf.length > 0);
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule2: { uncollected_fica: 119, uncollected_fica_gtl: 81 },
      }, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 13 differs from retained W-2 box 12 codes",
  );
  await assertRejects(
    () =>
      buildPdfBytes({
        ...pending,
        w2: {
          w2s: [{
            ...pending.w2.w2s[0],
            box12_entries: [{ code: Box12Code.A, amount: 121 }, {
              code: Box12Code.M,
              amount: 80,
            }],
          }],
        },
      }, filer),
    Error,
    "Schedule 2 line 13 differs from retained W-2 box 12 codes",
  );
});
