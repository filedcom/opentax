import {
  calculateOwnerForms,
  inputSchema,
  reconcileHsaOwnerForms,
} from "../../../nodes/intermediate/forms/form5329/index.ts";
import { TS } from "../../../nodes/types.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 5329 (2025) AcroForm field names.
// Multi-part form (Parts I–X). Each part has an "amount" field as the first
// numeric entry. The first two fields are the individual owner name and SSN.
// Part I   — early distribution (IRA/qualified plan): line 1.
// Part I   — SIMPLE IRA early distribution: line 1 (separate).
// Part III — ESA/ABLE distribution: line 17.
// Part III — excess traditional IRA contributions: line 18.
// Part III — traditional IRA FMV: line 21.
// Part IV  — excess Roth IRA: line 22.
// Part IV  — Roth IRA FMV: line 25.
// Part V   — excess Coverdell ESA: line 26.
// Part V   — Coverdell ESA FMV: line 29.
// Part VI  — excess Archer MSA: line 30.
// Part VI  — Archer MSA FMV: line 33.
// Part VII — HSA excess-contribution worksheet lines 42-49.
// Part IX  — excess ABLE: line 42.
// Part IX  — ABLE FMV: line 45.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "owner_name",
    pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
  },
  {
    kind: "text",
    domainKey: "owner_ssn",
    pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
  },
  {
    kind: "text",
    domainKey: "early_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "simple_ira_early_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "esa_able_distribution",
    pdfField: "topmostSubform[0].Page1[0].f1_29[0]",
  },
  {
    kind: "text",
    domainKey: "excess_traditional_ira",
    pdfField: "topmostSubform[0].Page1[0].f1_30[0]",
  },
  {
    kind: "text",
    domainKey: "traditional_ira_value",
    pdfField: "topmostSubform[0].Page1[0].f1_33[0]",
  },
  {
    kind: "text",
    domainKey: "excess_roth_ira",
    pdfField: "topmostSubform[0].Page2[0].f2_1[0]",
  },
  {
    kind: "text",
    domainKey: "roth_ira_value",
    pdfField: "topmostSubform[0].Page2[0].f2_4[0]",
  },
  {
    kind: "text",
    domainKey: "excess_coverdell_esa",
    pdfField: "topmostSubform[0].Page2[0].f2_5[0]",
  },
  {
    kind: "text",
    domainKey: "coverdell_esa_value",
    pdfField: "topmostSubform[0].Page2[0].f2_8[0]",
  },
  {
    kind: "text",
    domainKey: "excess_archer_msa",
    pdfField: "topmostSubform[0].Page2[0].f2_9[0]",
  },
  {
    kind: "text",
    domainKey: "archer_msa_value",
    pdfField: "topmostSubform[0].Page2[0].f2_12[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line42",
    pdfField: "topmostSubform[0].Page2[0].f2_13[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line43",
    pdfField: "topmostSubform[0].Page2[0].f2_14[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line44",
    pdfField: "topmostSubform[0].Page2[0].f2_15[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line45",
    pdfField: "topmostSubform[0].Page2[0].f2_16[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line46",
    pdfField: "topmostSubform[0].Page2[0].f2_17[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line47",
    pdfField: "topmostSubform[0].Page2[0].f2_18[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line48",
    pdfField: "topmostSubform[0].Page2[0].f2_19[0]",
  },
  {
    kind: "text",
    domainKey: "print_hsa_line49",
    pdfField: "topmostSubform[0].Page2[0].f2_20[0]",
  },
  {
    kind: "text",
    domainKey: "excess_able",
    pdfField: "topmostSubform[0].Page2[0].f2_21[0]",
  },
  {
    kind: "text",
    domainKey: "able_value",
    pdfField: "topmostSubform[0].Page2[0].f2_24[0]",
  },
];

export const form5329Pdf: PdfFormDescriptor = {
  pendingKey: "form5329",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5329--2025.pdf",
  instances(pending, filer, allPending) {
    const unexpected = Object.keys(pending).filter((key) =>
      key !== "owner_entries" && key !== "owner_forms"
    );
    if (unexpected.length > 0) {
      throw new Error(`Form 5329 PDF requires owner entries: ${unexpected.join(", ")}`);
    }
    const parsed = inputSchema.parse({ owner_entries: pending.owner_entries });
    const calculated = calculateOwnerForms(parsed);
    if (calculated.forms.length === 0) {
      if (pending.owner_forms !== undefined) {
        throw new Error("Form 5329 PDF has forms without owner sources");
      }
      return [];
    }
    if (JSON.stringify(pending.owner_forms) !== JSON.stringify(calculated.forms)) {
      throw new Error("Form 5329 PDF owner forms do not match source calculation");
    }
    reconcileHsaOwnerForms(calculated.forms, allPending?.form8889);
    if (
      calculated.total > 0 &&
      allPending?.schedule2?.line8_form5329_tax !== calculated.total
    ) {
      throw new Error("Form 5329 PDF owner taxes do not reconcile to Schedule 2 line 8");
    }
    return calculated.forms.map((form) => {
      const name = form.owner === TS.S
        ? filer?.spouse && `${filer.spouse.firstName} ${filer.spouse.lastName}`
        : filer?.fullName;
      const ssn = form.owner === TS.S
        ? filer?.spouse?.ssn
        : filer?.primarySSN;
      if (!name || !ssn) {
        throw new Error("Form 5329 PDF needs each owner's name and SSN");
      }
      return {
        ...form,
        owner_name: name,
        owner_ssn: ssn.replaceAll("-", ""),
      };
    });
  },
  fields,
};
