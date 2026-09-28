import { z } from "zod";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  reconcileCode2Form8889,
  reconcilePairedForm8889,
  reconcileSpouseOnlyForm8889,
} from "../../form8889_spouse_reconciliation.ts";

// IRS Form 8889 (2025) AcroForm field names.
// Verified against the f8889--2025.pdf AcroForm field dump (single page,
// strictly in reading order):
//   f1_1 = name, f1_2 = SSN
//   c1_1[0] = line 1 Self-only (/1), c1_1[1] = line 1 Family (/2)
//   f1_3–f1_14 = Part I lines 2–13
//   f1_15–f1_19 = Part II lines 14a–16, c1_2 = 17a exception box, f1_20 = 17b
//   f1_21–f1_24 = Part III lines 18–21
//
// print_* keys are the same computed 2025 form lines consumed by MeF. Lines 2
// and 13 print an explicit "0" when only employer funding exists.

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "beneficiary_name",
    pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
  },
  {
    kind: "text",
    domainKey: "beneficiary_ssn",
    pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
  },
  // ── Line 1: HDHP coverage type ──────────────────────────────────────────────
  {
    kind: "checkboxWhen",
    domainKey: "print_line1_coverage",
    pdfField: "topmostSubform[0].Page1[0].c1_1[0]",
    whenValue: "self_only",
  },
  {
    kind: "checkboxWhen",
    domainKey: "print_line1_coverage",
    pdfField: "topmostSubform[0].Page1[0].c1_1[1]",
    whenValue: "family",
  },

  // ── Part I: Contributions and deduction ─────────────────────────────────────
  {
    kind: "text",
    domainKey: "print_line2_taxpayer_contributions",
    pdfField: "topmostSubform[0].Page1[0].f1_3[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "print_line3_limit",
    pdfField: "topmostSubform[0].Page1[0].f1_4[0]",
  },
  {
    kind: "text",
    domainKey: "print_line4_archer",
    pdfField: "topmostSubform[0].Page1[0].f1_5[0]",
  },
  {
    kind: "text",
    domainKey: "print_line5",
    pdfField: "topmostSubform[0].Page1[0].f1_6[0]",
  },
  {
    kind: "text",
    domainKey: "print_line6",
    pdfField: "topmostSubform[0].Page1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "print_line7_catchup",
    pdfField: "topmostSubform[0].Page1[0].f1_8[0]",
  },
  {
    kind: "text",
    domainKey: "print_line8",
    pdfField: "topmostSubform[0].Page1[0].f1_9[0]",
  },
  {
    kind: "text",
    domainKey: "print_line9_employer",
    pdfField: "topmostSubform[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "print_line10",
    pdfField: "topmostSubform[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "print_line11",
    pdfField: "topmostSubform[0].Page1[0].f1_12[0]",
  },
  {
    kind: "text",
    domainKey: "print_line12",
    pdfField: "topmostSubform[0].Page1[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "print_line13_deduction",
    pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
    printZero: true,
  },

  // ── Part II: Distributions ──────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "print_line14a_distributions",
    pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "print_line14b_excluded_distributions",
    pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "print_line14c",
    pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "print_line15_qualified",
    pdfField: "topmostSubform[0].Page1[0].f1_18[0]",
  },
  {
    kind: "text",
    domainKey: "print_line16_taxable",
    pdfField: "topmostSubform[0].Page1[0].f1_19[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_line17a_exception",
    pdfField: "topmostSubform[0].Page1[0].c1_2[0]",
  },
  {
    kind: "text",
    domainKey: "print_line17b_penalty",
    pdfField: "topmostSubform[0].Page1[0].f1_20[0]",
  },

  // ── Part III: Failure to maintain HDHP coverage ────────────────────────────
  {
    kind: "text",
    domainKey: "print_line18",
    pdfField: "topmostSubform[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "print_line19",
    pdfField: "topmostSubform[0].Page1[0].f1_22[0]",
  },
  {
    kind: "text",
    domainKey: "print_line20",
    pdfField: "topmostSubform[0].Page1[0].f1_23[0]",
  },
  {
    kind: "text",
    domainKey: "print_line21",
    pdfField: "topmostSubform[0].Page1[0].f1_24[0]",
  },
];

export const form8889Pdf: PdfFormDescriptor = {
  pendingKey: "form8889",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8889--2025.pdf",
  instances(pending, filer, allPending) {
    if (pending.forms === undefined) {
      if (Object.keys(pending).length > 0) {
        throw new Error("Form 8889 PDF needs owner-labeled computed forms");
      }
      return [];
    }
    const forms = z.array(
      z.object({
        owner: z.enum(["primary", "spouse"]),
        beneficiary_name: z.string().trim().min(1),
        beneficiary_ssn: z.string().regex(/^\d{9}$/),
      }).passthrough(),
    ).min(1).max(2).parse(pending.forms);
    if (
      (forms.length === 2 &&
        (forms[0]?.owner !== "primary" || forms[1]?.owner !== "spouse"))
    ) {
      throw new Error(
        "Form 8889 PDF needs one identified owner or taxpayer-then-spouse forms",
      );
    }
    const supportedKeys = new Set([
      "owner",
      ...fields.map((entry) => entry.domainKey),
    ]);
    for (const form of forms) {
      const unsupported = Object.keys(form).filter((key) =>
        !supportedKeys.has(key)
      );
      if (unsupported.length > 0) {
        throw new Error(
          `Form 8889 PDF does not accept uncomputed owner fields: ${
            unsupported.join(", ")
          }`,
        );
      }
    }
    reconcileSpouseOnlyForm8889(forms, allPending, filer);
    reconcileCode2Form8889(forms, allPending, filer);
    reconcilePairedForm8889(forms, allPending, filer);
    return forms;
  },
  fields,
};
