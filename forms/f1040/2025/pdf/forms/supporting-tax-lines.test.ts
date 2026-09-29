import { assert, assertEquals, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form8962 } from "../../../nodes/intermediate/forms/form8962/index.ts";
import {
  form8959 as form8959Node,
  inputSchema as form8959InputSchema,
} from "../../../nodes/intermediate/forms/form8959/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { PdfFormDescriptor } from "../form-descriptor.ts";
import { form8959Pdf } from "./f8959.ts";
import { form8960Pdf } from "./f8960.ts";
import { form6251Pdf } from "./f6251.ts";
import { form8962Pdf } from "./f8962.ts";
import { schedule2Pdf } from "./schedule2.ts";

function mappedField(
  descriptor: PdfFormDescriptor,
  domainKey: string,
): string | undefined {
  return descriptor.fields.find((entry) => entry.domainKey === domainKey)
    ?.pdfField;
}

Deno.test("Form 8959 maps resolved box 5 wages and computed totals to lines 1 through 24", () => {
  assertEquals(
    mappedField(form8959Pdf, "line1_medicare_wages"),
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(
    mappedField(form8959Pdf, "line7_wage_tax"),
    "topmostSubform[0].Page1[0].f1_9[0]",
  );
  assertEquals(
    mappedField(form8959Pdf, "line18_total_tax"),
    "topmostSubform[0].Page1[0].f1_20[0]",
  );
  assertEquals(
    mappedField(form8959Pdf, "line24_total_withheld"),
    "topmostSubform[0].Page1[0].f1_26[0]",
  );
});

Deno.test("Form 8959 PDF includes a single-W-2 filing trigger with zero tax", () => {
  assertEquals(
    form8959Pdf.includeWhen?.({
      medicare_wages: 220_000,
      single_w2_over_withholding_threshold: true,
    }, {}),
    true,
  );
  assertEquals(
    form8959Pdf.includeWhen?.({ medicare_wages: 220_000 }, {}),
    false,
  );
  assertEquals(
    form8959Pdf.includeWhen?.({ line24_total_withheld: 45 }, {}),
    true,
  );
});

Deno.test("Form 8959 PDF rejects a print line that differs from upstream deposits", () => {
  const source = {
    filing_status: FilingStatus.Single,
    w2_medicare_wages: 230_000,
    w2_medicare_withheld: 3_635,
  };
  const result = form8959Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form8959InputSchema.parse(source),
  );
  const printed = result.outputs.find((entry) => entry.nodeType === "form8959")
    ?.fields;
  assert(printed);
  const pending = { ...source, ...printed };
  assertEquals(
    form8959Pdf.projectFields?.(pending, {}),
    printed,
  );
  assertThrows(
    () =>
      form8959Pdf.projectFields?.(
        { ...pending, w2_medicare_wages: 229_999 },
        {},
      ),
    Error,
    "upstream source deposits",
  );
  assertThrows(
    () => form8959Pdf.projectFields?.(source, {}),
    Error,
    "filing trigger exists without print lines",
  );
  const noTrigger = {
    filing_status: FilingStatus.Single,
    w2_medicare_wages: 100_000,
  };
  assertEquals(form8959Pdf.projectFields?.(noTrigger, {}), noTrigger);
  assertThrows(
    () =>
      form8959Pdf.projectFields?.({}, {
        w2: {
          w2s: [{
            box1_wages: 210_000,
            box2_fed_withheld: 0,
            box5_medicare_wages: 210_000,
            box6_medicare_withheld: 3_045,
          }],
        },
      }),
    Error,
    "original source records",
  );
});

Deno.test("Schedule 2 maps Additional Medicare Tax and NIIT to 2025 lines 11 and 12", () => {
  assertEquals(
    mappedField(schedule2Pdf, "line11_additional_medicare"),
    "form1[0].Page1[0].f1_22[0]",
  );
  assertEquals(
    mappedField(schedule2Pdf, "line12_niit"),
    "form1[0].Page1[0].f1_23[0]",
  );
});

Deno.test("Schedule 2 maps dealer-transfer repayments to 2025 lines 1b and 1c", () => {
  assertEquals(
    mappedField(schedule2Pdf, "line1b_new_clean_vehicle_repayment"),
    "form1[0].Page1[0].f1_04[0]",
  );
  assertEquals(
    mappedField(schedule2Pdf, "line1c_prev_owned_clean_vehicle_repayment"),
    "form1[0].Page1[0].f1_05[0]",
  );
});

Deno.test("Form 8960 maps computed NIIT through line 17", () => {
  assertEquals(
    mappedField(form8960Pdf, "line12_net_investment_income"),
    "topmostSubform[0].Page1[0].f1_22[0]",
  );
  assertEquals(
    mappedField(form8960Pdf, "line17_niit"),
    "topmostSubform[0].Page1[0].f1_27[0]",
  );
});

Deno.test("Form 8960 PDF follows the MAGI filing threshold even with zero NIIT", () => {
  assertEquals(
    form8960Pdf.includeWhen?.({
      line13_magi: 300_000,
      line14_threshold: 200_000,
      line17_niit: 0,
    }),
    true,
  );
  assertEquals(
    form8960Pdf.includeWhen?.({
      line13_magi: 200_000,
      line14_threshold: 200_000,
      line17_niit: 0,
    }),
    false,
  );
  assertEquals(
    form8960Pdf.includeWhen?.({ line1_taxable_interest: 5_000 }),
    false,
  );
});

Deno.test("Form 6251 maps the AMT investment-interest difference to line 2c", () => {
  assertEquals(
    mappedField(form6251Pdf, "line2c_investment_interest"),
    "topmostSubform[0].Page1[0].f1_7[0]",
  );
});

Deno.test("Form 6251 PDF attaches when line 7 exceeds line 10 despite zero AMT", () => {
  assertEquals(
    form6251Pdf.includeWhen?.({
      tentative_tax: 29_094,
      regular_tax: 10_000,
      line11_amt: 0,
    }),
    true,
  );
  assertEquals(
    form6251Pdf.includeWhen?.({
      tentative_tax: 29_094,
      regular_tax: 30_000,
      line11_amt: 0,
    }),
    false,
  );
  assertEquals(
    form6251Pdf.includeWhen?.({ must_file_for_credit: true, line11_amt: 0 }),
    true,
  );
});

Deno.test("Form 8962 PDF includes APTC-only monthly repayment", () => {
  assertEquals(
    form8962Pdf.includeWhen?.({
      monthly_ptc_rows: [{ month_code: "JANUARY", aptc: 200 }],
      total_advance_ptc: 200,
    }),
    true,
  );
  assertEquals(
    form8962Pdf.includeWhen?.({ household_income: 10_000 }),
    false,
  );
});

Deno.test("Form 8962 PDF maps MFS exception certification to line A", () => {
  assertEquals(
    mappedField(form8962Pdf, "mfs_exception_ind"),
    "topmostSubform[0].Page1[0].c1_1[0]",
  );
});

Deno.test("Form 8962 PDF adds the QSEHRA top-margin label to page 1", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const blankSize = (await document.save()).length;
  await form8962Pdf.decoratePages?.(
    document,
    [page],
    { qsehra_ind: true },
    undefined,
  );
  const labeledSize = (await document.save()).length;
  assert(labeledSize > blankSize);
});

Deno.test("Form 8962 PDF maps its calculated lines and monthly table to page 1", () => {
  assertEquals(
    mappedField(form8962Pdf, "federal_poverty_line"),
    "topmostSubform[0].Page1[0].f1_7[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "total_premium_tax_credit"),
    "topmostSubform[0].Page1[0].f1_91[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "pdf_net_premium_tax_credit"),
    "topmostSubform[0].Page1[0].f1_93[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "excess_advance_premium"),
    "topmostSubform[0].Page1[0].f1_96[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "pdf_month_1_premium"),
    "topmostSubform[0].Page1[0].Part2Table2[0].BodyRow1[0].f1_19[0]",
  );
  assertEquals(
    mappedField(form8962Pdf, "pdf_month_12_aptc"),
    "topmostSubform[0].Page1[0].Part2Table2[0].BodyRow12[0].f1_90[0]",
  );
});

Deno.test("Form 8962 PDF projects shared policy percentages without dollar rounding", () => {
  const allocation = {
    policy_number: "POLICY-1",
    other_taxpayer_ssn: "222334444",
    start_month: 1,
    end_month: 6,
    premium_pct: 0.67,
    slcsp_pct: 0.67,
    aptc_pct: 0.67,
  };
  const projected = form8962Pdf.projectFields?.({
    fpl_region: "contiguous",
    applicable_figure: 0.0200,
    monthly_ptc_rows: [{
      month_code: "JANUARY",
      premium: 804,
      slcsp: 1_005,
      contribution: 50,
      max_assistance: 955,
      allowed_credit: 804,
      aptc: 536,
    }],
    shared_policy_allocations: [allocation],
    total_premium_tax_credit: 804,
    total_advance_ptc: 536,
    net_premium_tax_credit: 268,
  }, {});
  assertEquals(projected?.pdf_applicable_figure, "0.0200");
  assertEquals(projected?.pdf_line9_yes, true);
  assertEquals(projected?.pdf_line10_no, true);
  assertEquals(projected?.pdf_line34_yes, true);
  assertEquals(projected?.pdf_month_1_aptc, "536");
  assertEquals(projected?.pdf_allocation_1_start_month, "01");
  assertEquals(projected?.pdf_allocation_1_premium_pct, "0.67");
  assertEquals(
    mappedField(form8962Pdf, "pdf_allocation_1_premium_pct"),
    "topmostSubform[0].Page2[0].Lines30e-g[0].f2_5[0]",
  );
});

Deno.test("Form 8962 PDF marks line 34 No for a fifth allocation row", () => {
  const projected = form8962Pdf.projectFields?.({
    monthly_ptc_rows: [],
    shared_policy_allocations: Array.from({ length: 5 }, (_, index) => ({
      policy_number: `POLICY-${index + 1}`,
      other_taxpayer_ssn: "222334444",
      start_month: index + 1,
      end_month: index + 1,
      premium_pct: 0.5,
    })),
  }, {});
  assertEquals(projected?.pdf_line34_yes, false);
  assertEquals(projected?.pdf_line34_no, true);
  assertEquals(projected?.pdf_allocation_4_policy_number, "POLICY-4");
  assertEquals(projected?.pdf_allocation_5_policy_number, undefined);
});

Deno.test("Form 8962 PDF maps both Part V groups to the 2025 AcroForm", () => {
  const page2 = "topmostSubform[0].Page2[0]";
  const columns = [
    "family_size",
    "monthly_contribution",
    "start_month",
    "end_month",
  ];
  for (const [role, firstField] of [["primary", 29], ["spouse", 33]] as const) {
    for (const [index, column] of columns.entries()) {
      assertEquals(
        mappedField(form8962Pdf, `pdf_marriage_${role}_${column}`),
        `${page2}.f2_${firstField + index}[0]`,
      );
    }
  }
  const projected = form8962Pdf.projectFields?.({
    monthly_ptc_rows: [],
    alternative_marriage_primary: {
      family_size: 1,
      monthly_contribution: 45,
      start_month: 1,
      end_month: 5,
    },
    alternative_marriage_spouse: {
      family_size: 2,
      monthly_contribution: 67,
      start_month: 2,
      end_month: 5,
    },
  }, {});
  assertEquals(projected?.pdf_line9_yes, true);
  assertEquals(projected?.pdf_line9_no, false);
  assertEquals(projected?.pdf_line10_no, true);
  assertEquals(projected?.pdf_marriage_primary_family_size, "1");
  assertEquals(projected?.pdf_marriage_primary_monthly_contribution, "45");
  assertEquals(projected?.pdf_marriage_primary_start_month, "01");
  assertEquals(projected?.pdf_marriage_primary_end_month, "05");
  assertEquals(projected?.pdf_marriage_spouse_family_size, "2");
  assertEquals(projected?.pdf_marriage_spouse_monthly_contribution, "67");
  assertEquals(projected?.pdf_marriage_spouse_start_month, "02");
  assertEquals(projected?.pdf_marriage_spouse_end_month, "05");
});

Deno.test("Form 8962 PDF keeps absent spouse Part V group blank", () => {
  const projected = form8962Pdf.projectFields?.({
    monthly_ptc_rows: [],
    alternative_marriage_primary: {
      family_size: 1,
      monthly_contribution: 45,
      start_month: 1,
      end_month: 5,
    },
  }, {});
  assertEquals(projected?.pdf_line9_yes, true);
  assertEquals(projected?.pdf_marriage_primary_family_size, "1");
  assertEquals(projected?.pdf_marriage_spouse_family_size, undefined);
});

Deno.test("Form 8962 PDF refuses incomplete Part V or missing monthly calculation", () => {
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        alternative_marriage_primary: {
          family_size: 1,
          monthly_contribution: 45,
          start_month: 1,
          end_month: 5,
        },
      }, {}),
    Error,
    "Part V requires monthly lines 12-23",
  );
  assertThrows(
    () =>
      form8962Pdf.projectFields?.({
        monthly_ptc_rows: [],
        alternative_marriage_primary: {
          family_size: 1,
          monthly_contribution: 45,
          start_month: 1,
        },
      }, {}),
    Error,
    "Part V needs complete line 35/36 facts",
  );
});

Deno.test("Form 8962 marriage calculation reaches printed Part V line 35", () => {
  const result = form8962.compute({ taxYear: 2025, formType: "f1040" }, {
    filing_status: FilingStatus.MFJ,
    household_size: 2,
    taxpayer_modified_agi: 80_000,
    dependent_income_complete: true,
    fpl_region: "contiguous",
    monthly_premiums: Array(12).fill(1_000),
    monthly_slcsps: Array(12).fill(1_200),
    monthly_aptcs: Array(12).fill(1_000),
    alternative_marriage_source_month: 6,
    alternative_marriage: {
      both_unmarried_january_1: true,
      married_december_31: true,
      alternative_family_sizes_verified: true,
      marriage_month: 6,
      primary: {
        family_size: 1,
        policy_numbers: ["PRIMARY-1095A"],
      },
    },
    alternative_marriage_policies: [{
      policy_number: "PRIMARY-1095A",
      owner: "primary",
      coverage_state: "TX",
      monthly_premiums: [...Array(6).fill(1_000), ...Array(6).fill(0)],
      monthly_slcsps: [...Array(6).fill(1_200), ...Array(6).fill(0)],
      monthly_aptcs: [...Array(6).fill(1_000), ...Array(6).fill(0)],
    }],
  });
  const formFields = result.outputs.find((item) => item.nodeType === "form8962")
    ?.fields;
  assert(formFields);
  const projected = form8962Pdf.projectFields?.(formFields, {
    general: { filing_status: FilingStatus.MFJ },
  });
  assertEquals(projected?.pdf_line9_yes, true);
  assertEquals(projected?.pdf_line10_no, true);
  assertEquals(projected?.pdf_marriage_primary_family_size, "1");
  assertEquals(projected?.pdf_marriage_primary_monthly_contribution, "153");
  assertEquals(projected?.pdf_marriage_primary_start_month, "01");
  assertEquals(projected?.pdf_marriage_primary_end_month, "06");
  assertEquals(projected?.pdf_marriage_spouse_family_size, undefined);
  assertThrows(
    () =>
      form8962Pdf.projectFields?.(
        { ...formFields, dependents_modified_agi: 10 },
        { general: { filing_status: FilingStatus.MFJ } },
      ),
    Error,
    "married two-person household cannot include dependent MAGI",
  );
});

Deno.test("Form 8962 PDF leaves an uncovered marriage month blank", () => {
  const projected = form8962Pdf.projectFields?.({
    monthly_ptc_rows: [{
      month_code: "FEBRUARY",
      premium: 0,
      slcsp: 0,
      contribution: 153,
      max_assistance: 0,
      allowed_credit: 0,
      aptc: 0,
    }],
    alternative_marriage_primary: {
      family_size: 1,
      monthly_contribution: 153,
      start_month: 1,
      end_month: 3,
    },
  }, {});
  assertEquals(projected?.pdf_month_2_contribution, undefined);
  assertEquals(projected?.pdf_month_2_premium, undefined);
});
