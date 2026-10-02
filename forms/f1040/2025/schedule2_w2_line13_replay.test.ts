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

async function assertTy2025Xsd(xml: string): Promise<void> {
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
}

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

Deno.test("Schedule 2 retains W-2 line 13 and 17k taxes in native and PDF export", async () => {
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
          { code: Box12Code.K, amount: 200 },
        ],
      }],
    },
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 400,
    },
    schedule2: {
      uncollected_fica: 120,
      uncollected_fica_gtl: 80,
      golden_parachute_excise: 200,
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<UncollSSMedcrRRTAGrpInsTxAmt>200</UncollSSMedcrRRTAGrpInsTxAmt>",
  );
  assertStringIncludes(
    native.xml,
    "<ExcessParachutePaymentAmt>200</ExcessParachutePaymentAmt>",
  );
  await assertTy2025Xsd(native.xml);
  const pdf = await buildPdfBytes(pending, filer);
  assert(pdf.length > 0);
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule2: {
          uncollected_fica: 119,
          uncollected_fica_gtl: 81,
          golden_parachute_excise: 200,
        },
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
            }, { code: Box12Code.K, amount: 200 }],
          }],
        },
      }, filer),
    Error,
    "Schedule 2 line 13 differs from retained W-2 box 12 codes",
  );
});

Deno.test("Schedule 2 line 17k rejects a bare W-2 code K tax", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 200,
    },
    schedule2: { golden_parachute_excise: 200 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 17k differs from retained W-2 box 12 code K",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 17k differs from retained W-2 box 12 code K",
  );
});

Deno.test("Schedule 2 line 17k rejects a changed W-2 code K amount", async () => {
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
        box12_entries: [{ code: Box12Code.K, amount: 201 }],
      }],
    },
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 200,
    },
    schedule2: { golden_parachute_excise: 200 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 17k differs from retained W-2 box 12 code K",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 17k differs from retained W-2 box 12 code K",
  );
});

Deno.test("Schedule 2 line 17h rejects bare W-2 code Z and 1099-MISC box 15 tax", async () => {
  for (
    const schedule2 of [
      { section409a_excise: 200 },
      { line17h_nqdc_tax: 200 },
    ]
  ) {
    const pending = {
      f1040: {
        filing_status: "single" as const,
        digital_assets: false,
        line23_other_taxes: 200,
      },
      schedule2,
    };
    await assertRejects(
      () => buildMefBundle(pending, { filer, attachments: [] }),
      Error,
      "Schedule 2 line 17h differs from retained",
    );
    await assertRejects(
      () => buildPdfBytes(pending, filer),
      Error,
      "Schedule 2 line 17h differs from retained",
    );
  }
});

Deno.test("Schedule 2 line 17h replays distinct W-2 and 1099-MISC sources", async () => {
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
        box12_entries: [{ code: Box12Code.Z, amount: 100 }],
      }],
    },
    f1099m: {
      f1099ms: [{
        payer_name: "Example Payer",
        payer_tin: "987654321",
        recipient_tin: "111223333",
        box15_nqdc: 1_000,
      }],
    },
    schedule1: {
      line8z_nqdc: 1_000,
      line9_total_other_income: 1_000,
      line10_total_additional_income: 1_000,
    },
    f1040: {
      filing_status: "single" as const,
      taxpayer_ssn: "111223333",
      digital_assets: false,
      line8_additional_income: 1_000,
      line23_other_taxes: 300,
    },
    schedule2: { section409a_excise: 100, line17h_nqdc_tax: 200 },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<IncmNonqlfyDefrdCompPlanAmt>300</IncmNonqlfyDefrdCompPlanAmt>",
  );
  await assertTy2025Xsd(native.xml);
  const pdf = await buildPdfBytes(pending, filer);
  assert(pdf.length > 0);
  await assertRejects(
    () =>
      buildMefBundle({
        ...pending,
        schedule2: { section409a_excise: 100, line17h_nqdc_tax: 199 },
      }, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 17h differs from retained 1099-MISC box 15 tax",
  );
  await assertRejects(
    () =>
      buildPdfBytes({
        ...pending,
        f1099m: {
          f1099ms: [{
            ...pending.f1099m.f1099ms[0],
            recipient_tin: "999887777",
          }],
        },
      }, filer),
    Error,
    "Schedule 2 line 17h sources must belong",
  );
  await assertRejects(
    () =>
      buildPdfBytes({
        ...pending,
        w2: {
          w2s: [{
            ...pending.w2.w2s[0],
            box12_entries: [{ code: Box12Code.Z, amount: 101 }],
          }],
        },
      }, filer),
    Error,
    "Schedule 2 line 17h differs from retained W-2 box 12 code Z",
  );
});
