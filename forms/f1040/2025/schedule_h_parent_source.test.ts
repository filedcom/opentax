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

Deno.test("Schedule H parent source derives actual FICA exception by services quarter and retains FUTA exclusion", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts"),
    root = flag >= 0 ? Deno.args[flag + 1] : undefined;
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
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
  rejects((p) => delete p.w2);
  rejects((p) => delete p.federal_withholding_agreement);
  const futa = source("futa").schedule_h;
  futa.federal_unemployment.taxable_wages = 9000;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(futa), 2025));
});
