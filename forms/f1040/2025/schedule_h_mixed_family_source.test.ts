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

// These exact reviewed synthetic facts were retained before implementation.
// Existing unrelated-worker and child sources retain their actual identities.
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
          "employee_id": "child-employee-1",
          "employee_ssn": "400001041",
          "relationship_source_reference": "family-relationship-record",
          "payroll_source_reference": "2025-child-payroll-ledger",
          "ordinary_cash_only": true,
          "annual_cash_wages": 5000,
          "quarterly_cash_wages": [
            1250,
            1250,
            1250,
            1250,
          ],
          "w2": {
            "source_reference": "2025-child-form-w2",
            "employee_ssn": "400001041",
            "box1_wages": 5000,
            "box2_federal_income_tax_withheld": 250,
            "box3_social_security_wages": 0,
            "box5_medicare_wages": 0,
          },
          "relationship": "child",
          "birth_date": "2008-06-15",
          "birth_date_source_reference": "age17-reviewed-birth-record",
          "federal_withholding_agreement": {
            "w4_source_reference": "2025-child-form-w4",
            "employee_requested_and_employer_agreed": true,
          },
        },
      ],
    },
    "family_employer_ssn": "111223333",
  },
};
const spouseInputs: any = {
  "general": {
    "filing_status": "mfj",
    "taxpayer_first_name": "Tara",
    "taxpayer_last_name": "Black",
    "taxpayer_ssn": "400-00-1032",
    "taxpayer_dob": "1980-04-10",
    "digital_assets": false,
    "spouse_first_name": "Sam",
    "spouse_last_name": "Black",
    "spouse_ssn": "400-00-1041",
    "address_line1": "17 Lexington Drive",
    "address_city": "Cincinnati",
    "address_state": "OH",
    "address_zip": "45223",
  },
  "w2": [
    {
      "employee_ssn": "400-00-1041",
      "employer_name": "Tara Black",
      "employer_ein": "123456789",
      "employer_address_line1": "17 Lexington Drive",
      "employer_address_city": "Cincinnati",
      "employer_address_state": "OH",
      "employer_address_zip": "45223",
      "box1_wages": 5000,
      "box2_fed_withheld": 250,
      "box3_ss_wages": 0,
      "box4_ss_withheld": 0,
      "box5_medicare_wages": 0,
      "box6_medicare_withheld": 0,
    },
  ],
  "schedule_h": {
    "employer_ein": "123456789",
    "cash_wages_over_2025_limit": false,
    "cash_wages_over_quarter_limit": false,
    "federal_income_tax_withheld": 250,
    "family_withholding_only_payroll": {
      "all_household_employees_included": true,
      "employer_ssn": "400001032",
      "employee": {
        "employee_id": "spouse-employee-1",
        "employee_ssn": "400001041",
        "relationship": "spouse",
        "relationship_source_reference": "spouse-relationship-review",
        "marriage_date": "2010-06-15",
        "marriage_source_reference": "marriage-certificate-review",
        "marriage_continuity_source_reference":
          "2025-marriage-continuity-review",
        "married_through_2025_verified": true,
        "payroll_source_reference": "2025-spouse-payroll-ledger",
        "ordinary_cash_only": true,
        "annual_cash_wages": 5000,
        "quarterly_cash_wages": [
          1250,
          1250,
          1250,
          1250,
        ],
        "federal_income_tax_withholding_requested_and_agreed": true,
        "w4_source_reference": "2025-spouse-form-w4",
        "w2": {
          "source_reference": "2025-spouse-form-w2",
          "employee_ssn": "400001041",
          "box1_wages": 5000,
          "box2_federal_income_tax_withheld": 250,
          "box3_social_security_wages": 0,
          "box5_medicare_wages": 0,
        },
      },
    },
  },
};

function cases(): Array<
  { id: string; inputs: any; tax: number; futa: number }
> {
  const mixed = structuredClone(heldInputs);
  const futa = structuredClone(mixed), h = futa.schedule_h;
  const inventory = h.fica_only_payroll.employee_wages;
  inventory[0].annual_cash_wages = 3200;
  inventory[0].quarterly_cash_wages = [800, 800, 800, 800];
  inventory[0].w2.box3_social_security_wages = 3200;
  inventory[0].w2.box5_medicare_wages = 3200;
  h.ss_wages = h.medicare_wages = 3200;
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
    employee_wages: inventory,
  };
  const noWithholding = structuredClone(mixed);
  const child = noWithholding.schedule_h.fica_only_payroll.employee_wages[3];
  delete child.w2;
  delete child.federal_withholding_agreement;
  noWithholding.schedule_h.federal_income_tax_withheld = 50;
  const joint = structuredClone(mixed);
  joint.general = structuredClone(spouseInputs.general);
  joint.w2[0].employee_ssn = joint.general.taxpayer_ssn;
  joint.w2.push(structuredClone(spouseInputs.w2[0]));
  joint.schedule_h.family_employer_ssn = "400001032";
  const jointChild = joint.schedule_h.fica_only_payroll.employee_wages[3];
  jointChild.employee_ssn = jointChild.w2.employee_ssn = "400001042";
  const spouse = structuredClone(
    spouseInputs.schedule_h.family_withholding_only_payroll.employee,
  );
  const w4 = spouse.w4_source_reference;
  delete spouse.w4_source_reference;
  delete spouse.federal_income_tax_withholding_requested_and_agreed;
  spouse.federal_withholding_agreement = {
    w4_source_reference: w4,
    employee_requested_and_employer_agreed: true,
  };
  joint.schedule_h.fica_only_payroll.employee_wages.push(spouse);
  joint.schedule_h.federal_income_tax_withheld = 550;
  const legacySpouse = structuredClone(spouseInputs);
  const primary = structuredClone(heldInputs.w2[0]);
  primary.employee_ssn = legacySpouse.general.taxpayer_ssn;
  legacySpouse.w2.unshift(primary);
  const low = structuredClone(heldInputs);
  const lowChild = structuredClone(
    heldInputs.schedule_h.fica_only_payroll.employee_wages[3],
  );
  lowChild.annual_cash_wages = lowChild.w2.box1_wages = 3000;
  lowChild.quarterly_cash_wages = [750, 750, 750, 750];
  lowChild.w2.box2_federal_income_tax_withheld = 150;
  lowChild.federal_income_tax_withholding_requested_and_agreed = true;
  lowChild.w4_source_reference =
    lowChild.federal_withholding_agreement.w4_source_reference;
  delete lowChild.federal_withholding_agreement;
  low.schedule_h = {
    employer_ein: "123456789",
    cash_wages_over_2025_limit: false,
    cash_wages_over_quarter_limit: false,
    federal_income_tax_withheld: 150,
    family_withholding_only_payroll: {
      all_household_employees_included: true,
      employer_ssn: "111223333",
      employee: lowChild,
    },
  };
  return [
    { id: "mixed-fica", inputs: mixed, tax: 728, futa: 0 },
    { id: "mixed-futa", inputs: futa, tax: 814, futa: 24 },
    { id: "family-no-withholding", inputs: noWithholding, tax: 478, futa: 0 },
    { id: "joint-mixed", inputs: joint, tax: 978, futa: 0 },
    { id: "spouse-other-w2", inputs: legacySpouse, tax: 250, futa: 0 },
    { id: "child-below-quarter", inputs: low, tax: 150, futa: 0 },
  ];
}

Deno.test("Schedule H mixed family payroll retains actual relationships through source, Form 1040, native and filled PDF", async () => {
  const flag = Deno.args.indexOf("--write-review-artifacts");
  const root = flag >= 0 ? Deno.args[flag + 1] : undefined;
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  for (const { id, inputs, tax, futa } of cases()) {
    const source = inputSchema.parse(inputs.schedule_h);
    const amounts = computeScheduleHAmounts(source, 2025);
    assertEquals(amounts.totalTax, tax, id);
    assertEquals(amounts.futaTax, futa, id);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], id);
    assertEquals(result.pending.schedule2.line9_household_employment, tax, id);
    assertEquals(result.pending.f1040.line23_other_taxes, tax, id);
    assertEquals(
      result.pending.f1040.line1a_wages,
      inputs.w2.reduce((sum: number, w: any) => sum + w.box1_wages, 0),
      id,
    );
    assertEquals(
      result.pending.f1040.line25a_w2_withheld,
      inputs.w2.reduce((sum: number, w: any) => sum + w.box2_fed_withheld, 0),
      id,
    );
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const xml =
      bundle.xml.match(/<IRS1040ScheduleH\b[\s\S]*?<\/IRS1040ScheduleH>/)![0];
    assertEquals(
      xml.includes(
        `<CombinedFUTATaxPlusNetTaxesAmt>${tax}</CombinedFUTATaxPlusNetTaxesAmt>`,
      ),
      true,
      id,
    );
    assertEquals(xml.includes("<FUTATaxAmt>"), futa > 0, id);
    if (futa) {
      assertEquals(
        xml.includes(
          "<TotalCashWagesSubjFUTATaxAmt>4000</TotalCashWagesSubjFUTATaxAmt>",
        ),
        true,
        id,
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
      futa > 0 ? 2 : 1,
      id,
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
    if (source.fica_only_payroll || source.federal_unemployment) {
      const changed = structuredClone(source);
      (changed.fica_only_payroll ?? changed.federal_unemployment)!
        .employee_wages.at(-1)!.payroll_source_reference =
          "substituted-family-payroll";
      assertThrows(() => scheduleH.build(changed, { filer, pending }));
      assertThrows(() =>
        scheduleHPdf.instances!(
          scheduleHPdf.projectFields!(changed, {}),
          filer,
          {
            schedule_h: source,
            schedule2: pending.schedule2 ?? {},
            w2: { w2s: pending.w2?.w2s },
            f1040: pending.f1040 ?? {},
          },
        )
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
    }
    if (id === "joint-mixed" || id === "spouse-other-w2") {
      const w2s = pending.w2!.w2s!;
      for (const field of ["box4_ss_withheld", "box6_medicare_withheld"]) {
        const changed = structuredClone(w2s);
        (changed[1] as Record<string, unknown>)[field] = 1;
        await assertRejects(() =>
          buildMefBundle({
            ...pending,
            w2: { ...pending.w2, w2s: changed },
          }, { filer, attachments: [] })
        );
      }
    }
    if (id === "joint-mixed") {
      const w2s = pending.w2!.w2s!;
      await assertRejects(() =>
        buildMefBundle({
          ...pending,
          w2: { ...pending.w2, w2s: w2s.slice(0, 1) },
        }, { filer, attachments: [] })
      );
      await assertRejects(() =>
        buildMefBundle({
          ...pending,
          w2: { ...pending.w2, w2s: [...w2s, w2s[1]] },
        }, { filer, attachments: [] })
      );
      await assertRejects(() =>
        buildMefBundle({
          ...pending,
          f1040: { ...pending.f1040, line23_other_taxes: tax - 1 },
        }, { filer, attachments: [] })
      );
    }
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

Deno.test("Schedule H mixed family inventory rejects source, classification, payroll and FUTA contradictions", () => {
  const base = cases()[0].inputs.schedule_h;
  const rejects = (mutate: (x: any) => void) => {
    const x = structuredClone(base);
    mutate(x);
    assertThrows(() => computeScheduleHAmounts(inputSchema.parse(x), 2025));
  };
  rejects((x) => delete x.family_employer_ssn);
  rejects((x) =>
    x.family_employer_ssn = x.fica_only_payroll.employee_wages[3].employee_ssn
  );
  rejects((x) =>
    x.fica_only_payroll.employee_wages[3].birth_date = "2004-12-31"
  );
  rejects((x) =>
    x.fica_only_payroll.employee_wages[3].quarterly_cash_wages[0] = 1249
  );
  rejects((x) =>
    delete x.fica_only_payroll.employee_wages[3].federal_withholding_agreement
  );
  rejects((x) =>
    x.fica_only_payroll.employee_wages[3].w2.box3_social_security_wages = 5000
  );
  rejects((x) =>
    x.fica_only_payroll.employee_wages[3].w2.employee_ssn = "400001042"
  );
  rejects((x) =>
    x.fica_only_payroll.employee_wages[3].payroll_source_reference =
      x.fica_only_payroll.employee_wages[3].w2.source_reference
  );
  rejects((x) => x.fica_only_payroll.employee_wages[3].employee_id = "main");
  rejects((x) =>
    x.fica_only_payroll.employee_wages.push(
      structuredClone(x.fica_only_payroll.employee_wages[3]),
    )
  );
  rejects((x) => x.federal_income_tax_withheld = 50);
  const futa = cases()[1].inputs.schedule_h;
  futa.federal_unemployment.taxable_wages = 9000;
  assertThrows(() => computeScheduleHAmounts(inputSchema.parse(futa), 2025));
});
