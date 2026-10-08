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

function worker(
  id: string,
  wages: number,
  kind: "adult" | "student" | "working-minor",
  withheld = 0,
) {
  const fica = kind !== "student" && wages >= 2800 ? wages : 0;
  return {
    employee_id: id,
    payroll_source_reference: `2025-${id}-payroll`,
    relationship: "unrelated" as const,
    age_18_or_older_for_fica: kind === "adult",
    ...(kind === "student"
      ? {
        student_minor_fica_exclusion: {
          birth_date: "2008-05-10",
          birth_date_source_reference: `${id}-birth`,
          student_enrollment_source_reference: `${id}-school`,
          student_during_2025_verified: true as const,
        },
      }
      : {}),
    ...(kind === "working-minor"
      ? {
        nonstudent_minor_fica_inclusion: {
          birth_date: "2008-05-10",
          birth_date_source_reference: `${id}-birth`,
          education_status_source_reference: `${id}-nonenrollment`,
          principal_occupation_source_reference: `${id}-principal-occupation`,
          not_a_student_during_2025_verified: true as const,
          household_services_principal_occupation_verified: true as const,
        },
      }
      : {}),
    ordinary_cash_only: true as const,
    annual_cash_wages: wages,
    quarterly_cash_wages: [wages / 4, wages / 4, wages / 4, wages / 4] as [
      number,
      number,
      number,
      number,
    ],
    w2: {
      source_reference: `${id}-w2`,
      box2_federal_income_tax_withheld: withheld,
      box3_social_security_wages: fica,
      box5_medicare_wages: fica,
    },
    ...(withheld
      ? {
        federal_withholding_agreement: {
          w4_source_reference: `${id}-w4`,
          employee_requested_and_employer_agreed: true as const,
        },
      }
      : {}),
  };
}

function source(kind: "adult" | "working-minor" | "student") {
  const workers = kind === "student"
    ? [
      worker("student-main", 3000, "student", 40),
      worker("adult-small", 600, "adult"),
    ]
    : [
      worker("main", kind === "adult" ? 2800 : 3100, kind, 40),
      worker("student-small", 400, "student", 10),
      worker("adult-small", 400, "adult"),
    ];
  return inputSchema.parse({
    employer_ein: "123456789",
    cash_wages_over_2025_limit: kind !== "student",
    cash_wages_over_quarter_limit: false,
    ss_wages: kind === "student" ? 0 : kind === "adult" ? 2800 : 3100,
    medicare_wages: kind === "student" ? 0 : kind === "adult" ? 2800 : 3100,
    federal_income_tax_withheld: kind === "student" ? 40 : 50,
    fica_only_payroll: {
      all_household_employees_included: true,
      prior_year_payroll_source_reference:
        "reviewed-2024-complete-household-payroll",
      prior_year_quarter_cash_wages: [950, 900, 850, 999],
      employee_wages: workers,
    },
  });
}

Deno.test("Schedule H complete multiworker payroll joins per-worker FICA and aggregate FUTA quarters to full return", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const root = flag >= 0 ? Deno.args[flag + 1] : undefined;
  for (const kind of ["adult", "working-minor", "student"] as const) {
    const payroll = source(kind);
    const total = kind === "adult" ? 478 : kind === "working-minor" ? 524 : 40;
    assertEquals(computeScheduleHAmounts(payroll, 2025).totalTax, total);
    const inputs = { ...structuredClone(base.inputs), schedule_h: payroll };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule2.line9_household_employment, total);
    assertEquals(result.pending.f1040.line23_other_taxes, total);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(
      bundle.xml.includes(
        `<CombinedFUTATaxPlusNetTaxesAmt>${total}</CombinedFUTATaxPlusNetTaxesAmt>`,
      ),
      true,
    );
    assertEquals(bundle.xml.includes("<FUTATaxAmt>"), false);
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const checked = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, temp],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    } finally {
      await Deno.remove(temp);
    }
    assertEquals(origins.filter((x) => x.formKey === "schedule_h").length, 1);
    const changed = structuredClone(payroll);
    changed.fica_only_payroll!.employee_wages.at(-1)!.payroll_source_reference =
      "substituted-last-worker";
    assertThrows(
      () => scheduleH.build(changed, { filer, pending }),
      Error,
      "retained payroll",
    );
    assertThrows(() =>
      scheduleHPdf.instances!(
        scheduleHPdf.projectFields!(changed, {}),
        filer,
        {
          schedule_h: payroll,
          schedule2: { line9_household_employment: total },
        },
      )
    );
    for (
      const builder of [() =>
        buildMefBundle({
          ...pending,
          schedule2: {
            ...pending.schedule2,
            line9_household_employment: total - 1,
          },
        }, { filer, attachments: [] }), () =>
        buildPdfBytes(
          {
            ...pending,
            schedule2: {
              ...pending.schedule2,
              line9_household_employment: total - 1,
            },
          },
          filer,
          ".pdf-cache",
        )]
    ) {
      await assertRejects(builder);
    }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${kind}.json`,
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
      await Deno.writeTextFile(`${root}/${kind}.xml`, bundle.xml);
      await Deno.writeFile(`${root}/${kind}.pdf`, pdf);
    }
  }
});

Deno.test("Schedule H multiworker payroll rejects aggregate qualifying quarters and last-worker conflicts", () => {
  const valid = source("adult");
  const altered = () => structuredClone(valid);
  const quarter = altered();
  quarter.fica_only_payroll!.employee_wages[2].quarterly_cash_wages = [
    200,
    100,
    100,
    0,
  ];
  // Every employee remains individually under $1000, but the employer paid $1000 in Q1.
  assertThrows(
    () => computeScheduleHAmounts(quarter, 2025),
    Error,
    "aggregate employee wages",
  );
  const prior = altered();
  prior.fica_only_payroll!.prior_year_quarter_cash_wages[3] = 1000;
  assertThrows(() => computeScheduleHAmounts(prior, 2025), Error, "both years");
  const duplicate = altered();
  duplicate.fica_only_payroll!.employee_wages[2].employee_id = "main";
  assertThrows(() => computeScheduleHAmounts(duplicate, 2025), Error, "unique");
  const w2 = altered();
  w2.fica_only_payroll!.employee_wages[2].w2!.box3_social_security_wages = 400;
  assertThrows(() => computeScheduleHAmounts(w2, 2025), Error, "Form W-2");
  const w4 = altered();
  w4.fica_only_payroll!.employee_wages[1].federal_withholding_agreement =
    undefined;
  assertThrows(() => computeScheduleHAmounts(w4, 2025), Error, "Form W-4");
  const missing = altered();
  missing.fica_only_payroll!.employee_wages.pop();
  const misclassified = source("working-minor");
  const workingMinor = misclassified.fica_only_payroll!.employee_wages[0];
  if (workingMinor.relationship !== "unrelated") {
    throw new Error("Expected unrelated principal-occupation worker");
  }
  workingMinor.nonstudent_minor_fica_inclusion = undefined;
  assertThrows(
    () => computeScheduleHAmounts(misclassified, 2025),
    Error,
    "classification",
  );
  assertThrows(() =>
    inputSchema.parse({
      ...missing,
      fica_only_payroll: {
        ...missing.fica_only_payroll,
        all_household_employees_included: false,
      },
    })
  );
});

Deno.test("Schedule H preserves source cash cents and computes tax from filed wage and withholding operands", async () => {
  const payroll = source("adult");
  const employee = payroll.fica_only_payroll!.employee_wages[0];
  payroll.ss_wages =
    payroll.medicare_wages =
    employee.annual_cash_wages =
    employee.w2!.box3_social_security_wages =
    employee.w2!.box5_medicare_wages =
      2802.49;
  employee.quarterly_cash_wages[3] = 702.49;
  payroll.federal_income_tax_withheld = 50.49;
  employee.w2!.box2_federal_income_tax_withheld = 40.49;
  const before = structuredClone(payroll);
  const amounts = computeScheduleHAmounts(payroll, 2025);
  assertEquals(amounts.socialSecurityTax, 347);
  assertEquals(amounts.medicareTax, 81);
  assertEquals(amounts.totalTax, 478);
  const result = f1040_2025.executeReturn({
    ...structuredClone(base.inputs),
    schedule_h: payroll,
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2.line9_household_employment, 478);
  assertEquals(result.pending.f1040.line23_other_taxes, 478);
  assertEquals(payroll, before);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<TotSocSecMedcrAndFedIncmTaxAmt>478</TotSocSecMedcrAndFedIncmTaxAmt>",
    ),
    true,
  );
  const projected = scheduleHPdf.projectFields!(payroll, {}) as Record<
    string,
    unknown
  >;
  assertEquals(projected.line2_social_security_tax, 347);
  assertEquals(projected.line8_fica_and_withholding, 478);
  assertEquals(projected.line26_total_tax, undefined);
  const changed = structuredClone(payroll);
  changed.fica_only_payroll!.employee_wages[0].w2!
    .box2_federal_income_tax_withheld = 40.48;
  assertThrows(
    () => computeScheduleHAmounts(changed, 2025),
    Error,
    "differ from employee Forms W-2",
  );
});
