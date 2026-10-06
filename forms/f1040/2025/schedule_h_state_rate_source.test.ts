import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../nodes/intermediate/forms/schedule_h/index.ts";
import { scheduleH } from "./mef/forms/schedule_h.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const optionalEnv = (name: string): string | undefined => {
  try {
    return Deno.env.get(name);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
};
const xsd = optionalEnv("SCHEDULE_H_STATE_RATE_XSD_PATH") ?? new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

function source(late = false) {
  return {
    employer_ein: "123456789",
    cash_wages_over_2025_limit: true,
    cash_wages_over_quarter_limit: true,
    ss_wages: 8_000,
    medicare_wages: 8_000,
    federal_income_tax_withheld: 0,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: !late,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 7_000,
      all_household_employees_included: true,
      prior_year_quarter_threshold_met: false,
      ...(late ? { late_contributions: 200 } : {}),
      employee_wages: [{
        employee_id: "household-adult",
        payroll_source_reference: "2025-complete-adult-payroll",
        relationship: "unrelated",
        age_18_or_older_for_fica: true,
        ordinary_cash_only: true,
        annual_cash_wages: 8_000,
        quarterly_cash_wages: [2_000, 2_000, 2_000, 2_000],
        w2: {
          source_reference: "2025-issued-adult-w2",
          box2_federal_income_tax_withheld: 0,
          box3_social_security_wages: 8_000,
          box5_medicare_wages: 8_000,
        },
      }],
      state_rows: [
        {
          state: "CA",
          taxable_state_wages: 2_000,
          experience_rate: .03,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-03-31",
          contributions_paid_by_due_date: 60,
        },
        {
          state: "CA",
          taxable_state_wages: 4_000,
          experience_rate: .05,
          rate_period_from: "2025-04-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: late ? 0 : 200,
        },
        {
          state: "TX",
          taxable_state_wages: 2_000,
          experience_rate: .027,
          rate_period_from: "2025-01-01",
          rate_period_to: "2025-12-31",
          contributions_paid_by_due_date: 54,
        },
      ],
      credit_reduction_wages: [{ state: "CA", taxable_futa_wages: 6_000 }],
      state_payroll_review: {
        all_household_cash_payments_included: true,
        rate_notices: [
          {
            state: "CA",
            period_from: "2025-01-01",
            period_to: "2025-03-31",
            experience_rate: .03,
            annual_taxable_wage_base: 7_000,
            source_reference: "CA-rate-notice-Q1",
          },
          {
            state: "CA",
            period_from: "2025-04-01",
            period_to: "2025-12-31",
            experience_rate: .05,
            annual_taxable_wage_base: 7_000,
            source_reference: "CA-rate-notice-Q2-Q4",
          },
          {
            state: "TX",
            period_from: "2025-01-01",
            period_to: "2025-12-31",
            experience_rate: .027,
            annual_taxable_wage_base: 9_000,
            source_reference: "TX-rate-notice-2025",
          },
        ],
        wage_payments: [
          {
            employee_id: "household-adult",
            paid_date: "2025-03-31",
            state: "CA",
            cash_wages: 2_000,
            payment_reference: "adult-CA-Q1-pay",
          },
          {
            employee_id: "household-adult",
            paid_date: "2025-06-30",
            state: "CA",
            cash_wages: 2_000,
            payment_reference: "adult-CA-Q2-pay",
          },
          {
            employee_id: "household-adult",
            paid_date: "2025-09-30",
            state: "CA",
            cash_wages: 2_000,
            payment_reference: "adult-CA-Q3-pay",
          },
          {
            employee_id: "household-adult",
            paid_date: "2025-12-31",
            state: "TX",
            cash_wages: 2_000,
            payment_reference: "adult-TX-Q4-pay",
          },
        ],
        contribution_payments: [
          {
            rate_notice_source_reference: "CA-rate-notice-Q1",
            paid_date: "2025-04-15",
            amount: 60,
            payment_reference: "CA-Q1-SUTA-receipt",
          },
          {
            rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
            paid_date: late ? "2026-04-16" : "2026-01-15",
            amount: 200,
            payment_reference: "CA-Q2-Q4-SUTA-receipt",
          },
          {
            rate_notice_source_reference: "TX-rate-notice-2025",
            paid_date: "2026-01-15",
            amount: 54,
            payment_reference: "TX-Q4-SUTA-receipt",
          },
        ],
      },
    },
  };
}

function changeSourceQuarterWages(raw: any, first: number, fourth: number) {
  const unemployment = raw.federal_unemployment;
  const annual = first + 4_000 + fourth;
  unemployment.employee_wages[0].annual_cash_wages = annual;
  unemployment.employee_wages[0].quarterly_cash_wages = [
    first,
    2_000,
    2_000,
    fourth,
  ];
  unemployment.employee_wages[0].w2.box3_social_security_wages = annual;
  unemployment.employee_wages[0].w2.box5_medicare_wages = annual;
  raw.ss_wages = annual;
  raw.medicare_wages = annual;
  unemployment.state_payroll_review.wage_payments[0].cash_wages = first;
  unemployment.state_payroll_review.wage_payments[3].cash_wages = fourth;
  unemployment.state_rows[0].taxable_state_wages = first;
  unemployment.state_rows[2].taxable_state_wages = fourth;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = first + 4_000;
}

async function verifyAdditionalPacket(
  raw: any,
  id: string,
  expectedTax: number,
  expectedPages = 7,
) {
  const schedule = inputSchema.parse(raw);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(
    result.pending.schedule2.line9_household_employment,
    expectedTax,
  );
  assertEquals(result.pending.f1040.line23_other_taxes, expectedTax);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, expectedPages);
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
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/${id}.json`,
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
    await Deno.writeTextFile(`${dir}/${id}.xml`, bundle.xml);
    await Deno.writeFile(`${dir}/${id}.pdf`, pdf);
  }
  return { schedule, result, bundle };
}

Deno.test("Schedule H sources changed CA rates, TX wages and contributions into Section B full packet", async () => {
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  for (
    const [id, late, expected] of [
      ["changed-rate-multistate", false, {
        credit: 306,
        futa: 114,
        tax: 1_338,
        tentative: 432,
      }],
      ["changed-rate-late", true, {
        credit: 291,
        futa: 129,
        tax: 1_353,
        tentative: 232,
      }],
    ] as const
  ) {
    const schedule = inputSchema.parse(source(late));
    const amounts = computeScheduleHAmounts(schedule, 2025);
    assertEquals(amounts.socialSecurityTax, 992);
    assertEquals(amounts.medicareTax, 232);
    assertEquals(amounts.sectionB?.additionalCredit, 118);
    assertEquals(amounts.sectionB?.tentativeCredit, expected.tentative);
    assertEquals(amounts.sectionB?.allowedCredit, expected.credit);
    assertEquals(amounts.futaTax, expected.futa);
    assertEquals(amounts.totalTax, expected.tax);
    const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule2.line9_household_employment,
      expected.tax,
    );
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: any[] = [],
      pdf = await buildPdfBytes(
        bundle.pending,
        filer,
        ".pdf-cache",
        bundle,
        origins,
      );
    assertEquals(
      origins.filter((origin) => origin.formKey === "schedule_h").length,
      3,
    );
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
    const altered: any = structuredClone(schedule);
    altered.federal_unemployment.state_rows[1].taxable_state_wages = 3_999;
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    await assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${id}.json`,
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
      await Deno.writeTextFile(`${dir}/${id}.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/${id}.pdf`, pdf);
    }
  }
});

Deno.test("Schedule H state review rejects dated payroll, rate, contribution and credit conflicts", () => {
  const wrong = (edit: (raw: any) => void) => {
    const raw: any = source();
    edit(raw);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
  };
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[0].cash_wages =
      1_999
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[0].employee_id =
      "missing-worker"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[1].paid_date =
      "2025-02-30"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.wage_payments[1].paid_date =
      "2025-03-31"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[1].period_from =
      "2025-03-31"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[1]
      .experience_rate = .04
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[0]
      .experience_rate = .030245
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[0].state = "ZZ"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[2]
      .annual_taxable_wage_base = 7_000
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.rate_notices[0]
      .source_reference = "2025-issued-adult-w2"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .amount = 199
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .paid_date = "2026-04-16"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .paid_date = "2025-08-01"
  );
  wrong((s) =>
    s.federal_unemployment.state_payroll_review.contribution_payments[1]
      .payment_reference = "CA-Q1-SUTA-receipt"
  );
  wrong((s) =>
    s.federal_unemployment.credit_reduction_wages[0].taxable_futa_wages = 5_999
  );
  wrong((s) => s.federal_unemployment.all_futa_wages_state_taxable = false);
  wrong((s) => s.federal_unemployment.taxable_futa_wages = 8_000);
});

Deno.test("Schedule H state contribution cents reconcile exact receipts before filing", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  changeSourceQuarterWages(raw, 2_003, 2_000);
  unemployment.state_rows[0].experience_rate = .0302;
  unemployment.state_rows[0].contributions_paid_by_due_date = 60.49;
  unemployment.state_payroll_review.rate_notices[0].experience_rate = .0302;
  unemployment.state_payroll_review.contribution_payments[0].amount = 60.49;
  const schedule = inputSchema.parse(raw);
  const amounts = computeScheduleHAmounts(schedule, 2025);
  assertEquals(amounts.sectionB?.contributions, 314);
  assertEquals(amounts.sectionB?.allowedCredit, 306);
  assertEquals(amounts.totalTax, 1_338);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 7);
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
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/changed-rate-cents.json`,
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
    await Deno.writeTextFile(`${dir}/changed-rate-cents.xml`, bundle.xml);
    await Deno.writeFile(`${dir}/changed-rate-cents.pdf`, pdf);
  }
  unemployment.state_payroll_review.contribution_payments[0].amount = 30.24;
  unemployment.state_payroll_review.contribution_payments.push({
    rate_notice_source_reference: "CA-rate-notice-Q1",
    paid_date: "2025-04-15",
    amount: 30.25,
    payment_reference: "CA-Q1-second-SUTA-receipt",
  });
  assertEquals(
    computeScheduleHAmounts(inputSchema.parse(raw), 2025).totalTax,
    1_338,
  );
  unemployment.state_payroll_review.contribution_payments[1].amount = 30.24;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
});

Deno.test("Schedule H rounds two source-cent rows before an uncapped credit", async () => {
  const raw: any = source(true);
  const unemployment = raw.federal_unemployment;
  changeSourceQuarterWages(raw, 2_003, 2_001);
  unemployment.state_rows[0].experience_rate = .0302;
  unemployment.state_rows[0].contributions_paid_by_due_date = 60.49;
  unemployment.state_payroll_review.rate_notices[0].experience_rate = .0302;
  unemployment.state_payroll_review.contribution_payments[0].amount = 60.49;
  unemployment.state_rows[2].experience_rate = .02723;
  unemployment.state_rows[2].contributions_paid_by_due_date = 54.49;
  unemployment.state_payroll_review.rate_notices[2].experience_rate = .02723;
  unemployment.state_payroll_review.contribution_payments[2].amount = 54.49;
  const schedule = inputSchema.parse(raw);
  const amounts = computeScheduleHAmounts(schedule, 2025);
  assertEquals(
    amounts.sectionB?.rows.map((row) => row.contributions_paid_by_due_date),
    [60, 0, 54],
  );
  assertEquals(amounts.sectionB?.contributions, 114);
  assertEquals(amounts.sectionB?.tentativeCredit, 232);
  assertEquals(amounts.sectionB?.allowedCredit, 291);
  assertEquals(amounts.futaTax, 129);
  assertEquals(amounts.totalTax, 1_353);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2.line9_household_employment, 1_353);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<TotalContriStateUnemplFundAmt>114</TotalContriStateUnemplFundAmt>",
    ),
    true,
  );
  assertEquals(
    bundle.xml.includes("<TentativeFUTACreditAmt>232</TentativeFUTACreditAmt>"),
    true,
  );
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 7);
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
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/changed-rate-late-cents.json`,
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
    await Deno.writeTextFile(`${dir}/changed-rate-late-cents.xml`, bundle.xml);
    await Deno.writeFile(`${dir}/changed-rate-late-cents.pdf`, pdf);
  }
});

Deno.test("Schedule H late source cents cannot leak fractional tax to Form 1040", async () => {
  const raw: any = source(true);
  const unemployment = raw.federal_unemployment;
  unemployment.state_rows[0].contributions_paid_by_due_date = 30.49;
  unemployment.state_payroll_review.contribution_payments[0].amount = 30.49;
  unemployment.state_payroll_review.contribution_payments.push({
    rate_notice_source_reference: "CA-rate-notice-Q1",
    paid_date: "2026-04-16",
    amount: 29.51,
    payment_reference: "CA-Q1-late-balance-receipt",
  });
  unemployment.late_contributions = 229.51;
  const schedule = inputSchema.parse(raw);
  const amounts = computeScheduleHAmounts(schedule, 2025);
  assertEquals(amounts.sectionB?.contributions, 84);
  assertEquals(amounts.sectionB?.tentativeCredit, 202);
  assertEquals(amounts.sectionB?.allowedCredit, 288);
  assertEquals(amounts.futaTax, 132);
  assertEquals(amounts.totalTax, 1_356);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule2.line9_household_employment, 1_356);
  assertEquals(result.pending.f1040.line23_other_taxes, 1_356);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<TotalContriStateUnemplFundAmt>84</TotalContriStateUnemplFundAmt>",
    ),
    true,
  );
  assertEquals(bundle.xml.includes("<FUTATaxAmt>132</FUTATaxAmt>"), true);
  const origins: any[] = [];
  const pdf = await buildPdfBytes(
    bundle.pending,
    filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals(origins.length, 7);
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
  const dir = optionalEnv("SCHEDULE_H_STATE_RATE_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/changed-rate-split-late-cents.json`,
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
    await Deno.writeTextFile(
      `${dir}/changed-rate-split-late-cents.xml`,
      bundle.xml,
    );
    await Deno.writeFile(`${dir}/changed-rate-split-late-cents.pdf`, pdf);
  }
});

Deno.test("Schedule H zero state experience rate needs no invented payment", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  unemployment.state_rows[0].experience_rate = 0;
  unemployment.state_rows[0].contributions_paid_by_due_date = 0;
  unemployment.state_payroll_review.rate_notices[0].experience_rate = 0;
  unemployment.state_payroll_review.contribution_payments.shift();
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[0].creditAtStateRate, 0);
  assertEquals(amounts.sectionB?.rows[0].contributions_paid_by_due_date, 0);
  assertEquals(amounts.totalTax, 1_338);
  const { bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-zero",
    1_338,
  );
  assertEquals(
    bundle.xml.includes(
      "<UnemploymentStateExperienceRt>0</UnemploymentStateExperienceRt>",
    ),
    true,
  );
});

Deno.test("Schedule H filed wage dollars drive line 17 credits after source-cent reconciliation", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  unemployment.employee_wages[0].annual_cash_wages = 8_009.49;
  unemployment.employee_wages[0].quarterly_cash_wages[0] = 2_009.49;
  unemployment.employee_wages[0].w2.box3_social_security_wages = 8_009.49;
  unemployment.employee_wages[0].w2.box5_medicare_wages = 8_009.49;
  raw.ss_wages = 8_009.49;
  raw.medicare_wages = 8_009.49;
  unemployment.state_payroll_review.wage_payments[0].cash_wages = 2_009.49;
  unemployment.state_rows[0].taxable_state_wages = 2_009.49;
  unemployment.state_rows[0].contributions_paid_by_due_date = 60.28;
  unemployment.state_payroll_review.contribution_payments[0].amount = 60.28;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 6_009.49;
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[0].taxable_state_wages, 2_009);
  assertEquals(amounts.sectionB?.rows[0].creditAt54, 108);
  assertEquals(amounts.sectionB?.rows[0].creditAtStateRate, 60);
  assertEquals(amounts.totalTax, 1_339);
  const { bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-wage-cents",
    1_339,
  );
  assertEquals(
    bundle.xml.includes(
      "<TxblWagesPaidStUnemplFundAmt>2009</TxblWagesPaidStUnemplFundAmt>",
    ),
    true,
  );
  unemployment.state_payroll_review.wage_payments[0].cash_wages = 2_009.491;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
});

Deno.test("Schedule H legacy Section B native ratio matches its printed rate", async () => {
  const raw: any = source();
  delete raw.federal_unemployment.state_payroll_review;
  const schedule = inputSchema.parse(raw);
  const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(
    bundle.xml.includes(
      "<UnemploymentStateExperienceRt>0.03</UnemploymentStateExperienceRt>",
    ),
    true,
  );
  assertEquals(
    bundle.xml.includes(
      "<UnemploymentStateExperienceRt>0</UnemploymentStateExperienceRt>",
    ),
    false,
  );
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
  raw.federal_unemployment.state_rows[0].experience_rate = .030245;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
});

Deno.test("Schedule H accepts accrued quarterly state receipts within one rate period", async () => {
  const raw: any = source();
  const receipts = raw.federal_unemployment.state_payroll_review
    .contribution_payments;
  receipts[1] = {
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 2,
    paid_date: "2025-07-15",
    amount: 100,
    payment_reference: "CA-Q2-SUTA-receipt",
  };
  receipts.push({
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 3,
    paid_date: "2025-10-15",
    amount: 100,
    payment_reference: "CA-Q3-SUTA-receipt",
  });
  raw.federal_unemployment.state_payroll_review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q2-DE9-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q3-DE9-assessment",
    },
  ];
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[1].contributions_paid_by_due_date, 200);
  assertEquals(amounts.sectionB?.contributions, 314);
  assertEquals(amounts.totalTax, 1_338);
  const { schedule, result, bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-quarterly-receipts",
    1_338,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const bad = (edit: (review: any) => void) => {
    const altered: any = structuredClone(schedule);
    edit(altered.federal_unemployment.state_payroll_review);
    assertThrows(() =>
      computeScheduleHAmounts(inputSchema.parse(altered), 2025)
    );
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    return assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
  };
  await bad((review) =>
    review.contribution_payments[1].paid_date = "2025-05-31"
  );
  await bad((review) => {
    review.contribution_payments[1].amount = 101;
    review.contribution_payments[3].amount = 99;
  });
  await bad((review) => review.quarterly_assessments.pop());
  await bad((review) =>
    review.quarterly_assessments[0].taxable_state_wages = 1_999
  );
  await bad((review) => review.contribution_payments[3].assessment_quarter = 2);
  const publicBad = structuredClone(raw);
  publicBad.federal_unemployment.state_payroll_review
    .contribution_payments[1].paid_date = "2025-05-31";
  const resultBad = f1040_2025.executeReturn({
    ...structuredClone(base.inputs),
    schedule_h: inputSchema.parse(publicBad),
  });
  assertEquals(
    resultBad.diagnostics.some((d) => d.nodeType === "schedule_h"),
    true,
  );
});

Deno.test("Schedule H reconciles separately rounded quarter assessments on cent wages", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  const employee = unemployment.employee_wages[0];
  employee.quarterly_cash_wages = [2_000, 2_000.11, 2_000.11, 1_999.78];
  unemployment.state_payroll_review.wage_payments[1].cash_wages = 2_000.11;
  unemployment.state_payroll_review.wage_payments[2].cash_wages = 2_000.11;
  unemployment.state_payroll_review.wage_payments[3].cash_wages = 1_999.78;
  unemployment.state_rows[1].taxable_state_wages = 4_000.22;
  unemployment.state_rows[1].contributions_paid_by_due_date = 200.02;
  unemployment.state_rows[2].taxable_state_wages = 1_999.78;
  unemployment.state_rows[2].contributions_paid_by_due_date = 53.99;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 6_000.22;
  const receipts = unemployment.state_payroll_review.contribution_payments;
  receipts[1] = {
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 2,
    paid_date: "2025-07-15",
    amount: 100.01,
    payment_reference: "CA-Q2-cent-receipt",
  };
  receipts[2].amount = 53.99;
  receipts.push({
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 3,
    paid_date: "2025-10-15",
    amount: 100.01,
    payment_reference: "CA-Q3-cent-receipt",
  });
  unemployment.state_payroll_review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 2_000.11,
      assessed_contribution: 100.01,
      source_reference: "CA-Q2-cent-DE9-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 2_000.11,
      assessed_contribution: 100.01,
      source_reference: "CA-Q3-cent-DE9-assessment",
    },
  ];
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.rows[1].contributions_paid_by_due_date, 200);
  assertEquals(amounts.sectionB?.contributions, 314);
  assertEquals(amounts.totalTax, 1_338);
  await verifyAdditionalPacket(
    raw,
    "changed-rate-quarterly-cent-assessments",
    1_338,
  );
  const missing = structuredClone(raw);
  delete missing.federal_unemployment.state_payroll_review
    .quarterly_assessments;
  delete missing.federal_unemployment.state_payroll_review
    .contribution_payments[1].assessment_quarter;
  delete missing.federal_unemployment.state_payroll_review
    .contribution_payments[3].assessment_quarter;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(missing), 2025));
  const wrong = structuredClone(raw);
  wrong.federal_unemployment.state_payroll_review.quarterly_assessments[1]
    .assessed_contribution = 100;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(wrong), 2025));
});

Deno.test("Schedule H retains a zero-taxable quarter after the state wage base", async () => {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  unemployment.employee_wages[0].annual_cash_wages = 9_000;
  unemployment.employee_wages[0].quarterly_cash_wages = [
    2_000,
    5_000,
    1_000,
    1_000,
  ];
  unemployment.employee_wages[0].w2.box3_social_security_wages = 9_000;
  unemployment.employee_wages[0].w2.box5_medicare_wages = 9_000;
  raw.ss_wages = 9_000;
  raw.medicare_wages = 9_000;
  const wages = unemployment.state_payroll_review.wage_payments;
  wages[1].cash_wages = 5_000;
  wages[2].cash_wages = 1_000;
  wages[3].cash_wages = 1_000;
  unemployment.state_rows[1].taxable_state_wages = 5_000;
  unemployment.state_rows[1].contributions_paid_by_due_date = 250;
  unemployment.state_rows[2].taxable_state_wages = 1_000;
  unemployment.state_rows[2].contributions_paid_by_due_date = 27;
  unemployment.credit_reduction_wages[0].taxable_futa_wages = 7_000;
  const receipts = unemployment.state_payroll_review.contribution_payments;
  receipts[1] = {
    rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
    assessment_quarter: 2,
    paid_date: "2025-07-15",
    amount: 250,
    payment_reference: "CA-Q2-base-limit-receipt",
  };
  receipts[2].amount = 27;
  unemployment.state_payroll_review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 5_000,
      assessed_contribution: 250,
      source_reference: "CA-Q2-base-limit-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 0,
      assessed_contribution: 0,
      source_reference: "CA-Q3-zero-taxable-assessment",
    },
  ];
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.additionalCredit, 95);
  assertEquals(amounts.sectionB?.allowedCredit, 294);
  assertEquals(amounts.futaTax, 126);
  assertEquals(amounts.totalTax, 1_503);
  const { schedule, result, bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-base-exhausted-quarter",
    1_503,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const badAssessment = (edit: (review: any) => void) => {
    const altered: any = structuredClone(schedule);
    edit(altered.federal_unemployment.state_payroll_review);
    assertThrows(() =>
      computeScheduleHAmounts(inputSchema.parse(altered), 2025)
    );
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    return assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
  };
  await badAssessment((review) => review.quarterly_assessments[1].quarter = 4);
  await badAssessment((review) =>
    review.quarterly_assessments[1].taxable_state_wages = 1
  );
  await badAssessment((review) =>
    review.quarterly_assessments[1].assessed_contribution = 1
  );
  const phantom = structuredClone(raw);
  phantom.federal_unemployment.state_payroll_review.quarterly_assessments[1]
    .quarter = 4;
  const rejected = f1040_2025.executeReturn({
    ...structuredClone(base.inputs),
    schedule_h: inputSchema.parse(phantom),
  });
  assertEquals(
    rejected.diagnostics.some((d) => d.nodeType === "schedule_h"),
    true,
  );
});

function unpaidStateSource(
  kind: "partial" | "unpaid" | "partial-late" | "all-unpaid",
) {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  const review = unemployment.state_payroll_review;
  unemployment.all_contributions_paid_on_time = false;
  unemployment.state_rows[1].contributions_paid_by_due_date =
    kind === "unpaid" || kind === "all-unpaid" ? 0 : 100;
  review.contribution_payments = review.contribution_payments.filter(
    (payment: any) =>
      payment.rate_notice_source_reference !== "CA-rate-notice-Q2-Q4",
  );
  if (kind !== "unpaid" && kind !== "all-unpaid") {
    review.contribution_payments.push({
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 2,
      paid_date: "2025-07-15",
      amount: 100,
      payment_reference: "CA-Q2-SUTA-receipt",
    });
  }
  if (kind === "partial-late") {
    unemployment.late_contributions = 50;
    review.contribution_payments.push({
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 3,
      paid_date: "2026-05-15",
      amount: 50,
      payment_reference: "CA-Q3-partial-late-receipt",
    });
  }
  if (kind === "all-unpaid") {
    review.contribution_payments = [];
    unemployment.state_rows[0].contributions_paid_by_due_date = 0;
    unemployment.state_rows[2].contributions_paid_by_due_date = 0;
  }
  review.quarterly_assessments = [
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 2,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q2-DE9-assessment",
    },
    {
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      quarter: 3,
      taxable_state_wages: 2_000,
      assessed_contribution: 100,
      source_reference: "CA-Q3-DE9-assessment",
    },
  ];
  const reviewDate = kind === "partial-late" ? "2026-06-01" : "2026-04-15";
  review.unpaid_contribution_review = {
    filing_review_date: reviewDate,
    notice_balances: [
      {
        rate_notice_source_reference: "CA-rate-notice-Q1",
        state: "CA",
        statement_as_of_date: reviewDate,
        outstanding_balance: kind === "all-unpaid" ? 60 : 0,
        balance_record_reference: `CA-Q1-account-${kind}`,
      },
      {
        rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
        state: "CA",
        statement_as_of_date: reviewDate,
        outstanding_balance: kind === "unpaid" || kind === "all-unpaid"
          ? 200
          : kind === "partial"
          ? 100
          : 50,
        balance_record_reference: `CA-Q2-Q3-account-${kind}`,
      },
      {
        rate_notice_source_reference: "TX-rate-notice-2025",
        state: "TX",
        statement_as_of_date: reviewDate,
        outstanding_balance: kind === "all-unpaid" ? 54 : 0,
        balance_record_reference: `TX-Q4-account-${kind}`,
      },
    ],
  };
  return raw;
}

Deno.test("Schedule H retains assessed state contributions partly or wholly unpaid at filing", async () => {
  for (
    const [kind, tax, contributions, futa] of [
      ["partial", 1_384, 214, 160],
      ["unpaid", 1_484, 114, 260],
      ["partial-late", 1_343, 214, 119],
      ["all-unpaid", 1_598, 0, 374],
    ] as const
  ) {
    const raw = unpaidStateSource(kind);
    const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
    assertEquals(amounts.sectionB?.contributions, contributions);
    assertEquals(amounts.futaTax, futa);
    assertEquals(amounts.totalTax, tax);
    const { bundle } = await verifyAdditionalPacket(
      raw,
      `changed-rate-${kind}-unpaid-state`,
      tax,
    );
    assertEquals(
      bundle.xml.includes(`<FUTATaxAmt>${futa}</FUTATaxAmt>`),
      true,
    );
    assertEquals(
      bundle.xml.includes(
        `<TotalContriStateUnemplFundAmt>${contributions}</TotalContriStateUnemplFundAmt>`,
      ),
      true,
    );
  }
});

function txOnlyUnpaidStateSource() {
  const raw: any = source();
  const unemployment = raw.federal_unemployment;
  const review = unemployment.state_payroll_review;
  unemployment.paid_only_one_state = true;
  unemployment.all_contributions_paid_on_time = false;
  unemployment.state_rows = [{
    ...unemployment.state_rows[2],
    taxable_state_wages: 8_000,
    contributions_paid_by_due_date: 0,
  }];
  unemployment.credit_reduction_wages = [];
  review.rate_notices = [review.rate_notices[2]];
  review.contribution_payments = [];
  for (const [index, payment] of review.wage_payments.entries()) {
    payment.state = "TX";
    payment.payment_reference = `TX-Q${index + 1}-household-payroll`;
  }
  review.unpaid_contribution_review = {
    filing_review_date: "2026-04-15",
    notice_balances: [{
      rate_notice_source_reference: "TX-rate-notice-2025",
      state: "TX",
      statement_as_of_date: "2026-04-15",
      outstanding_balance: 216,
      balance_record_reference: "TX-full-year-account-unpaid",
    }],
  };
  return raw;
}

Deno.test("Schedule H one-state wholly unpaid assessment uses Section B without a late worksheet", async () => {
  const raw = txOnlyUnpaidStateSource();
  const amounts = computeScheduleHAmounts(inputSchema.parse(raw), 2025);
  assertEquals(amounts.sectionB?.additionalCredit, 216);
  assertEquals(amounts.sectionB?.contributions, 0);
  assertEquals(amounts.sectionB?.needsWorksheet, false);
  assertEquals(amounts.futaTax, 204);
  assertEquals(amounts.totalTax, 1_428);
  const { bundle } = await verifyAdditionalPacket(
    raw,
    "tx-only-wholly-unpaid-state",
    1_428,
    6,
  );
  assertEquals(bundle.xml.includes("<FUTATaxAmt>204</FUTATaxAmt>"), true);
});

Deno.test("Schedule H unpaid state balances reject missing, stale, duplicate and contradicted source records at every exporter", async () => {
  const raw = unpaidStateSource("partial");
  const { schedule, result, bundle } = await verifyAdditionalPacket(
    raw,
    "changed-rate-partial-unpaid-negative-control",
    1_384,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const pending = buildPending(result.pending);
  const bad = async (edit: (row: any) => void) => {
    const altered: any = structuredClone(schedule);
    edit(altered.federal_unemployment);
    assertThrows(() =>
      computeScheduleHAmounts(inputSchema.parse(altered), 2025)
    );
    assertThrows(() => scheduleH.build(altered, { filer, pending }));
    await assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: altered },
        filer,
        ".pdf-cache",
      )
    );
    const rejected = f1040_2025.executeReturn({
      ...structuredClone(base.inputs),
      schedule_h: altered,
    });
    assertEquals(
      rejected.diagnostics.some((diagnostic) =>
        diagnostic.nodeType === "schedule_h"
      ),
      true,
    );
  };
  await bad((row) =>
    delete row.state_payroll_review.unpaid_contribution_review
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances.pop()
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .outstanding_balance = 99
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .outstanding_balance = 100.001
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[2]
      .balance_record_reference =
        row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
          .balance_record_reference
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[2]
      .rate_notice_source_reference = "CA-rate-notice-Q2-Q4"
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .statement_as_of_date = "2026-04-16"
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .state = "TX"
  );
  await bad((row) => row.all_contributions_paid_on_time = true);
  await bad((row) => {
    row.state_payroll_review.contribution_payments.push({
      rate_notice_source_reference: "CA-rate-notice-Q2-Q4",
      assessment_quarter: 3,
      paid_date: "2025-10-15",
      amount: 100,
      payment_reference: "CA-Q3-SUTA-receipt",
    });
    row.state_payroll_review.unpaid_contribution_review.notice_balances[1]
      .outstanding_balance = 0;
    row.state_rows[1].contributions_paid_by_due_date = 200;
    // All liabilities have been paid by the deadline, contradicting line 11.
    row.all_contributions_paid_on_time = false;
  });
  await bad((row) => row.late_contributions = 100);
  await bad((row) =>
    row.state_payroll_review.contribution_payments[1].amount = 201
  );
  await bad((row) =>
    row.state_payroll_review.unpaid_contribution_review.filing_review_date =
      "2026-04-14"
  );
  await bad((row) => {
    row.state_payroll_review.contribution_payments[1].paid_date = "2026-05-15";
    row.late_contributions = 100;
  });
});
