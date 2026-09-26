import { assert, assertEquals, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { form8863 } from "./f8863.ts";

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const worksheet = {
  form1040_line18_tax: 10_000,
  schedule3_line1_foreign_tax_credit: 0,
  schedule3_line2_dependent_care_credit: 0,
  schedule3_line6d: 0,
  schedule3_line6l: 0,
};

const aocStudent = {
  credit_type: "aoc" as const,
  student_name: "Student Test",
  student_ssn: "222-33-4444",
  filer_magi: 70_000,
  filing_status: NodeFilingStatus.Single,
  aoc_adjusted_expenses: 4_000,
  aoc_claimed_4_prior_years: false,
  enrolled_half_time: true,
  completed_4_years_postsec: false,
  felony_drug_conviction: false,
  taxpayer_under_24_no_refundable_aoc: false,
  filing_details: {
    first_name: "Student",
    last_name: "Test",
    name_control: "TEST",
    institutions: [{
      name: "Test University",
      us_address: {
        line1: "1 College Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      current_year_1098t_received: true,
      prior_year_1098t_received: false,
      ein: "12-3456789",
    }],
  },
};

async function validateXsd(xml: string): Promise<void> {
  const tmpPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(tmpPath, xml);
    const output = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", XSD_PATH, tmpPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  } finally {
    await Deno.remove(tmpPath);
  }
}

Deno.test("Form 8863 XML uses capped line 19 and real student detail", () => {
  const xml = form8863.build({
    f8863s: [aocStudent],
    credit_limit_worksheet: { ...worksheet, form1040_line18_tax: 400 },
  });
  assert(
    xml.includes(
      "<RefundableAmerOppCreditAmt>1000</RefundableAmerOppCreditAmt>",
    ),
  );
  assert(
    xml.includes(
      "<NonrefundableEducationCrAmt>400</NonrefundableEducationCrAmt>",
    ),
  );
  assert(xml.includes("<StudentSSN>222334444</StudentSSN>"));
  assert(xml.includes("<EIN>123456789</EIN>"));
});

Deno.test("Form 8863 XML rejects missing structured filing facts", () => {
  assertThrows(
    () =>
      form8863.build({
        f8863s: [{ ...aocStudent, filing_details: undefined }],
        credit_limit_worksheet: worksheet,
      }),
    Error,
    "structured student details",
  );
  assertThrows(
    () =>
      form8863.build({
        f8863s: [{ ...aocStudent, aoc_claimed_4_prior_years: undefined }],
        credit_limit_worksheet: worksheet,
      }),
    Error,
    "four-prior-years answer",
  );
  assertThrows(
    () =>
      form8863.build({
        f8863s: [{
          ...aocStudent,
          filing_details: {
            ...aocStudent.filing_details,
            institutions: [{
              ...aocStudent.filing_details.institutions[0],
              ein: undefined,
            }],
          },
        }],
        credit_limit_worksheet: worksheet,
      }),
    Error,
    "needs its EIN",
  );
});

Deno.test({
  name: "XSD: Form 8863 AOC and LLC validate in TY2025 return",
  ignore: !xsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const xml = buildMefXml({
    f8863: {
      f8863s: [
        aocStudent,
        {
          ...aocStudent,
          credit_type: "llc",
          student_name: "Scholar Test",
          student_ssn: "333-44-5555",
          aoc_adjusted_expenses: undefined,
          llc_adjusted_expenses: 5_000,
          filing_details: {
            ...aocStudent.filing_details,
            first_name: "Scholar",
          },
        },
      ],
      credit_limit_worksheet: worksheet,
    },
  }, filer);
  await validateXsd(xml);
});
