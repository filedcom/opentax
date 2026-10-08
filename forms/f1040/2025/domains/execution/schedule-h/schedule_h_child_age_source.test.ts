import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../../../../nodes/intermediate/forms/schedule_h/index.ts";
import { scheduleH } from "../../../mef/forms/taxes/schedule_h.ts";
import { scheduleHPdf } from "../../../pdf/forms/taxes/schedule_h.ts";
const base = pdfReviewFixtures.find((x) => x.id === "single-w2-refund")!;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const source = {
  employer_ein: "123456789",
  cash_wages_over_2025_limit: false,
  cash_wages_over_quarter_limit: false,
  federal_income_tax_withheld: 250,
  family_withholding_only_payroll: {
    all_household_employees_included: true,
    employer_ssn: "400001032",
    employee: {
      employee_id: "child-employee-1",
      employee_ssn: "400001041",
      relationship: "child",
      relationship_source_reference: "family-relationship-record",
      birth_date: "2006-06-15",
      birth_date_source_reference: "child-birth-record",
      payroll_source_reference: "2025-child-payroll-ledger",
      ordinary_cash_only: true,
      annual_cash_wages: 5_000,
      quarterly_cash_wages: [1_250, 1_250, 1_250, 1_250],
      federal_income_tax_withholding_requested_and_agreed: true,
      w4_source_reference: "2025-child-form-w4",
      w2: {
        source_reference: "2025-child-form-w2",
        employee_ssn: "400001041",
        box1_wages: 5_000,
        box2_federal_income_tax_withheld: 250,
        box3_social_security_wages: 0,
        box5_medicare_wages: 0,
      },
    },
  },
} as const;

Deno.test("Schedule H under-21 child source retains family FICA/FUTA exclusions through full return and packet", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts"),
    root = flag >= 0 ? Deno.args[flag + 1] : undefined;
  for (
    const [id, birth] of [["age20", "2005-01-01"], ["turns18", "2007-06-15"], [
      "age17",
      "2008-06-15",
    ], ["age15", "2010-06-15"]]
  ) {
    const raw: any = structuredClone(source),
      general: any = base.inputs.general;
    raw.family_withholding_only_payroll.employer_ssn = general.taxpayer_ssn
      .replace(/\D/g, "");
    raw.family_withholding_only_payroll.employee.birth_date = birth;
    raw.family_withholding_only_payroll.employee.birth_date_source_reference =
      `${id}-reviewed-birth-record`;
    const payroll = inputSchema.parse(raw);
    assertEquals(computeScheduleHAmounts(payroll, 2025).totalTax, 250);
    const inputs = { ...structuredClone(base.inputs), schedule_h: payroll };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule2.line9_household_employment, 250);
    assertEquals(result.pending.f1040.line23_other_taxes, 250);
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(
      bundle.xml.includes(
        "<CombinedFUTATaxPlusNetTaxesAmt>250</CombinedFUTATaxPlusNetTaxesAmt>",
      ),
      true,
    );
    const householdXml =
      bundle.xml.match(/<IRS1040ScheduleH\b[\s\S]*?<\/IRS1040ScheduleH>/)![0];
    assertEquals(householdXml.includes("<FUTATaxAmt>"), false);
    assertEquals(householdXml.includes("<SocialSecurityTaxAmt>"), false);
    const origins: any[] = [],
      pdf = await buildPdfBytes(
        bundle.pending,
        filer,
        ".pdf-cache",
        bundle,
        origins,
      );
    assertEquals(origins.filter((x) => x.formKey === "schedule_h").length, 1);
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const check = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, temp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
    } finally {
      await Deno.remove(temp);
    }
    const changed = structuredClone(payroll);
    if (
      changed.family_withholding_only_payroll!.employee.relationship !== "child"
    ) throw new Error("Expected child source");
    changed.family_withholding_only_payroll!.employee
      .birth_date_source_reference = "different-birth-record";
    assertThrows(
      () => scheduleH.build(changed, { filer, pending }),
      Error,
      "retained payroll",
    );
    assertThrows(() =>
      scheduleHPdf.instances!(
        scheduleHPdf.projectFields!(changed, {}),
        filer,
        { schedule_h: payroll, schedule2: { line9_household_employment: 250 } },
      )
    );
    await assertRejects(() =>
      buildMefBundle({
        ...pending,
        schedule2: { ...pending.schedule2, line9_household_employment: 249 },
      }, { filer, attachments: [] })
    );
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            preparedPending: bundle.pending,
            carryforwards: result.carryforwards,
            filer,
            origins,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${id}.xml`, bundle.xml);
      await Deno.writeFile(`${root}/${id}.pdf`, pdf);
    }
  }
});
Deno.test("Schedule H child source rejects 21-year-old, impossible date and source conflicts", () => {
  for (const birth of ["2004-12-31", "2025-01-01"]) {
    const raw: any = structuredClone(source);
    raw.family_withholding_only_payroll.employee.birth_date = birth;
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
  }
  const same: any = structuredClone(source);
  same.family_withholding_only_payroll.employee.birth_date_source_reference =
    same.family_withholding_only_payroll.employee.payroll_source_reference;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(same), 2025));
  const fica: any = structuredClone(source);
  fica.ss_wages = 5000;
  fica.medicare_wages = 5000;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(fica), 2025));
});
