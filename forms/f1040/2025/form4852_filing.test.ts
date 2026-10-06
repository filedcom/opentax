import { assertForm4852RetainedEvidence } from "./form4852_retained_evidence.ts";
import { multipleNuaInputs } from "./pdf/review-4972-multiple-nua.fixture.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { createHash } from "node:crypto";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { FilingStatus } from "../mef/header.ts";
import { FormType } from "../nodes/inputs/f4852/index.ts";
import {
  form4852BaseInputs,
  form4852Filer,
  officialForm4852EvidenceTemplate,
  retainedForm4852Sources,
  substitute,
} from "./form4852_filing.fixture.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { w2 } from "../nodes/inputs/w2/index.ts";
import { f1099r } from "../nodes/inputs/f1099r/index.ts";

const root = ".state/research/form4852-source";
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
const ordinaryW2 = {
  employer_name: "Other Payroll Employer",
  employer_ein: "22-3456789",
  employer_address_line1: "3 Source Way",
  employer_address_city: "Sacramento",
  employer_address_state: "CA",
  employer_address_zip: "95814",
  employee_ssn: "111223333",
  source_document_reference: "2025-issued-other-employer-W2",
  box1_wages: 75000,
  box2_fed_withheld: 11000,
  box3_ss_wages: 75000,
  box4_ss_withheld: 4650,
  box5_medicare_wages: 75000,
  box6_medicare_withheld: 1087.5,
};
const pension = (n: number, facts: Record<string, unknown>) =>
  substitute(FormType.R_1099, n, {
    gross_distribution: 30000,
    taxable_amount: 20000,
    distribution_code: "7",
    ...facts,
  });
const template = () => officialForm4852EvidenceTemplate("f4852");

Deno.test("Form4852 actual public completed-PDF sources reconcile multiple owners/copies, FICA/SE/SALT and retirement consequences to whole returns", async () => {
  const jointFiler = {
    ...form4852Filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    nameLine1: "ALEX AND SAM EXAMPLE",
    spouse: {
      ssn: "444556666",
      firstName: "Sam",
      lastName: "Example",
      nameControl: "EXAM",
    },
  };
  const early = pension(12, {
    gross_distribution: 10000,
    taxable_amount: 10000,
    distribution_code: "1",
    is_ira: true,
    federal_withheld: 1500,
  });
  const rolled = pension(13, {
    gross_distribution: 60000,
    taxable_amount: 0,
    distribution_code: "G",
  });
  const basis = pension(14, {
    gross_distribution: 50000,
    taxable_amount: 50000,
    is_ira: true,
    retirement_source: {
      payer_name: "Reviewed Retirement Custodian",
      payer_ein: "123456790",
      box1_gross_distribution: 50000,
      box2a_taxable_amount: 50000,
      box7_distribution_code: "7",
      box7_ira_simple_indicator: true,
      ts: "T",
      prior_ira_basis: 10000,
      year_end_ira_value: 50000,
      form8606_distribution_evidence: {
        prior_form8606: {
          tax_year: 2024,
          source_document_reference: "2024-filed-prior-basis8606",
          owner_ssn: "111223333",
          filed_line14_basis: 10000,
        },
        year_end_statement: {
          as_of: "2025-12-31",
          source_document_reference: "2025-all-IRA-yearend-statement",
          owner_ssn: "111223333",
          all_traditional_ira_balances_included_confirmed: true,
          total_fair_market_value: 50000,
        },
        form1099r_source_document_reference: "4852-completed-14",
        no_current_nondeductible_contribution_confirmed: true,
        no_other_traditional_ira_distribution_or_conversion_confirmed: true,
        no_rollover_repayment_qcd_hsa_or_disaster_amount_confirmed: true,
      },
    },
  });
  const lumpInputs = multipleNuaInputs(1, 0);
  const lumpOriginal = lumpInputs.f1099r[0];
  const lumpItem = substitute(FormType.R_1099, 21, {
    payer_name: lumpOriginal.payer_name,
    payer_tin: lumpOriginal.payer_ein,
    recipient_ssn: "123456789",
    subject_ts: "T",
    gross_distribution: 12000,
    taxable_amount: 10000,
    capital_gain: 1000,
    distribution_code: "A",
    total_distribution: true,
    retirement_source: {
      ...lumpOriginal,
      source_document_reference: "4852-completed-21",
      box2b_total_dist: true,
    },
  });
  const { f1099r: _issued, ...lumpSource } = lumpInputs;
  const lumpPublic = {
    ...lumpSource,
    form4972: {
      elections: [{
        ...lumpInputs.form4972.elections[0],
        source_document_references: ["4852-completed-21"],
      }],
    },
  };
  const multipleLumpInputs = multipleNuaInputs(2, 0);
  const multipleLumpItems = multipleLumpInputs.f1099r.map((original, index) =>
    substitute(FormType.R_1099, 22 + index, {
      payer_name: original.payer_name,
      payer_tin: original.payer_ein,
      recipient_ssn: "123456789",
      subject_ts: "T",
      gross_distribution: 12000,
      taxable_amount: 10000,
      capital_gain: 1000,
      distribution_code: "A",
      total_distribution: true,
      retirement_source: {
        ...original,
        source_document_reference: `4852-completed-${22 + index}`,
        box2b_total_dist: true,
      },
    })
  );
  const { f1099r: _multipleIssued, ...multipleLumpSource } = multipleLumpInputs;
  const multipleLumpPublic = {
    ...multipleLumpSource,
    form4972: {
      elections: [{
        ...multipleLumpInputs.form4972.elections[0],
        source_document_references: ["4852-completed-22", "4852-completed-23"],
      }],
    },
  };
  const rows = [
    {
      id: "salt-incorrect-W2",
      filer: form4852Filer,
      inputs: form4852BaseInputs(),
      items: [substitute(FormType.W2, 1, {
        missing_or_incorrect: "incorrect",
        wages: 75000,
        federal_withheld: 11000,
        social_security_wages: 75000,
        social_security_withheld: 4650,
        medicare_wages: 75000,
        medicare_withheld: 1087.5,
        state_tax_withheld: 20000,
        state_name: "CA",
      })],
      expected: {
        line1a_wages: 75000,
        line11_agi: 75000,
        line12e_itemized_deductions: 20000,
        line15_taxable_income: 55000,
        line24_total_tax: 7020,
        line35a_refund: 3980,
      },
    },
    {
      id: "same-payer-issued-and-substitute-W2",
      filer: form4852Filer,
      inputs: {
        ...form4852BaseInputs(),
        w2: [{
          ...ordinaryW2,
          employer_name: "Reviewed Payroll Employer",
          employer_ein: "123456789",
          source_document_reference: "2025-issued-separate-payroll-account",
          box1_wages: 5000,
          box2_fed_withheld: 1000,
          box3_ss_wages: 5000,
          box4_ss_withheld: 310,
          box5_medicare_wages: 5000,
          box6_medicare_withheld: 72.5,
        }],
      },
      items: [substitute(FormType.W2, 5, {
        wages: 75000,
        federal_withheld: 11000,
        social_security_wages: 75000,
        social_security_withheld: 4650,
        medicare_wages: 75000,
        medicare_withheld: 1087.5,
        state_tax_withheld: 20000,
        state_name: "CA",
      })],
      expected: {
        line1a_wages: 80000,
        line11_agi: 80000,
        line12e_itemized_deductions: 20000,
        line15_taxable_income: 60000,
        line24_total_tax: 8120,
        line35a_refund: 3880,
      },
    },
    {
      id: "joint-copies-SE-cap",
      filer: jointFiler,
      inputs: {
        ...form4852BaseInputs(true),
        w2: [{
          ...ordinaryW2,
          box1_wages: 100000,
          box2_fed_withheld: 15000,
          box3_ss_wages: 100000,
          box4_ss_withheld: 6200,
          box5_medicare_wages: 100000,
          box6_medicare_withheld: 1450,
        }],
        f1099nec: [{
          payer_name: "Actual Consulting Client",
          payer_tin: "333456789",
          recipient_ssn: "111223333",
          account_number: "CONSULTING-2025",
          source_document_reference: "2025-issued-consulting-1099NEC",
          box1_nec: 21500,
          for_routing: "schedule_c",
          schedule_c_business_reference: "Owned-Consulting",
        }],
        schedule_c: [{
          business_reference: "Owned-Consulting",
          proprietor_recipient: "T",
          line_a_principal_business: "Consulting",
          line_b_business_code: "541600",
          line_c_business_name: "Alex Consulting",
          line_d_ein: "123456792",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_i_made_1099_payments: false,
          qbi_no_other_adjustments_confirmed: true,
          line_1_gross_receipts: 21500,
          line_8_advertising: 1500,
          line_32_at_risk: "a",
        }],
      },
      items: [
        substitute(FormType.W2, 2, {
          wages: 90000,
          federal_withheld: 15000,
          social_security_wages: 90000,
          social_security_withheld: 5580,
          medicare_wages: 90000,
          medicare_withheld: 1305,
        }),
        substitute(FormType.W2, 3, {
          wages: 10000,
          federal_withheld: 1000,
          social_security_wages: 10000,
          social_security_withheld: 620,
          medicare_wages: 10000,
          medicare_withheld: 145,
        }),
        substitute(FormType.W2, 4, {
          recipient_ssn: "444556666",
          subject_ts: "S",
          wages: 50000,
          federal_withheld: 9000,
          social_security_wages: 50000,
          social_security_withheld: 3100,
          medicare_wages: 50000,
          medicare_withheld: 725,
        }),
      ],
      expected: {
        line1a_wages: 250000,
        line11_agi: 269732,
        line13_qbi_deduction: 3946,
        line15_taxable_income: 234286,
        line24_total_tax: 42625,
      },
    },
    {
      id: "retirement-net-basis-early-rollover",
      filer: form4852Filer,
      inputs: {
        ...form4852BaseInputs(),
        w2: [{ ...ordinaryW2, box17_state_withheld: 2000, box15_state: "CA" }],
        f1099r: [{
          payer_name: "Reviewed Retirement Custodian",
          payer_ein: "123456790",
          payer_address_line1: "2 Source Way",
          payer_address_city: "Sacramento",
          payer_address_state: "CA",
          payer_address_zip: "95814",
          recipient_ssn: "111223333",
          recipient_address_line1: "1 Example Way",
          recipient_address_city: "Sacramento",
          recipient_address_state: "CA",
          recipient_address_zip: "95814",
          ts: "T",
          account_number: "ACTUAL-OTHER-ACCOUNT",
          source_document_reference: "2025-issued-other-retirement-account",
          box1_gross_distribution: 5000,
          box2a_taxable_amount: 5000,
          box7_distribution_code: "2",
          box4_federal_withheld: 500,
        }],
      },
      items: [
        pension(11, {
          distribution_code: "2",
          missing_or_incorrect: "incorrect",
          employee_contributions: 10000,
          federal_withheld: 2000,
          state_tax_withheld: 20000,
          state_name: "CA",
        }),
        early,
        rolled,
      ],
      expected: {
        line1a_wages: 75000,
        line4a_ira_gross: 10000,
        line4b_ira_taxable: 10000,
        line5a_pension_gross: 95000,
        line5b_pension_taxable: 25000,
        line11_agi: 110000,
        line12e_itemized_deductions: 22000,
        line15_taxable_income: 88000,
        line24_total_tax: 15280,
      },
    },
    {
      id: "joint-retirement-same-payer-owners",
      filer: jointFiler,
      inputs: {
        ...form4852BaseInputs(true),
        w2: [{
          ...ordinaryW2,
          box1_wages: 125000,
          box3_ss_wages: 125000,
          box4_ss_withheld: 7750,
          box5_medicare_wages: 125000,
          box6_medicare_withheld: 1812.5,
        }],
      },
      items: [
        pension(24, {
          gross_distribution: 20000,
          taxable_amount: 20000,
          distribution_code: "2",
          federal_withheld: 2000,
        }),
        pension(25, {
          recipient_ssn: "444556666",
          subject_ts: "S",
          gross_distribution: 15000,
          taxable_amount: 15000,
          distribution_code: "2",
          federal_withheld: 1500,
        }),
      ],
      expected: {
        line1a_wages: 125000,
        line5a_pension_gross: 35000,
        line5b_pension_taxable: 35000,
        line11_agi: 160000,
        line15_taxable_income: 128500,
        line24_total_tax: 18098,
        line37_amount_owed: 3598,
      },
    },
    {
      id: "retirement-prior-IRA-basis",
      filer: form4852Filer,
      inputs: {
        ...form4852BaseInputs(),
        general: {
          ...form4852BaseInputs().general,
          taxpayer_dob: "1964-01-01",
        },
        w2: [ordinaryW2],
      },
      items: [basis],
      expected: {
        line4a_ira_gross: 50000,
        line4b_ira_taxable: 45000,
        line11_agi: 120000,
        line15_taxable_income: 104250,
        line24_total_tax: 17867,
      },
    },
    {
      id: "retirement-QCD-actual-transfer",
      filer: form4852Filer,
      inputs: {
        ...form4852BaseInputs(),
        general: {
          ...form4852BaseInputs().general,
          taxpayer_dob: "1950-01-01",
          taxpayer_ssn_valid_for_employment: true,
          taxpayer_ssn_issued_before_due_date: true,
          taxpayer_tin_issued_by_due_date: true,
        },
        w2: [ordinaryW2],
        schedule1a: {
          senior_zero_exclusions_review: {
            no_section933_puerto_rico_excluded_income: true,
            section933_review_source_reference:
              "2025 actual domicile and income inventory",
            no_form2555_filed: true,
            form2555_review_source_reference:
              "2025 complete foreign-income inventory",
            no_form4563_filed: true,
            form4563_review_source_reference:
              "2025 complete Samoa-income inventory",
          },
        },
      },
      items: [pension(15, {
        gross_distribution: 30000,
        taxable_amount: 30000,
        is_ira: true,
        retirement_source: {
          payer_name: "Reviewed Retirement Custodian",
          payer_ein: "123456790",
          box1_gross_distribution: 30000,
          box2a_taxable_amount: 30000,
          box7_distribution_code: "7",
          box7_ira_simple_indicator: true,
          ts: "T",
          qcd_partial_amount: 20000,
        },
        qcd_transfer_review: {
          owner_ssn: "111223333",
          date_of_birth: "1950-01-01",
          transferred_on: "2025-10-01",
          charity_name: "Reviewed Eligible Relief Charity",
          charity_ein: "123456793",
          amount: 20000,
          direct_custodian_payment_confirmed: true,
          eligible_charity_confirmed: true,
          source_document_reference: "2025-custodian-direct-charity-payment",
        },
      })],
      expected: {
        line4a_ira_gross: 30000,
        line4b_ira_taxable: 10000,
        line11_agi: 85000,
        line15_taxable_income: 61850,
        line24_total_tax: 8527,
      },
    },

    {
      id: "retirement-coded-exemption-SIMPLE",
      filer: form4852Filer,
      inputs: { ...form4852BaseInputs(), w2: [ordinaryW2] },
      items: [
        pension(16, {
          gross_distribution: 4000,
          taxable_amount: 4000,
          distribution_code: "S",
          is_ira: true,
        }),
        pension(17, {
          gross_distribution: 6000,
          taxable_amount: 6000,
          distribution_code: "2",
        }),
        pension(18, {
          gross_distribution: 5000,
          taxable_amount: 0,
          distribution_code: "Q",
          is_ira: true,
        }),
        pension(19, {
          gross_distribution: 8000,
          taxable_amount: 0,
          distribution_code: "N",
          is_ira: true,
        }),
      ],
      expected: {
        line4a_ira_gross: 9000,
        line4b_ira_taxable: 4000,
        line5a_pension_gross: 6000,
        line5b_pension_taxable: 6000,
        line11_agi: 85000,
        line15_taxable_income: 69250,
        line24_total_tax: 11155,
      },
    },

    {
      id: "retirement-shared-plan-multiple-copies",
      filer: extractFilerIdentity(multipleLumpInputs.general)!,
      inputs: multipleLumpPublic,
      items: multipleLumpItems,
      expected: {
        line11_agi: 0,
        line15_taxable_income: 0,
        line24_total_tax: 1790,
      },
    },
    {
      id: "retirement-capital-NUA-election",
      filer: extractFilerIdentity(lumpInputs.general)!,
      inputs: lumpPublic,
      items: [lumpItem],
      expected: {
        line11_agi: 0,
        line15_taxable_income: 0,
        line24_total_tax: 830,
      },
    },
  ];
  for (const row of rows) {
    const retained = await retainedForm4852Sources(
      row.items,
      row.filer,
      await template(),
    );
    if (
      row.id === "salt-incorrect-W2" ||
      row.id === "retirement-net-basis-early-rollover"
    ) {
      const w2Original = row.items[0].form_type === FormType.W2;
      const original = await PDFDocument.load(
        await officialForm4852EvidenceTemplate(w2Original ? "fw2" : "f1099r"),
      );
      const form = original.getForm();
      const originalValues = w2Original
        ? [
          ["CopyB_Top[0].BoxA_ReadOrder[0].f2_01[0]", "111-22-3333"],
          ["CopyB_Top[0].Col_Left[0].f2_02[0]", "12-3456789"],
          ["CopyB_Top[0].Col_Left[0].f2_03[0]", "Reviewed Payroll Employer"],
          ["CopyB_Top[0].Col_Right[0].Box1_ReadOrder[0].f2_09[0]", "80000"],
        ]
        : [
          ["CopyB[0].LeftCol[0].PayersTIN[0].f2_9[0]", "12-3456790"],
          ["CopyB[0].LeftCol[0].f2_10[0]", "111-22-3333"],
          ["CopyB[0].LeftCol[0].f2_1[0]", "Reviewed Retirement Custodian"],
          ["CopyB[0].RightCol[0].f2_19[0]", "35000"],
          ["CopyB[0].RightCol[0].f2_20[0]", "25000"],
          ["CopyB[0].RightCol[0].Box5_ReadOrder[0].f2_23[0]", "10000"],
          ["CopyB[0].RightCol[0].f2_25[0]", "7"],
        ];
      for (const [suffix, value] of originalValues) {
        const field = form.getFields().find((f) =>
          f.getName().endsWith(suffix)
        )!;
        assertEquals(field instanceof PDFTextField, true);
        (field as PDFTextField).setText(value);
      }
      const originalFields = Object.fromEntries(
        form.getFields().flatMap((f) => {
          const v = f instanceof PDFTextField
            ? f.getText()
            : f instanceof PDFCheckBox
            ? f.isChecked()
            : undefined;
          return v === undefined || v === "" || v === false
            ? []
            : [[f.getName(), v]];
        }),
      );
      const originalReference = w2Original
        ? "2025-incorrect-original-W2"
        : "2025-incorrect-original-R";
      const bytes = await original.save();
      retained.documents.push({ document_reference: originalReference, bytes });
      (retained.reviewed_source.records[0] as any).incorrect_original = {
        document_reference: originalReference,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
      const wp = retained.documents.find((d) =>
        d.document_reference === row.items[0].source_workpaper_reference
      )!;
      const revised = new TextEncoder().encode(
        JSON.stringify({
          substitute: row.items[0],
          original_pdf_fields: originalFields,
        }),
      );
      (wp as any).bytes = revised;
      retained.reviewed_source.records[0].source_workpaper.sha256 = createHash(
        "sha256",
      ).update(revised).digest("hex");
    }
    if (row.id === "same-payer-issued-and-substitute-W2") {
      const other = substitute(FormType.W2, 6, {
        wages: 5000,
        federal_withheld: 1000,
        social_security_wages: 5000,
        social_security_withheld: 310,
        medicare_wages: 5000,
        medicare_withheld: 72.5,
      }).payroll_allocations!;
      const otherCopies = ["2025-issued-separate-payroll-account"];
      const otherSources = [{
        issued_source_document_reference: otherCopies[0],
        source_copy_lineage: "2025-issued-separate-payroll-source",
        payroll_allocations: other,
      }];
      const record = retained.reviewed_source.records[0] as any;
      record.other_current_copy_references = otherCopies;
      record.other_current_copy_sources = otherSources;
      for (const payroll of other) {
        const bytes = new TextEncoder().encode(JSON.stringify(payroll));
        retained.documents.push({
          document_reference: payroll.source_document_reference,
          bytes,
        });
        record.treatment_documents.push({
          document_reference: payroll.source_document_reference,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
      const wp = retained.documents.find((d) =>
        d.document_reference === record.source_workpaper.document_reference
      )!;
      (wp as any).bytes = new TextEncoder().encode(
        JSON.stringify({
          substitute: row.items[0],
          other_current_copy_references: otherCopies,
          other_current_copy_sources: otherSources,
        }),
      );
      record.source_workpaper.sha256 = createHash("sha256").update(wp.bytes)
        .digest("hex");
    }
    if (row.id === "retirement-prior-IRA-basis") {
      const evidence = row.items[0].retirement_source!
        .form8606_distribution_evidence!;
      const prior = await PDFDocument.load(
        await officialForm4852EvidenceTemplate("f8606-2024"),
      );
      prior.getForm().getTextField("topmostSubform[0].Page1[0].f1_2[0]")
        .setText(evidence.prior_form8606.owner_ssn);
      prior.getForm().getTextField("topmostSubform[0].Page1[0].f1_23[0]")
        .setText(String(evidence.prior_form8606.filed_line14_basis));
      const docs = [
        {
          document_reference: evidence.prior_form8606.source_document_reference,
          bytes: await prior.save(),
        },
        {
          document_reference:
            evidence.year_end_statement.source_document_reference,
          bytes: new TextEncoder().encode(
            JSON.stringify(evidence.year_end_statement),
          ),
        },
      ];
      retained.documents.push(...docs);
      (retained.reviewed_source.records[0] as any).treatment_documents.push(
        ...docs.map((d) => ({
          document_reference: d.document_reference,
          sha256: createHash("sha256").update(d.bytes).digest("hex"),
        })),
      );
    }
    if (row.id === "retirement-QCD-actual-transfer") {
      const transfer = row.items[0].qcd_transfer_review!;
      const bytes = new TextEncoder().encode(JSON.stringify(transfer));
      retained.documents.push({
        document_reference: transfer.source_document_reference,
        bytes,
      });
      (retained.reviewed_source.records[0] as any).treatment_documents.push({
        document_reference: transfer.source_document_reference,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    if (row.id === "retirement-net-basis-early-rollover") {
      const otherCopies = ["2025-issued-other-retirement-account"];
      const distributionSource = {
        source_document_reference:
          "2025-retained-actual-other-account-distribution",
        payer_tin: "123456790",
        owner_ssn: "111223333",
        account_number: "ACTUAL-OTHER-ACCOUNT",
        distribution_reference: "ACTUAL-OTHER-DISTRIBUTION",
        paid_on: "2025-09-15",
        gross_distribution: 5000,
        taxable_amount: 5000,
        employee_contributions: 0,
        capital_gain: 0,
        federal_withheld: 500,
        state_tax_withheld: 0,
        local_tax_withheld: 0,
        distribution_code: "2",
        is_ira: false,
      };
      const otherSources = [{
        issued_source_document_reference: otherCopies[0],
        source_copy_lineage: "2025 actual issued other account copy",
        distribution_source: distributionSource,
      }];
      const otherBytes = new TextEncoder().encode(
        JSON.stringify(distributionSource),
      );
      retained.documents.push({
        document_reference: distributionSource.source_document_reference,
        bytes: otherBytes,
      });
      for (
        const [index, record] of retained.reviewed_source.records.entries()
      ) {
        (record as any).other_current_copy_references = otherCopies;
        (record as any).other_current_copy_sources = otherSources;
        (record as any).treatment_documents.push({
          document_reference: distributionSource.source_document_reference,
          sha256: createHash("sha256").update(otherBytes).digest("hex"),
        });
        const doc = retained.documents.find((d) =>
          d.document_reference === record.source_workpaper.document_reference
        )!;
        const bytes = new TextEncoder().encode(JSON.stringify({
          ...JSON.parse(new TextDecoder().decode(doc.bytes)),
          substitute: row.items[index],
          other_current_copy_references: otherCopies,
          other_current_copy_sources: otherSources,
        }));
        (doc as any).bytes = bytes;
        record.source_workpaper.sha256 = createHash("sha256").update(bytes)
          .digest("hex");
      }
    }
    if (
      row.id === "retirement-capital-NUA-election" ||
      row.id === "retirement-shared-plan-multiple-copies"
    ) {
      const plan = row.items[0].retirement_source!.form4972_plan!;
      const docs = [plan.plan_reference, plan.full_balance_statement_reference]
        .map((document_reference) => ({
          document_reference,
          bytes: new TextEncoder().encode(JSON.stringify(plan)),
        }));
      retained.documents.push(...docs);
      for (const record of retained.reviewed_source.records) {
        (record as any).treatment_documents.push(
          ...docs.map((d) => ({
            document_reference: d.document_reference,
            sha256: createHash("sha256").update(d.bytes).digest("hex"),
          })),
        );
      }
    }
    const inputs = {
      ...row.inputs,
      f4852: row.items,
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], row.id);
    const pending = normalizeAllPending(result.pending);
    console.log(row.id, pending.f1040);
    for (const [field, value] of Object.entries(row.expected)) {
      assertEquals(pending.f1040[field], value, `${row.id} ${field}`);
    }
    if (pending.w2) {
      const parsed = w2.inputSchema.parse(pending.w2);
      assertEquals(
        w2.inputSchema.parse(parsed),
        parsed,
        "W2 repeated parsing must not duplicate substitute copies",
      );
    }
    if (pending.f1099r) {
      const parsed = f1099r.inputSchema.parse(pending.f1099r);
      assertEquals(
        f1099r.inputSchema.parse(parsed),
        parsed,
        "1099R repeated parsing must not duplicate substitute copies",
      );
    }
    const prepared = await f1040_2025.prepareReturn(
      result.pending,
      row.filer,
      [],
      retained.documents,
    );
    assertEquals(
      prepared.bundle.attachments.length,
      0,
      "ERO retention must not transmit workpapers/originals as IRS attachments",
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRSW2 /g) ?? []).length,
      ((row.inputs as any).w2?.length ?? 0) +
        row.items.filter((i) => i.form_type === "W2").length,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<IRS1099R /g) ?? []).length,
      ((row.inputs as any).f1099r?.length ?? 0) +
        row.items.filter((i) => i.form_type === "R_1099").length,
    );
    assertStringIncludes(prepared.bundle.xml, "<StandardOrNonStandardCd>N</");
    await Deno.writeTextFile(`${root}/${row.id}.xml`, prepared.bundle.xml);
    const x = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, `${root}/${row.id}.xml`],
    }).output();
    assertEquals(x.code, 0, new TextDecoder().decode(x.stderr));
    const origins: PdfPageOrigin[] = [];
    await Deno.writeFile(
      `${root}/${row.id}.pdf`,
      await buildPdfBytes(
        prepared.bundle.pending,
        row.filer,
        ".pdf-cache",
        prepared.bundle,
        origins,
      ),
    );
    await Deno.writeTextFile(
      `${root}/${row.id}.origins.json`,
      JSON.stringify(origins, null, 2),
    );
    await Deno.writeTextFile(
      `${root}/${row.id}.source.json`,
      JSON.stringify({ inputs, filer: row.filer, pending }, null, 2),
    );
    await Deno.mkdir(`${root}/${row.id}-retained`, { recursive: true });
    const documentManifest = [];
    for (const [index, doc] of retained.documents.entries()) {
      const path = `${row.id}-retained/document-${index + 1}.bin`;
      await Deno.writeFile(`${root}/${path}`, doc.bytes);
      documentManifest.push({
        document_reference: doc.document_reference,
        path,
        sha256: createHash("sha256").update(doc.bytes).digest("hex"),
      });
    }
    await Deno.writeTextFile(
      `${root}/${row.id}.documents.json`,
      JSON.stringify(documentManifest, null, 2),
    );

    for (
      const mutate of [
        (p: any) => p.f1040.line25a_w2_withheld++,
        (p: any) => p.f4852.f4852s[0].recipient_ssn = "999887777",
        (p: any) => {
          const key = p.w2?.substitute_w2s ? "w2" : "f1099r";
          const field = key === "w2" ? "substitute_w2s" : "substitute_f1099rs";
          p[key][field].pop();
        },
      ]
    ) {
      const changed = structuredClone(result.pending);
      mutate(changed);
      await assertRejects(() =>
        f1040_2025.prepareReturn(changed, row.filer, [], retained.documents)
      );
      await assertRejects(() =>
        buildPdfBytes(changed, row.filer, ".pdf-cache", prepared.bundle)
      );
    }
    if (row.id === "retirement-net-basis-early-rollover") {
      assertStringIncludes(prepared.bundle.xml, "<StateAndLocalTaxAmt>22000</");
      for (
        const mutate of [
          (p: any) => p.schedule_a.retirement_state_local_withholding++,
          (p: any) => p.f4852.f4852s[0].state_tax_withheld++,
          (p: any) => p.f1099r.substitute_f1099rs[0].box14_state_tax++,
        ]
      ) {
        const changed = structuredClone(result.pending);
        mutate(changed);
        await assertRejects(() =>
          f1040_2025.prepareReturn(changed, row.filer, [], retained.documents)
        );
        await assertRejects(() =>
          buildPdfBytes(changed, row.filer, ".pdf-cache", prepared.bundle)
        );
      }
    }
    if (
      row.id === "salt-incorrect-W2" ||
      row.id === "retirement-net-basis-early-rollover"
    ) {
      for (
        const kind of [
          "completed_form",
          "source_workpaper",
          "treatment_documents",
          "incorrect_original",
        ] as const
      ) {
        const changed = structuredClone(result.pending) as any;
        const record = changed.f4852.reviewed_source.records[0];
        const target = kind === "treatment_documents"
          ? record.treatment_documents[0]
          : record[kind];
        const document = retained.documents.find((d) =>
          d.document_reference === target.document_reference
        )!;
        let bytes: Uint8Array;
        if (kind === "completed_form" || kind === "incorrect_original") {
          const pdf = await PDFDocument.load(document.bytes);
          const name = kind === "incorrect_original"
            ? (row.items[0].form_type === FormType.W2
              ? "topmostSubform[0].CopyB[0].CopyB_Top[0].Col_Right[0].Box1_ReadOrder[0].f2_09[0]"
              : "topmostSubform[0].CopyB[0].RightCol[0].f2_19[0]")
            : row.items[0].form_type === FormType.W2
            ? "topmostSubform[0].Page1[0].Line7Lft[0].f1_7[0]"
            : "topmostSubform[0].Page1[0].Line8Lft[0].f1_18[0]";
          pdf.getForm().getTextField(name).setText("999999");
          bytes = await pdf.save();
        } else {
          const facts = JSON.parse(new TextDecoder().decode(document.bytes));
          if (kind === "source_workpaper") {
            facts.substitute.payer_name = "Conflicting Actual Payer";
          } else facts.owner_ssn = "999887777";
          bytes = new TextEncoder().encode(JSON.stringify(facts));
        }
        target.sha256 = createHash("sha256").update(bytes).digest("hex");
        const changedDocuments = retained.documents.map((d) =>
          d.document_reference === target.document_reference
            ? { ...d, bytes }
            : d
        );
        await assertRejects(() =>
          assertForm4852RetainedEvidence(changed, row.filer, changedDocuments)
        );
        await assertRejects(() =>
          f1040_2025.prepareReturn(changed, row.filer, [], changedDocuments)
        );
      }
    }
    const changedBytes = retained.documents.map((d, i) =>
      i ? d : { ...d, bytes: Uint8Array.from([1, 2, 3]) }
    );
    await assertRejects(() =>
      f1040_2025.prepareReturn(result.pending, row.filer, [], changedBytes)
    );
    await assertRejects(() =>
      buildPdfBytes(prepared.bundle.pending, row.filer, ".pdf-cache", {
        ...prepared.bundle,
        retainedSourceDocuments: changedBytes,
      })
    );
    await assertRejects(() =>
      buildPdfBytes(prepared.bundle.pending, row.filer)
    );
  }
});

Deno.test("Form4852 retained source cannot also enter income as an ordinary W2 or retirement copy", async () => {
  for (const type of [FormType.W2, FormType.R_1099]) {
    const n = type === FormType.W2 ? 30 : 31;
    const item = substitute(
      type,
      n,
      type === FormType.W2
        ? {
          wages: 75000,
          federal_withheld: 11000,
          social_security_wages: 75000,
          social_security_withheld: 4650,
          medicare_wages: 75000,
          medicare_withheld: 1087.5,
        }
        : {
          gross_distribution: 20000,
          taxable_amount: 20000,
          distribution_code: "2",
          federal_withheld: 2000,
        },
    );
    const retained = await retainedForm4852Sources(
      [item],
      form4852Filer,
      await template(),
    );
    const inputs = {
      ...form4852BaseInputs(),
      w2: [
        type === FormType.W2
          ? {
            ...ordinaryW2,
            employer_name: item.payer_name,
            employer_ein: item.payer_tin,
            source_document_reference: item.completed_form_review_reference,
          }
          : ordinaryW2,
      ],
      ...(type === FormType.R_1099
        ? {
          f1099r: [{
            payer_name: item.payer_name,
            payer_ein: item.payer_tin,
            recipient_ssn: "111223333",
            ts: "T",
            account_number: item.account_number,
            source_document_reference: item.completed_form_review_reference,
            box1_gross_distribution: 20000,
            box2a_taxable_amount: 20000,
            box7_distribution_code: "2",
            box4_federal_withheld: 2000,
          }],
        }
        : {}),
      f4852: [item],
      f4852_reviewed_source: { reviewed_source: retained.reviewed_source },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertStringIncludes(
      JSON.stringify(result.diagnostics),
      "repeats the same issued-copy source reference",
    );
    await assertRejects(() =>
      assertForm4852RetainedEvidence(
        result.pending,
        form4852Filer,
        retained.documents,
      )
    );
    await assertRejects(() =>
      f1040_2025.prepareReturn(
        result.pending,
        form4852Filer,
        [],
        retained.documents,
      )
    );
    const { w2: _issuedW2, f1099r: _issuedR, ...validInput } = inputs as Record<
      string,
      unknown
    >;
    if (type === FormType.R_1099) validInput.w2 = [ordinaryW2];
    const valid = f1040_2025.executeReturn(validInput);
    assertEquals(valid.diagnostics, []);
    const prepared = await f1040_2025.prepareReturn(
      valid.pending,
      form4852Filer,
      [],
      retained.documents,
    );
    const changed = structuredClone(prepared.bundle.pending) as any;
    const key = type === FormType.W2 ? "w2" : "f1099r";
    changed[key][key === "w2" ? "w2s" : "f1099rs"] = (inputs as any)[key];
    await assertRejects(
      () =>
        buildPdfBytes(changed, form4852Filer, ".pdf-cache", prepared.bundle),
      Error,
      type === FormType.W2
        ? "ordinary income input cannot reuse"
        : "same issued-copy source reference",
    );
  }
});
