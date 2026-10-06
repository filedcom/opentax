import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import {
  computeScheduleHAmounts,
  inputSchema,
} from "../nodes/intermediate/forms/schedule_h/index.ts";
import { scheduleH } from "./mef/forms/schedule_h.ts";
import { scheduleHPdf } from "./pdf/forms/schedule_h.ts";

// Original source v2 was saved before implementation; its economic facts
// remain unchanged in the no-child exclusion case.
const heldInputs: any = {
  "general": {
    "filing_status": "single",
    "taxpayer_first_name": "Alex",
    "taxpayer_last_name": "Example",
    "taxpayer_ssn": "111-22-3333",
    "taxpayer_dob": "1985-06-15",
    "child_eic_filer_review": {
      "not_qualifying_child_of_another_taxpayer_verified": true,
      "relationship_age_residence_record_reference":
        "Synthetic 2025 filer family and residence review",
    },
    "prior_eic_disallowance_review": {
      "status": "none",
      "irs_account_record_reference": "Synthetic IRS account transcript review",
      "no_nonclerical_disallowance_since_1996_verified": true,
    },
    "eic_tax_residency_review": {
      "status": "all_year_resident",
      "taxpayer_status_record_reference":
        "Synthetic 2025 resident status review",
      "spouse_status_record_reference": "Synthetic 2025 spouse status review",
    },
    "address_line1": "1 Example Way",
    "address_city": "Austin",
    "address_state": "TX",
    "address_zip": "78701",
    "digital_assets": false,
  },
  "w2": [
    {
      "box1_wages": 75000,
      "box2_fed_withheld": 11000,
      "employee_ssn": "111-22-3333",
      "box3_ss_wages": 75000,
      "box4_ss_withheld": 4650,
      "box5_medicare_wages": 75000,
      "box6_medicare_withheld": 1087.5,
      "employer_ein": "12-3456789",
      "employer_name": "Example Employer",
      "employer_address_line1": "10 Employer Road",
      "employer_address_city": "Austin",
      "employer_address_state": "TX",
      "employer_address_zip": "78701",
      "box12_entries": [],
    },
  ],
  "schedule_h": {
    "employer_ein": "123456789",
    "cash_wages_over_2025_limit": true,
    "cash_wages_over_quarter_limit": false,
    "ss_wages": 2800,
    "medicare_wages": 2800,
    "federal_income_tax_withheld": 300,
    "fica_only_payroll": {
      "all_household_employees_included": true,
      "prior_year_payroll_source_reference":
        "reviewed-2024-complete-household-payroll",
      "prior_year_quarter_cash_wages": [
        950,
        900,
        850,
        999,
      ],
      "employee_wages": [
        {
          "employee_id": "main",
          "payroll_source_reference": "2025-main-payroll",
          "relationship": "unrelated",
          "age_18_or_older_for_fica": true,
          "ordinary_cash_only": true,
          "annual_cash_wages": 2800,
          "quarterly_cash_wages": [
            700,
            700,
            700,
            700,
          ],
          "w2": {
            "source_reference": "main-w2",
            "box2_federal_income_tax_withheld": 40,
            "box3_social_security_wages": 2800,
            "box5_medicare_wages": 2800,
          },
          "federal_withholding_agreement": {
            "w4_source_reference": "main-w4",
            "employee_requested_and_employer_agreed": true,
          },
        },
        {
          "employee_id": "student-small",
          "payroll_source_reference": "2025-student-small-payroll",
          "relationship": "unrelated",
          "age_18_or_older_for_fica": false,
          "student_minor_fica_exclusion": {
            "birth_date": "2008-05-10",
            "birth_date_source_reference": "student-small-birth",
            "student_enrollment_source_reference": "student-small-school",
            "student_during_2025_verified": true,
          },
          "ordinary_cash_only": true,
          "annual_cash_wages": 400,
          "quarterly_cash_wages": [
            100,
            100,
            100,
            100,
          ],
          "w2": {
            "source_reference": "student-small-w2",
            "box2_federal_income_tax_withheld": 10,
            "box3_social_security_wages": 0,
            "box5_medicare_wages": 0,
          },
          "federal_withholding_agreement": {
            "w4_source_reference": "student-small-w4",
            "employee_requested_and_employer_agreed": true,
          },
        },
        {
          "employee_id": "adult-small",
          "payroll_source_reference": "2025-adult-small-payroll",
          "relationship": "unrelated",
          "age_18_or_older_for_fica": true,
          "ordinary_cash_only": true,
          "annual_cash_wages": 400,
          "quarterly_cash_wages": [
            100,
            100,
            100,
            100,
          ],
          "w2": {
            "source_reference": "adult-small-w2",
            "box2_federal_income_tax_withheld": 0,
            "box3_social_security_wages": 0,
            "box5_medicare_wages": 0,
          },
        },
        {
          "employee_id": "parent-employee",
          "employee_ssn": "400001050",
          "relationship_source_reference": "employer-parent-birth-record",
          "payroll_source_reference": "2025-parent-payroll",
          "ordinary_cash_only": true,
          "annual_cash_wages": 5000,
          "quarterly_cash_wages": [
            1250,
            1250,
            1250,
            1250,
          ],
          "w2": {
            "source_reference": "2025-parent-w2",
            "employee_ssn": "400001050",
            "box1_wages": 5000,
            "box2_federal_income_tax_withheld": 250,
            "box3_social_security_wages": 0,
            "box5_medicare_wages": 0,
          },
          "relationship": "parent",
          "birth_date": "1955-06-15",
          "birth_date_source_reference": "parent-birth-record",
          "federal_withholding_agreement": {
            "w4_source_reference": "2025-parent-w4",
            "employee_requested_and_employer_agreed": true,
          },
          "parent_fica_review": {
            "classification": "excluded",
            "source_reference": "2025-employer-home-occupancy-no-children",
            "no_child_of_employer_living_in_home_during_2025_verified": true,
          },
        },
      ],
    },
    "family_employer_ssn": "111223333",
  },
};

function source(
  kind:
    | "excluded"
    | "divorced"
    | "widowed"
    | "spouse"
    | "partial"
    | "never"
    | "threshold"
    | "futa",
) {
  const inputs = structuredClone(heldInputs), h = inputs.schedule_h;
  const parent = h.fica_only_payroll.employee_wages[3];
  if (kind !== "excluded") {
    const partial = kind === "partial" || kind === "threshold";
    const joint = kind === "spouse" || partial;
    if (joint) {
      inputs.general.filing_status = "mfj";
      inputs.general.spouse_first_name = "Riley";
      inputs.general.spouse_last_name = "Example";
      inputs.general.spouse_ssn = "400-00-1070";
    }
    const qualifyingQuarters = kind === "threshold" ? [2] : [2, 3];
    const quarters = [1, 2, 3, 4].map((q) => {
      const month = String((q - 1) * 3 + 1).padStart(2, "0");
      const period = {
        from: `2025-${month}-01`,
        to: `2025-${month}-28`,
        medical_source_reference: `child-q${q}-adult-care`,
      };
      const adult = kind === "widowed" || partial;
      const child = {
        kind: "child",
        child_ssn: "400001060",
        relationship_source_reference: "employer-child-relationship",
        birth_date: adult ? "2000-06-15" : "2015-06-15",
        birth_date_source_reference: "employer-child-birth-record",
        lived_in_employers_home_throughout_service_quarter_verified: true,
        ...(adult && (!partial || qualifyingQuarters.includes(q))
          ? { adult_care_period: period }
          : {}),
      };
      const marital = kind === "never"
        ? {
          kind: "never_married",
          status_source_reference: "employer-never-married-record",
          never_married_throughout_quarter_verified: true,
        }
        : kind === "widowed"
        ? {
          kind: "widowed_not_remarried",
          spouse_death_date: "2020-06-15",
          death_source_reference: "former-spouse-death-record",
          no_remarriage_throughout_quarter_verified: true,
          continuity_source_reference: `widow-q${q}-continuity`,
        }
        : joint
        ? {
          kind: partial && !qualifyingQuarters.includes(q)
            ? "married_capable_spouse"
            : "spouse_incapable",
          spouse_ssn: "400001070",
          spouse_relationship_source_reference: "employer-marriage-record",
          spouse_residence_source_reference: `spouse-q${q}-home`,
          ...(partial && !qualifyingQuarters.includes(q)
            ? {
              spouse_care_capacity_source_reference: `spouse-q${q}-capacity`,
              living_with_capable_spouse_throughout_quarter_verified: true,
            }
            : {
              living_with_spouse_throughout_quarter_verified: true,
              incapable_care_period: {
                ...period,
                medical_source_reference: `spouse-q${q}-incapacity`,
              },
            }),
        }
        : {
          kind: "divorced_not_remarried",
          divorce_date: "2010-06-15",
          divorce_source_reference: "employer-divorce-decree",
          no_remarriage_throughout_quarter_verified: true,
          continuity_source_reference: `divorce-q${q}-continuity`,
        };
      return {
        quarter: q,
        home_residence_source_reference: `home-q${q}-occupancy`,
        child,
        employer_circumstances: marital,
      };
    });
    const wages = partial ? 8000 : 5000;
    parent.annual_cash_wages = parent.w2.box1_wages = wages;
    parent.quarterly_cash_wages = [wages / 4, wages / 4, wages / 4, wages / 4];
    parent.w2.box2_federal_income_tax_withheld = partial ? 400 : 250;
    h.federal_income_tax_withheld = partial ? 450 : 300;
    parent.parent_fica_review = {
      classification: "quarterly_circumstances",
      quarterly_circumstances: quarters,
      wage_payments: [1, 2, 3, 4].map((q) => ({
        payment_reference: `parent-q${q}-bank-payment`,
        paid_date:
          ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"][q - 1],
        service_from: `2025-${String((q - 1) * 3 + 1).padStart(2, "0")}-01`,
        service_to:
          ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"][q - 1],
        cash_wages: wages / 4,
      })),
    };
    const taxable = kind === "never" || kind === "threshold"
      ? 0
      : kind === "partial"
      ? 4000
      : 5000;
    parent.w2.box3_social_security_wages =
      parent.w2.box5_medicare_wages =
        taxable;
    h.ss_wages = h.medicare_wages = 2800 + taxable;
  }
  if (kind === "futa") {
    const workers = h.fica_only_payroll.employee_wages;
    workers[0].annual_cash_wages = 3200;
    workers[0].quarterly_cash_wages = [800, 800, 800, 800];
    workers[0].w2.box3_social_security_wages =
      workers[0].w2
        .box5_medicare_wages =
        3200;
    h.ss_wages = h.medicare_wages = 8200;
    h.cash_wages_over_quarter_limit = true;
    delete h.fica_only_payroll;
    h.federal_unemployment = {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      zero_experience_rate: true,
      taxable_wages: 4000,
      all_household_employees_included: true,
      prior_year_quarter_threshold_met: false,
      employee_wages: workers,
    };
  }
  return inputs;
}
const expected = [
  ["excluded", 728, 0],
  ["divorced", 1493, 0],
  ["widowed", 1493, 0],
  ["spouse", 1493, 0],
  ["partial", 1490, 0],
  ["never", 728, 0],
  ["threshold", 878, 0],
  ["futa", 1579, 24],
] as const;

function parentXsdPath() {
  const local = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  try { return Deno.env.get("SCHEDULE_H_PARENT_XSD_PATH") || local; }
  catch { return local; }
}

Deno.test("Schedule H parent source derives actual FICA exception by services quarter and retains FUTA exclusion", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts"),
    root = flag >= 0 ? Deno.args[flag + 1] : undefined;
  const xsd = parentXsdPath();
  for (const [kind, tax, futa] of expected) {
    const inputs = source(kind),
      payroll = inputSchema.parse(inputs.schedule_h),
      a = computeScheduleHAmounts(payroll, 2025);
    assertEquals(a.totalTax, tax, kind);
    assertEquals(a.futaTax, futa, kind);
    const r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, [], kind);
    assertEquals(r.pending.schedule2.line9_household_employment, tax, kind);
    assertEquals(r.pending.f1040.line23_other_taxes, tax, kind);
    const pending = buildPending(r.pending),
      filer = extractFilerIdentity(r.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const xml =
      bundle.xml.match(/<IRS1040ScheduleH\b[\s\S]*?<\/IRS1040ScheduleH>/)![0];
    assertEquals(
      xml.includes(
        `<CombinedFUTATaxPlusNetTaxesAmt>${tax}</CombinedFUTATaxPlusNetTaxesAmt>`,
      ),
      true,
      kind,
    );
    assertEquals(xml.includes("<FUTATaxAmt>"), futa > 0, kind);
    if (futa) {
      assertEquals(
        xml.includes(
          "<TotalCashWagesSubjFUTATaxAmt>4000</TotalCashWagesSubjFUTATaxAmt>",
        ),
        true,
        kind,
      );
    }
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    assertEquals(
      origins.filter((p) => p.formKey === "schedule_h").length,
      futa ? 2 : 1,
      kind,
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
    const changed = structuredClone(payroll),
      workers = (changed.fica_only_payroll ?? changed.federal_unemployment)!
        .employee_wages;
    const parentWorker = workers.at(-1)!;
    if (parentWorker.relationship !== "parent") {
      throw new Error("Expected retained parent payroll worker");
    }
    parentWorker.relationship_source_reference =
      "substituted-parent-relationship";
    assertThrows(() => scheduleH.build(changed, { filer, pending }));
    assertThrows(() =>
      scheduleHPdf.instances!(scheduleHPdf.projectFields!(changed, {}), filer, {
        schedule_h: payroll,
        schedule2: pending.schedule2 ?? {},
        f1040: pending.f1040 ?? {},
        w2: { w2s: pending.w2?.w2s },
      })
    );
    await assertRejects(() =>
      buildMefBundle({
        ...pending,
        schedule2: {
          ...pending.schedule2,
          line9_household_employment: tax - 1,
        },
      }, { filer, attachments: [] })
    );
    if (kind === "partial") {
      await assertRejects(() =>
        buildMefBundle(pending, {
          filer: { ...filer, spouse: { ...filer.spouse!, ssn: "400001099" } },
          attachments: [],
        })
      );
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
            carryforwards: r.carryforwards,
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

Deno.test("Schedule H parent ledger rejects dates, unsupported circumstances, amount and source contradictions", () => {
  const rejects = (
    mutate: (p: any, h: any) => void,
    kind: "partial" | "divorced" = "partial",
  ) => {
    const x = source(kind),
      h = x.schedule_h,
      p = h.fica_only_payroll.employee_wages[3];
    mutate(p, h);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(h), 2025));
  };
  rejects((p) =>
    p.parent_fica_review.quarterly_circumstances[1].child.adult_care_period.to =
      "2025-04-27"
  );
  rejects((p) =>
    p.parent_fica_review.quarterly_circumstances[1].child.adult_care_period.to =
      "2025-07-01"
  );
  rejects((p) =>
    p.parent_fica_review.quarterly_circumstances[1].employer_circumstances
      .incapable_care_period.to = "2025-04-27"
  );
  rejects((p) => p.parent_fica_review.quarterly_circumstances[1].quarter = 1);
  rejects((p) => p.parent_fica_review.wage_payments[1].cash_wages = 1999);
  rejects((p) =>
    p.parent_fica_review.wage_payments[1].payment_reference =
      p.parent_fica_review.wage_payments[0].payment_reference
  );
  rejects((p) =>
    p.parent_fica_review.wage_payments[1].service_to = "2025-07-01"
  );
  rejects(
    (p) =>
      p.parent_fica_review.quarterly_circumstances[1].employer_circumstances
        .divorce_date = "2025-05-01",
    "divorced",
  );
  rejects((p) =>
    p.parent_fica_review.quarterly_circumstances[0].child.child_ssn =
      "111223333"
  );
  rejects((p) => p.w2.box3_social_security_wages = 5000);
  rejects((p) => {
    for (const q of p.parent_fica_review.quarterly_circumstances) {
      q.child.birth_date = "2007-05-15";
    }
    const q2 = p.parent_fica_review.wage_payments[1];
    q2.service_from = "2025-05-01";
    q2.service_to = "2025-05-14";
    q2.cash_wages = 625;
    p.parent_fica_review.wage_payments.splice(2, 0, {
      ...q2, payment_reference: "parent-q2-postbirthday-bank-payment",
      service_from: "2025-05-15", service_to: "2025-05-31", cash_wages: 625,
    });
  }, "divorced");
  rejects((p) => delete p.w2);
  rejects((p) => delete p.federal_withholding_agreement);
  const futa = source("futa").schedule_h;
  futa.federal_unemployment.taxable_wages = 9000;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(futa), 2025));
});

type DatedParentKind = "birthday-majority" | "birthday-minority" | "midquarter-divorce" |
  "midquarter-widow" |
  "quarter-care" | "cross-quarter-care" | "long-period" | "no-ordinary" | "partial-installments" |
  "long-mixed-birthday" | "irregular-mixed-birthday";
function datedParentSource(kind: DatedParentKind) {
  const inputs = source(kind === "midquarter-divorce" ? "divorced" :
    kind === "midquarter-widow" ? "spouse" :
    ["quarter-care", "cross-quarter-care", "long-period", "no-ordinary", "partial-installments"].includes(kind) ? "spouse" : "divorced");
  const h = inputs.schedule_h;
  const parent = h.fica_only_payroll.employee_wages[3];
  const r = parent.parent_fica_review;
  r.classification = "dated_service_periods";
  r.complete_service_payment_ledger_source_reference = "2025-parent-complete-dated-ledger";
  if (kind.startsWith("birthday") || kind.endsWith("mixed-birthday")) {
    for (const q of r.quarterly_circumstances) {
      q.child.birth_date = "2007-05-15";
      q.child.birth_date_source_reference = "2007-child-issued-birth-record";
    }
    r.quarterly_circumstances[2].child.adult_care_period = {
      from: "2025-07-01", to: "2025-07-28",
      medical_source_reference: "2025-q3-child-doctor-care-statement",
    };
  }
  if (kind === "midquarter-divorce" || kind === "midquarter-widow") {
    r.quarterly_circumstances[0].employer_circumstances = {
      kind: "married_capable_spouse",
      spouse_ssn: "400001070",
      spouse_relationship_source_reference: "2025-marriage-certificate",
      spouse_residence_source_reference: "2025-q1-spouse-residence",
      spouse_care_capacity_source_reference: "2025-q1-spouse-capacity",
      living_with_capable_spouse_throughout_quarter_verified: true,
    };
    for (const q of r.quarterly_circumstances.slice(1)) {
      q.employer_circumstances = kind === "midquarter-widow"
        ? {
          kind: "widowed_not_remarried", spouse_death_date: "2025-05-15",
          death_source_reference: "2025-05-15-issued-spouse-death-record",
          no_remarriage_throughout_quarter_verified: true,
          continuity_source_reference: `2025-q${q.quarter}-widow-continuity`,
        }
        : {
          kind: "divorced_not_remarried", divorce_date: "2025-05-15",
          divorce_source_reference: "2025-05-15-issued-divorce-decree",
          no_remarriage_throughout_quarter_verified: true,
          continuity_source_reference: `2025-q${q.quarter}-divorce-continuity`,
        };
    }
    if (kind === "midquarter-widow") {
      inputs.general.spouse_deceased = true;
      inputs.general.spouse_death_date = "2025-05-15";
    }
  }
  const period = (q: number, from: string, to: string, kind: string, hours: number, cash: number) => ({
    payment_reference: `parent-${kind}-${from}-cash`,
    service_allocation_reference: `parent-${kind}-${from}-service-allocation`,
    paid_date: ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"][q - 1],
    service_from: from,
    service_to: to,
    service_hours: hours,
    cash_wages: cash,
    ordinary_pay_period: {
      kind: "within_31_days",
      period_from: from,
      period_to: to,
      period_source_reference: `parent-${kind}-${from}-period`,
      service_time_source_reference: `parent-${kind}-${from}-timesheet`,
    },
  });
  r.wage_payments = [
    period(1, "2025-03-01", "2025-03-31", "march", 80, 1250),
    period(2, "2025-04-01", "2025-04-30", "april", 40, 400),
    period(2, "2025-05-01", "2025-05-14", "may-before", kind === "birthday-majority" ? 60 : 40, 425),
    period(2, "2025-05-15", "2025-05-31", "may-after", kind === "birthday-majority" ? 40 : 60, 425),
    period(3, "2025-09-01", "2025-09-30", "september", 80, 1250),
    period(4, "2025-12-01", "2025-12-31", "december", 80, 1250),
  ];
  for (const p of r.wage_payments.slice(2, 4)) {
    p.ordinary_pay_period.period_from = "2025-05-01";
    p.ordinary_pay_period.period_to = "2025-05-31";
    p.ordinary_pay_period.period_source_reference = "2025-parent-may-ordinary-period";
    p.ordinary_pay_period.service_time_source_reference = "2025-parent-may-dated-timesheet";
  }
  if (kind === "cross-quarter-care") {
    r.quarterly_circumstances[2].employer_circumstances = {
      kind: "married_capable_spouse", spouse_ssn: "400001070",
      spouse_relationship_source_reference: "2025-marriage-certificate",
      spouse_residence_source_reference: "2025-q3-spouse-residence",
      spouse_care_capacity_source_reference: "2025-q3-spouse-capacity",
      living_with_capable_spouse_throughout_quarter_verified: true,
    };
    const first = period(2, "2025-06-01", "2025-06-14", "june-first", 40, 425);
    const second = period(2, "2025-06-15", "2025-06-30", "june-second", 50, 425);
    const third = period(3, "2025-07-01", "2025-07-14", "july-first", 50, 200);
    const fourth = period(3, "2025-09-01", "2025-09-30", "september", 80, 1050);
    for (const p of [second, third]) {
      p.ordinary_pay_period.period_from = "2025-06-15";
      p.ordinary_pay_period.period_to = "2025-07-14";
      p.ordinary_pay_period.period_source_reference = "2025-cross-quarter-ordinary-period";
      p.ordinary_pay_period.service_time_source_reference = "2025-cross-quarter-time-ledger";
    }
    r.wage_payments.splice(2, 3, first, second, third, fourth);
  }
  if (kind === "long-period") {
    const p = r.wage_payments[0].ordinary_pay_period;
    p.kind = "over_31_days";
    p.period_from = "2025-02-01";
  }
  if (kind === "long-mixed-birthday") {
    for (const p of r.wage_payments.slice(2, 4)) {
      p.ordinary_pay_period.kind = "over_31_days";
      p.ordinary_pay_period.period_to = "2025-06-30";
    }
  }
  if (kind === "no-ordinary" || kind === "irregular-mixed-birthday") {
    r.no_ordinary_frequency_review = {
      employer_pay_practice_source_reference: "2025-parent-irregular-employer-practice",
      complete_payment_period_ledger_source_reference: "2025-parent-irregular-complete-period-ledger",
      no_ordinary_payment_period_verified: true,
    };
    for (const p of r.wage_payments) p.ordinary_pay_period.kind = "no_ordinary_period";
  }
  if (kind === "partial-installments") {
    const first = r.wage_payments[0];
    first.cash_wages = 500;
    const second = structuredClone(first);
    second.cash_wages = 750;
    second.payment_reference = "parent-march-second-bank-installment";
    second.paid_date = "2025-04-01";
    r.wage_payments.splice(1, 0, second);
    parent.quarterly_cash_wages = [500, 2000, 1250, 1250];
  }
  const covered = kind === "birthday-majority" ? 3750
    : kind === "birthday-minority" ? 2900
    : kind.endsWith("mixed-birthday") ? 3325
    : kind === "midquarter-divorce" ? 3350
    : kind === "midquarter-widow" ? 3350
    : kind === "cross-quarter-care" ? 3950 : 5000;
  // In the birthday cases the pre-birthday hours qualify; a tie also qualifies.
  parent.w2.box3_social_security_wages = parent.w2.box5_medicare_wages =
    covered < 2800 ? 0 : covered;
  h.ss_wages = h.medicare_wages = 2800 + (covered < 2800 ? 0 : covered);
  return inputs;
}

Deno.test("Schedule H parent dated status and ordinary-period majority reaches full return", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const root = flag >= 0 ? Deno.args[flag + 1] : undefined;
  const xsd = parentXsdPath();
  const cases: [DatedParentKind, number, number][] = [
    ["birthday-majority", 1302, 3750], ["birthday-minority", 1172, 2900],
    ["midquarter-divorce", 1241, 3350], ["quarter-care", 1493, 5000],
    ["cross-quarter-care", 1333, 3950], ["long-period", 1493, 5000],
    ["no-ordinary", 1493, 5000], ["partial-installments", 1493, 5000],
    ["long-mixed-birthday", 1238, 3325],
    ["irregular-mixed-birthday", 1238, 3325],
  ];
  const onlyFlag = Deno.args.indexOf("--only-parent-kind");
  const onlyKind = onlyFlag >= 0 ? Deno.args[onlyFlag + 1] : undefined;
  for (const [kind, tax, parentWages] of cases) {
    if (onlyKind && kind !== onlyKind) continue;
    const inputs = datedParentSource(kind);
    const r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, [], kind);
    assertEquals(inputs.schedule_h.ss_wages, 2800 + parentWages, kind);
    assertEquals(r.pending.schedule2.line9_household_employment, tax, kind);
    assertEquals(r.pending.f1040.line23_other_taxes, tax, kind);
    const pending = buildPending(r.pending), filer = extractFilerIdentity(r.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(bundle.xml.includes(`<CombinedFUTATaxPlusNetTaxesAmt>${tax}</CombinedFUTATaxPlusNetTaxesAmt>`), true, kind);
    const origins: any[] = [];
    const pdf = await buildPdfBytes(bundle.pending, filer, ".pdf-cache", bundle, origins);
    const temp = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(temp, bundle.xml);
      const check = await new Deno.Command("xmllint", { args: ["--noout", "--schema", xsd, temp], stdout: "piped", stderr: "piped" }).output();
      assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
    } finally { await Deno.remove(temp); }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(`${root}/${kind}.json`, JSON.stringify({ inputs, pending, preparedPending: bundle.pending, carryforwards: r.carryforwards, filer, origins }, null, 2));
      await Deno.writeTextFile(`${root}/${kind}.xml`, bundle.xml);
      await Deno.writeFile(`${root}/${kind}.pdf`, pdf);
    }
  }
});

Deno.test("Schedule H parent dated sources reject omitted periods, false medical quarters and cash conflicts", async () => {
  const valid = datedParentSource("cross-quarter-care");
  const result = f1040_2025.executeReturn(valid);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  const rejects = async (kind: DatedParentKind, mutate: (parent: any, h: any) => void) => {
    const x = datedParentSource(kind);
    const h = x.schedule_h, parent = h.fica_only_payroll.employee_wages[3];
    mutate(parent, h);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(h), 2025));
    assertThrows(() => scheduleH.build(h, { filer, pending }));
    await assertRejects(() => buildPdfBytes({ ...bundle.pending, schedule_h: h }, filer, ".pdf-cache"));
  };
  await rejects("birthday-majority", (p) => p.parent_fica_review.wage_payments[2].service_allocation_reference = p.parent_fica_review.wage_payments[1].service_allocation_reference);
  await rejects("birthday-majority", (p) => p.parent_fica_review.wage_payments[2].ordinary_pay_period.service_time_source_reference = p.parent_fica_review.wage_payments[1].ordinary_pay_period.service_time_source_reference);
  await rejects("birthday-majority", (p) => p.parent_fica_review.wage_payments[2].service_hours = 0);
  await rejects("midquarter-divorce", (p) => p.parent_fica_review.quarterly_circumstances[1].employer_circumstances.divorce_date = "2025-05-20");
  await rejects("cross-quarter-care", (p) => p.parent_fica_review.quarterly_circumstances[1].employer_circumstances.incapable_care_period.to = "2025-04-27");
  await rejects("cross-quarter-care", (p) => p.parent_fica_review.wage_payments[3].service_to = "2025-07-01");
  await rejects("long-period", (p) => p.parent_fica_review.wage_payments[0].ordinary_pay_period.kind = "within_31_days");
  await rejects("no-ordinary", (p) => delete p.parent_fica_review.no_ordinary_frequency_review);
  await rejects("partial-installments", (p) => p.parent_fica_review.wage_payments[1].cash_wages = 751);
  const widow = datedParentSource("midquarter-widow");
  const widowResult = f1040_2025.executeReturn(widow);
  assertEquals(widowResult.diagnostics, []);
  const widowPending = buildPending(widowResult.pending);
  const widowFiler = extractFilerIdentity(widowResult.pending.f1040)!;
  await assertRejects(() => buildMefBundle(widowPending, { filer: widowFiler, attachments: [] }), Error, "deceased Form 1040");
  await assertRejects(() => buildPdfBytes(widowPending, widowFiler, ".pdf-cache"), Error, "deceased Form 1040");
});
