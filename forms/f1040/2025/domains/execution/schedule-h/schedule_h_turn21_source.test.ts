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

const base = pdfReviewFixtures.find((x) => x.id === "single-w2-refund")!;
const optionalEnv = (name: string): string | undefined => {
  try {
    return Deno.env.get(name);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
};
const xsd = optionalEnv("SCHEDULE_H_TURN21_XSD_PATH") ?? new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

const period = (from: string, to: string, id: string, allocation: string) => ({
  kind: "over_31_days",
  period_from: from,
  period_to: to,
  period_source_reference: `${id}-ordinary-quarterly-payroll`,
  service_time_source_reference: `${allocation}-dated-service-allocation`,
});

function source(prior = false) {
  const child = {
    employee_id: "child-2004",
    employee_ssn: "400001041",
    relationship: "child",
    relationship_source_reference: "reviewed-parent-child-relationship",
    birth_date: "2004-06-15",
    birth_date_source_reference: "reviewed-2004-birth-record",
    payroll_source_reference: "2025-child-complete-cash-payroll",
    ordinary_cash_only: true,
    annual_cash_wages: 11_000,
    quarterly_cash_wages: [1_500, 0, 2_500, 7_000],
    age_21_transition_review: {
      service_payment_ledger_source_reference:
        "2025-child-dated-service-payment-ledger",
      wage_payments: [
        {
          payment_reference: "child-payment-one",
          service_from: "2025-01-01",
          service_to: "2025-03-31",
          paid_date: "2025-03-31",
          cash_wages: 1_500,
          ordinary_pay_period: period(
            "2025-01-01",
            "2025-03-31",
            "Q1",
            "Q1-child",
          ),
        },
        {
          payment_reference: "child-payment-two",
          service_from: "2025-04-01",
          service_to: "2025-06-14",
          paid_date: "2025-07-01",
          cash_wages: 1_500,
          ordinary_pay_period: period(
            "2025-04-01",
            "2025-06-30",
            "Q2",
            "Q2-before21",
          ),
        },
        {
          payment_reference: "child-payment-three",
          service_from: "2025-06-15",
          service_to: "2025-06-30",
          paid_date: "2025-07-01",
          cash_wages: 1_000,
          ordinary_pay_period: period(
            "2025-04-01",
            "2025-06-30",
            "Q2",
            "Q2-after21",
          ),
        },
        {
          payment_reference: "child-payment-four",
          service_from: "2025-07-01",
          service_to: "2025-12-31",
          paid_date: "2025-12-31",
          cash_wages: 7_000,
          ordinary_pay_period: period(
            "2025-07-01",
            "2025-12-31",
            "Q3-Q4",
            "Q3-Q4-child",
          ),
        },
      ],
    },
    w2: {
      source_reference: "2025-child-issued-w2",
      employee_ssn: "400001041",
      box1_wages: 11_000,
      box2_federal_income_tax_withheld: 250,
      box3_social_security_wages: 8_000,
      box5_medicare_wages: 8_000,
    },
    federal_withholding_agreement: {
      w4_source_reference: "child-signed-w4-agreement",
      employee_requested_and_employer_agreed: true,
    },
  };
  const adult = {
    employee_id: "adult",
    payroll_source_reference: "2025-adult-cash-payroll",
    relationship: "unrelated",
    age_18_or_older_for_fica: true,
    ordinary_cash_only: true,
    annual_cash_wages: 3_000,
    quarterly_cash_wages: [750, 750, 750, 750],
    w2: {
      source_reference: "2025-adult-issued-w2",
      box2_federal_income_tax_withheld: 0,
      box3_social_security_wages: 3_000,
      box5_medicare_wages: 3_000,
    },
  };
  return {
    employer_ein: "123456789",
    family_employer_ssn: "111223333",
    cash_wages_over_2025_limit: true,
    cash_wages_over_quarter_limit: true,
    ss_wages: 11_000,
    medicare_wages: 11_000,
    federal_income_tax_withheld: 250,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "TX",
      zero_experience_rate: true,
      taxable_wages: 10_000,
      all_household_employees_included: true,
      prior_year_quarter_threshold_met: prior,
      ...(prior
        ? {
          prior_year_quarter_source_reference:
            "2024-complete-household-payroll",
        }
        : {}),
      prior_year_eligible_quarter_source_reference:
        "2024-eligible-quarter-payment-ledger",
      prior_year_eligible_quarter_cash_wages: prior
        ? [0, 1_000, 0, 0]
        : [100, 250, 300, 0],
      employee_wages: [adult, child],
    },
  };
}

function priorOnlySource() {
  const raw: any = source(true);
  const [adult, child] = raw.federal_unemployment.employee_wages;
  adult.annual_cash_wages = 400;
  adult.quarterly_cash_wages = [100, 100, 100, 100];
  adult.w2.box3_social_security_wages = 0;
  adult.w2.box5_medicare_wages = 0;
  child.age_21_transition_review.wage_payments[2].cash_wages = 800;
  child.age_21_transition_review.wage_payments[3].cash_wages = 800;
  child.annual_cash_wages = 4_600;
  child.quarterly_cash_wages = [1_500, 0, 2_300, 800];
  child.w2.box1_wages = 4_600;
  child.w2.box3_social_security_wages = 0;
  child.w2.box5_medicare_wages = 0;
  raw.ss_wages = 0;
  raw.medicare_wages = 0;
  raw.cash_wages_over_2025_limit = false;
  raw.federal_unemployment.taxable_wages = 2_000;
  return raw;
}

Deno.test("Schedule H turning-21 payroll distinguishes two periods paid one day and one period paid on two days", async () => {
  const distinct: any = source(false);
  const distinctRows = distinct.federal_unemployment.employee_wages[1]
    .age_21_transition_review.wage_payments;
  distinctRows[1].ordinary_pay_period.period_to = "2025-06-14";
  distinctRows[2].ordinary_pay_period = {
    kind: "within_31_days",
    period_from: "2025-06-15",
    period_to: "2025-06-30",
    period_source_reference: "Q2-after21-separate-ordinary-pay-period",
    service_time_source_reference: "Q2-after21-separate-service-ledger",
  };
  assertEquals(computeScheduleHAmounts(inputSchema.parse(distinct), 2025).totalTax, 1_993);

  const shared: any = source(false);
  const child = shared.federal_unemployment.employee_wages[1];
  const rows = child.age_21_transition_review.wage_payments;
  const crossing = {
    kind: "within_31_days", period_from: "2025-06-01",
    period_to: "2025-06-30",
    period_source_reference: "Q2-June-shared-ordinary-pay-period",
    service_time_source_reference: "Q2-June-reviewed-service-hours",
    excluded_service_hours: 40, covered_service_hours: 60,
  };
  rows[1].service_from = "2025-06-01";
  rows[1].service_to = "2025-06-14";
  rows[1].ordinary_pay_period = structuredClone(crossing);
  rows[2].paid_date = "2025-07-02";
  rows[2].ordinary_pay_period = structuredClone(crossing);
  child.w2.box3_social_security_wages = 9_500;
  child.w2.box5_medicare_wages = 9_500;
  shared.ss_wages = shared.medicare_wages = 12_500;
  const amount = computeScheduleHAmounts(inputSchema.parse(shared), 2025);
  assertEquals(amount.socialSecurityTax, 1_550);
  assertEquals(amount.medicareTax, 363);
  assertEquals(amount.futaTax, 60);
  assertEquals(amount.totalTax, 2_223);
  for (const [id, raw, tax] of [
    ["distinct-periods-same-payday", distinct, 1_993],
    ["shared-period-separate-paydays", shared, 2_223],
  ] as const) {
    const inputs = { ...structuredClone(base.inputs), schedule_h: raw };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule2.line9_household_employment, tax);
    const pending = buildPending(result.pending);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: any[] = [];
    const pdf = await buildPdfBytes(bundle.pending, filer, ".pdf-cache", bundle, origins);
    assertEquals(origins.length, 6);
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const check = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, temp], stdout: "piped", stderr: "piped",
      }).output();
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
    } finally { await Deno.remove(temp); }
    const dir = optionalEnv("SCHEDULE_H_TURN21_EVIDENCE_DIR");
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(`${dir}/${id}.json`, JSON.stringify({
        inputs, pending, preparedPending: bundle.pending,
        carryforwards: result.carryforwards, filer, origins,
      }, null, 2));
      await Deno.writeTextFile(`${dir}/${id}.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/${id}.pdf`, pdf);
    }
  }
});

Deno.test("Schedule H child turning 21 uses service dates, paid quarters and full return filing", async () => {
  const dir = optionalEnv("SCHEDULE_H_TURN21_EVIDENCE_DIR");
  for (
    const [id, raw, expected] of [
      ["current-quarter", source(false), {
        ss: 1_364,
        medicare: 319,
        futa: 60,
        tax: 1_993,
      }],
      ["prior-quarter", priorOnlySource(), {
        ss: 0,
        medicare: 0,
        futa: 12,
        tax: 262,
      }],
    ] as const
  ) {
    const schedule = inputSchema.parse(raw);
    const amounts = computeScheduleHAmounts(schedule, 2025);
    assertEquals(amounts.socialSecurityTax, expected.ss);
    assertEquals(amounts.medicareTax, expected.medicare);
    assertEquals(amounts.futaTax, expected.futa);
    assertEquals(amounts.totalTax, expected.tax);
    const inputs = { ...structuredClone(base.inputs), schedule_h: schedule };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule2.line9_household_employment,
      expected.tax,
    );
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
    const changed: any = structuredClone(schedule);
    changed.federal_unemployment.employee_wages[1].age_21_transition_review
      .wage_payments[1].cash_wages = 1_499;
    assertThrows(() => scheduleH.build(changed, { filer, pending }), Error);
    await assertRejects(() =>
      buildPdfBytes(
        { ...bundle.pending, schedule_h: changed },
        filer,
        ".pdf-cache",
      )
    );
  }
});

Deno.test("Schedule H turning-21 source rejects age, service, wage, quarter and W-2 conflicts", () => {
  const wrong = (edit: (s: any) => void) => {
    const raw: any = source();
    edit(raw);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(raw), 2025));
  };
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].birth_date = "2005-06-15"
  );
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].age_21_transition_review
      .wage_payments[1].service_to = "2025-06-15"
  );
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].age_21_transition_review
      .wage_payments[1].paid_date = "2025-06-14"
  );
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].age_21_transition_review
      .wage_payments[1].cash_wages = 1_499
  );
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].w2.box3_social_security_wages =
      11_000
  );
  wrong((s) => s.federal_unemployment.taxable_wages = 3_000);
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].age_21_transition_review
      .wage_payments[2].payment_reference = "child-payment-two"
  );
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].age_21_transition_review
      .wage_payments[2].service_from = "2025-02-30"
  );
  wrong((s) =>
    s.federal_unemployment.employee_wages[1].birth_date = "2004-02-29"
  );
  const noPrior = priorOnlySource();
  noPrior.federal_unemployment.prior_year_quarter_threshold_met = false;
  delete noPrior.federal_unemployment.prior_year_quarter_source_reference;
  delete noPrior.federal_unemployment.prior_year_eligible_quarter_cash_wages;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(noPrior), 2025));
  const falsePrior = priorOnlySource();
  falsePrior.federal_unemployment.prior_year_eligible_quarter_cash_wages[1] =
    999;
  assertThrows(() =>
    computeScheduleHAmounts(inputSchema.parse(falsePrior), 2025)
  );
});
