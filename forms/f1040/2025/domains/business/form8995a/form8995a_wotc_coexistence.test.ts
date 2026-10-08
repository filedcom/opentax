import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { form8995a } from "../../../mef/forms/business/f8995a/f8995a.ts";
import { form8995aPdf } from "../../../pdf/forms/business/f8995a.ts";
import { form5884Pdf } from "../../../pdf/forms/credits/f5884.ts";
import { scheduleCPdf } from "../../../pdf/forms/business/schedule_c.ts";
import { inputSchema as qbiSchema } from "../../../../nodes/intermediate/forms/form8995a/index.ts";
import { inputSchema as wotcSchema } from "../../../../nodes/inputs/f5884/index.ts";
import {
  calculateForm3800Nonpassive,
  type Form3800NonpassiveInput,
} from "../../../../nodes/inputs/f3800/calculation.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-certified-work-opportunity-credit"
)!;

function inputsFor(employeeCount: number, receipts: number) {
  const { w2: _wages, ...inputs } = base.inputs;
  const original = wotcSchema.parse(inputs.f5884);
  const employee = original.f5884s[0];
  const employees = Array.from({ length: employeeCount }, (_, index) => ({
    ...employee,
    employee_reference: `SYNTHETIC-EMP-${index}`,
    certification: {
      ...employee.certification,
      swa_certification_reference: `Synthetic SWA-${index}`,
    },
    wage_records: employee.wage_records.map((record) => ({
      ...record,
      payroll_record_reference: `Synthetic payroll-${index}`,
    })),
  }));
  return {
    ...inputs,
    general: {
      ...(inputs.general as Record<string, unknown>),
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    f5884: { ...original, f5884s: employees },
    schedule_c: [{
      ...(inputs.schedule_c as Record<string, unknown>[])[0],
      line_c_business_name: "Example Retail",
      line_d_ein: "123456789",
      line_1_gross_receipts: receipts,
      line_26_wages: employeeCount * 6_000,
      qbi_w2_wages: employeeCount * 3_600,
      qbi_unadjusted_basis: 0,
      qbi_no_other_adjustments_confirmed: true,
      qbi_wotc_filing_review: {
        employee_w2_records: employees.map((worker) => ({
          employee_reference: worker.employee_reference,
          source_document_reference:
            `Synthetic employer W-2 ${worker.employee_reference}`,
          box1_wages: 6_000,
          box5_wages: 6_000,
          ssa_filing_record_reference:
            `Synthetic SSA filing ${worker.employee_reference}`,
          filed_within_60_days_of_due_date_confirmed: true,
        })),
        all_business_payroll_included_confirmed: true,
        no_other_business_or_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: true,
        no_qualified_property_confirmed: true,
        review_reference: "Synthetic unmodified-box wage and 280C review",
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
      },
    }],
  };
}

async function assertSchema(xml: string) {
  const xsd = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const process = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(xml));
  await writer.close();
  const result = await process.output();
  assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
}

Deno.test("Form 8995-A files full and tax-limited certified WOTC after wage, SE and QBI calculation", async () => {
  for (
    const scenario of [
      {
        id: "full-credit",
        employees: 1,
        receipts: 310_000,
        credit: 2_400,
        profit: 306_400,
        seDeduction: 15_021,
        qbi: 291_379,
        deduction: 1_800,
        incomeTax: 65_387,
        allowed: 2_400,
      },
      {
        id: "partial-credit",
        employees: 80,
        receipts: 600_000,
        credit: 192_000,
        profit: 312_000,
        seDeduction: 15_096,
        qbi: 296_904,
        deduction: 56_231,
        incomeTax: 49_038,
        allowed: 43_028,
      },
    ]
  ) {
    const result = f1040_2025.executeReturn(
      inputsFor(scenario.employees, scenario.receipts),
    );
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const qbi = qbiSchema.parse(pending.form8995a);
    assertEquals(
      qbi.single_schedule_c_source?.business.wotc_wage_reduction,
      scenario.credit,
    );
    assertEquals(qbi.qbi, scenario.qbi);
    assertEquals(qbi.w2_wages, scenario.employees * 3_600);
    assertEquals(
      qbi.single_schedule_c_source?.se_tax_deduction,
      scenario.seDeduction,
    );
    assertEquals(pending.schedule1.line3_schedule_c, scenario.profit);
    assertEquals(pending.schedule_se.net_profit_schedule_c, scenario.profit);
    assertEquals(pending.schedule1.line15_se_deduction, scenario.seDeduction);
    assertEquals(pending.f1040.line13_qbi_deduction, scenario.deduction);
    assertEquals(pending.f1040.line16_income_tax, scenario.incomeTax);
    assertEquals(pending.f3800.allowed_credit, scenario.allowed);
    assertEquals(pending.schedule3.line6a_total, scenario.allowed);
    assertEquals(pending.f1040.line20_nonrefundable_credits, scenario.allowed);
    assertEquals(
      pending.f1040.line22_tax_after_credits,
      scenario.incomeTax - scenario.allowed,
    );
    const fields = form8995aPdf.projectFields!(pending.form8995a, pending);
    assertEquals(fields.line2, scenario.qbi);
    assertEquals(fields.line4, scenario.employees * 3_600);
    assertEquals(fields.line39, scenario.deduction);
    assertEquals(fields.line40, 0);
    assertEquals(
      form5884Pdf.projectFields!(pending.f5884, pending).line2,
      scenario.credit,
    );
    const businessFields = scheduleCPdf.projectFields!(
      pending.schedule_c,
      pending,
    ).schedule_c_instances as Record<string, unknown>[];
    assertEquals(businessFields[0].line_26_wages, scenario.employees * 3_600);
    assertEquals(businessFields[0].line31, scenario.profit);
    const native = form8995a.build(qbi, { filer: base.filer, pending });
    assertStringIncludes(
      native,
      `<QualifiedBusinessIncomeAmt>${scenario.qbi}</QualifiedBusinessIncomeAmt>`,
    );
    assertStringIncludes(
      native,
      `<AllocableShareW2WagesAmt>${
        scenario.employees * 3_600
      }</AllocableShareW2WagesAmt>`,
    );
    assertStringIncludes(
      native,
      `<QualifiedBusinessIncomeDedAmt>${scenario.deduction}</QualifiedBusinessIncomeDedAmt>`,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS8995A documentId=");
    assertStringIncludes(prepared.bundle.xml, "<IRS5884 documentId=");
    assertStringIncludes(prepared.bundle.xml, "<IRS3800 documentId=");
    assertEquals(prepared.bundle.xml.includes("<IRS8995 documentId="), false);
    await assertSchema(prepared.bundle.xml);
    const pdf = await prepared.renderPdf();
    assert(pdf.length > 0);
    if (Deno.args.includes("--write-review-artifacts")) {
      const directory = new URL(
        `../../../.state/research/ty2025-filled-pdf-review/2026-10-06-form8995a-wotc/${scenario.id}/`,
        import.meta.url,
      ).pathname;
      await Deno.mkdir(directory, { recursive: true });
      await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
      await Deno.writeTextFile(`${directory}return.xml`, prepared.bundle.xml);
    }
  }
});

Deno.test("Form 3800 rounds the entered percentage line before WOTC tax-use allocation", async () => {
  // Quarter-, half-, and three-quarter-dollar raw line 13 values must produce
  // whole-dollar later lines. Rounding only the raw final credit is wrong.
  for (
    const [receipts, rawAllowed, filedAllowed] of [
      [600_000, 43_028.5, 43_028],
      [600_010, 43_030.75, 43_031],
      [600_020, 43_032.25, 43_032],
    ]
  ) {
    const result = f1040_2025.executeReturn(inputsFor(80, receipts));
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const context = pending.f3800.tax_context as Form3800NonpassiveInput;
    const raw = calculateForm3800Nonpassive(context, {
      line2: 0,
      line3: 0,
      line23: 0,
      line24: 0,
      line32: 0,
      line33: 0,
    });
    assertEquals(raw.line38, rawAllowed);
    assertEquals(pending.f3800.allowed_credit, filedAllowed);
    assertEquals(pending.f1040.line20_nonrefundable_credits, filedAllowed);
    assertEquals(
      form5884Pdf.projectFields!(pending.f5884, pending).line2,
      192_000,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
    await assertSchema(prepared.bundle.xml);
  }
});

Deno.test("Form 8995-A WOTC rejects altered employer, employee, wage, SE and return sources", () => {
  const result = f1040_2025.executeReturn(inputsFor(80, 600_000));
  const pending = normalizeAllPending(result.pending);
  const mutations: ((copy: typeof pending) => void)[] = [
    (copy) => {
      delete copy.f5884;
    },
    (copy) => {
      delete copy.form8995a.single_schedule_c_source;
    },
    (copy) => {
      copy.schedule_c.wotc_wage_reductions = [{
        business_reference: "REVIEW-WOTC-BUSINESS-1",
        credit_amount: 43_028,
      }];
    },
    (copy) => {
      (copy.f3800.f5884_credit as Record<string, unknown>).credit_amount =
        43_028;
    },
    (copy) => {
      (copy.f3800.f5884_credit as Record<string, unknown>)
        .subject_to_passive_activity_limit = true;
    },
    (copy) => {
      (copy.f5884.f5884s as Record<string, unknown>[])[0].hours_worked = 120;
    },
    (copy) => {
      (copy.f5884.f5884s as Record<string, unknown>[])[0].employee_reference =
        "UNLINKED-EMPLOYEE";
    },
    (copy) => {
      (copy.schedule_c.schedule_cs as Record<string, unknown>[])[0]
        .qbi_w2_wages = 480_000;
    },
    (copy) => {
      (copy.schedule_c.schedule_cs as Record<string, unknown>[])[0]
        .qbi_wotc_filing_review = undefined;
    },
    (copy) => {
      copy.schedule_se.net_profit_schedule_c = 120_000;
    },
    (copy) => {
      copy.schedule1.line15_se_deduction = 10_000;
    },
    (copy) => {
      copy.schedule1.line3_schedule_c = 120_000;
    },
    (copy) => {
      copy.f1040.line11_agi = 300_000;
    },
    (copy) => {
      copy.f1040.line13_qbi_deduction = 57_000;
    },
    (copy) => {
      copy.f1040.line15_taxable_income = 225_000;
    },
  ];
  for (const mutate of mutations) {
    const altered = structuredClone(pending);
    mutate(altered);
    assertThrows(() =>
      form8995a.build(qbiSchema.parse(altered.form8995a), {
        filer: base.filer,
        pending: altered,
      })
    );
    assertThrows(() => form8995aPdf.projectFields!(altered.form8995a, altered));
  }
});
