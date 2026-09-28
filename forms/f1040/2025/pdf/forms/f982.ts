import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  assertForm982AbsentSource,
  projectQpriForm982,
} from "../../form982-qpri.ts";
import { FilingStatus, filingStatusSchema } from "../../../nodes/types.ts";

// IRS Form 982 (March 2018) AcroForm field names. This remains the current
// revision for TY2025; the IRS has not published a 2025-specific Form 982.
// The canonical field tree and page widgets put 1e at c1_5, line 2 at f1_3,
// and line 10b at f1_11. f1_7 is line 7, not line 2.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "checkbox",
    domainKey: "qpri_checkbox",
    pdfField: "topmostSubform[0].Page1[0].c1_5[0]",
  },
  {
    kind: "text",
    domainKey: "line2_excluded_cod",
    pdfField: "topmostSubform[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "line10b_principal_residence_basis_reduction",
    pdfField: "topmostSubform[0].Page1[0].f1_11[0]",
    printZero: true,
  },
];

export const form982Pdf: PdfFormDescriptor = {
  pendingKey: "form982",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f982--2018.pdf",
  fields,
  filerFields: [
    {
      kind: "text",
      domainKey: "nameLine1",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
    },
  ],
  projectFields: (raw, all) => {
    if (Object.keys(raw).length === 0) {
      assertForm982AbsentSource(all);
      return raw;
    }
    const status = filingStatusSchema.parse(all.f1040?.filing_status);
    const qpri = projectQpriForm982(raw, all);
    if ((status === FilingStatus.MFS) !== raw.qpri_mfs) {
      throw new Error(
        "Form 982 QPRI filing-status cap conflicts with Form 1040",
      );
    }
    return qpri;
  },
};
