import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { form8606 } from "../../mef/forms/f8606.ts";
import { printSchema } from "../../../nodes/intermediate/forms/form8606/index.ts";
import { reconcileForm8606Distribution } from "../../form8606_distribution_reconciliation.ts";
import { reconcileForm8606Roth } from "../../form8606_roth_reconciliation.ts";

// IRS Form 8606 (2025) AcroForm field names.
// Verified against the f8606--2025.pdf AcroForm field dump.
//
// Page 1:
//   f1_01 = name, f1_02 = SSN
//   f1_03–f1_08 = "fill in your address only if filing by itself" block (skip)
//   Part I: f1_09 = line 1, f1_10 = line 2, f1_11 = line 3, f1_12 = line 4,
//   f1_13 = line 5, f1_14 = line 6, f1_15 = line 7, f1_16 = line 8,
//   f1_17 = line 9, f1_18/f1_19 = line 10 (split decimal), f1_20 = line 11,
//   f1_21 = line 12, f1_22 = line 13, f1_23 = line 14
// Page 2:
//   f2_01 = line 15a, f2_02 = line 15b, f2_03 = line 15c
//   Part II: f2_04 = line 16, f2_05 = line 17, f2_06 = line 18
//   Part III: f2_07+ = lines 19–25 (Roth distributions — not printed; the
//   engine's simplified Part III model omits the 5-year/ordering detail the
//   printed lines require)
//
// print_* keys are self-emitted by the form8606 node. Line 2 prints an
// explicit "0" — declared prior basis is meaningful even when zero.

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "print_owner_name",
    pdfField: "topmostSubform[0].Page1[0].f1_01[0]",
  },
  {
    kind: "text",
    domainKey: "print_owner_ssn",
    pdfField: "topmostSubform[0].Page1[0].f1_02[0]",
  },
  // ── Part I: Nondeductible contributions and basis ───────────────────────────
  {
    kind: "text",
    domainKey: "print_line1_nondeductible",
    pdfField: "topmostSubform[0].Page1[0].f1_09[0]",
  },
  {
    kind: "text",
    domainKey: "print_line2_prior_basis",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_line3_total_basis",
    pdfField: "topmostSubform[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "print_line4_post_year_contributions",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_line5_current_basis",
    pdfField: "topmostSubform[0].Page1[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "print_line6_year_end_value",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
  },
  {
    kind: "text",
    domainKey: "print_line7_distributions",
    pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "print_line8_conversions",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_line9_combined_value",
    pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "print_line10_ratio_whole",
    pdfField: "topmostSubform[0].Page1[0].f1_18[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_line10_ratio_fraction",
    pdfField: "topmostSubform[0].Page1[0].f1_19[0]",
  },
  {
    kind: "text",
    domainKey: "print_line11_nontaxable_conversion",
    pdfField: "topmostSubform[0].Page1[0].f1_20[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_line12_nontaxable_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "print_line13_nontaxable",
    pdfField: "topmostSubform[0].Page1[0].f1_22[0]",
  },
  {
    kind: "text",
    domainKey: "print_line14_remaining_basis",
    pdfField: "topmostSubform[0].Page1[0].f1_23[0]",
  },
  {
    kind: "text",
    domainKey: "print_line15a_not_converted",
    pdfField: "topmostSubform[0].Page2[0].f2_01[0]",
  },
  {
    kind: "text",
    domainKey: "print_line15b_disaster",
    pdfField: "topmostSubform[0].Page2[0].f2_02[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_line15c_taxable",
    pdfField: "topmostSubform[0].Page2[0].f2_03[0]",
  },

  // ── Part II: Roth conversions ───────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "print_line16_converted",
    pdfField: "topmostSubform[0].Page2[0].f2_04[0]",
  },
  {
    kind: "text",
    domainKey: "print_line18_taxable_conversion",
    pdfField: "topmostSubform[0].Page2[0].f2_06[0]",
  },
  {
    kind: "text",
    domainKey: "print_roth_line19_distributions",
    pdfField: "topmostSubform[0].Page2[0].f2_07[0]",
  },
  {
    kind: "text",
    domainKey: "print_roth_line20_homebuyer",
    pdfField: "topmostSubform[0].Page2[0].f2_08[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_roth_line21_after_homebuyer",
    pdfField: "topmostSubform[0].Page2[0].f2_09[0]",
  },
  {
    kind: "text",
    domainKey: "print_roth_line22_contribution_basis",
    pdfField: "topmostSubform[0].Page2[0].f2_10[0]",
  },
  {
    kind: "text",
    domainKey: "print_roth_line23_after_contribution_basis",
    pdfField: "topmostSubform[0].Page2[0].f2_11[0]",
  },
  {
    kind: "text",
    domainKey: "print_roth_line24_conversion_basis",
    pdfField: "topmostSubform[0].Page2[0].f2_12[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_roth_line25a_earnings",
    pdfField: "topmostSubform[0].Page2[0].f2_13[0]",
  },
  {
    kind: "text",
    domainKey: "print_roth_line25b_disaster",
    pdfField: "topmostSubform[0].Page2[0].f2_14[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_roth_line25c_taxable",
    pdfField: "topmostSubform[0].Page2[0].f2_15[0]",
  },
];

export const form8606Pdf: PdfFormDescriptor = {
  pendingKey: "form8606",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8606--2025.pdf",
  projectFields(raw) {
    if (Object.keys(raw).length === 0) return raw;
    const parsed = printSchema.parse(raw);
    if (!parsed.distribution_evidence) return raw;
    const ratio = parsed.print_line10_basis_ratio!;
    const ratioThousandths = Math.round(ratio * 1_000);
    return {
      ...raw,
      print_line10_ratio_whole: Math.floor(ratioThousandths / 1_000),
      print_line10_ratio_fraction: String(ratioThousandths % 1_000).padStart(
        3,
        "0",
      ),
    };
  },
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    if (!filer || !allPending) {
      throw new Error("Form 8606 PDF needs final filer and source graph");
    }
    form8606.build(raw as Parameters<typeof form8606.build>[0], {
      filer,
      pending: allPending,
    });
    const roth = reconcileForm8606Roth(raw, allPending, filer);
    if (roth) {
      return [{
        ...raw,
        print_line1_nondeductible: undefined,
        print_line2_prior_basis: undefined,
        print_line3_total_basis: undefined,
        print_line14_remaining_basis: undefined,
        print_owner_name: roth.ownerName,
        print_owner_ssn: roth.ownerSsn,
      }];
    }
    const reviewed = reconcileForm8606Distribution(raw, allPending, filer);
    return [{
      ...raw,
      print_owner_name: reviewed?.ownerName ?? filer.fullName,
      print_owner_ssn: reviewed?.ownerSsn ?? filer.primarySSN,
    }];
  },
  fields,
};
