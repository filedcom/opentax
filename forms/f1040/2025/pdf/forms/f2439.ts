import {
  assertSourcedForm2439,
  itemSchema,
} from "../../../nodes/inputs/f2439/index.ts";
import { TS } from "../../../nodes/types.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// The current IRS Form 2439 is the November 2021 revision. Copy B occupies
// page 3; its AcroForm widgets were read from the official PDF, not inferred
// from the XML sequence. The other copies and instructions are not submitted.
const page = "topmostSubform[0].CopyB[0]";
const text = (domainKey: string, field: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${field}`,
});
const fields: readonly PdfFieldEntry[] = [
  text("calendar_year_suffix", "f1_1[0]"),
  text("period_begin_month_day", "f1_2[0]"),
  text("period_begin_year_suffix", "f1_3[0]"),
  text("period_end_month_day", "f1_4[0]"),
  text("period_end_year_suffix", "f1_5[0]"),
  text("payer_name_address", "LeftCol[0].f1_6[0]"),
  text("payer_ein", "LeftCol[0].f1_7[0]"),
  text("shareholder_ssn", "LeftCol[0].f1_8[0]"),
  text("shareholder_name_address", "LeftCol[0].f1_9[0]"),
  text("box1a", "RightCol[0].f1_10[0]"),
  text("box1b", "RightCol[0].f1_11[0]"),
  text("box1c", "RightCol[0].f1_12[0]"),
  text("box1d", "RightCol[0].f1_13[0]"),
  text("box2", "RightCol[0].f1_14[0]"),
];

function owner(item: Record<string, unknown>, filer: FilerIdentity) {
  const spouse = item.shareholder === TS.S;
  const ssn = spouse ? filer.spouse?.ssn : filer.primarySSN;
  const firstName = spouse ? filer.spouse?.firstName : filer.firstName;
  const middleInitial = spouse
    ? filer.spouse?.middleInitial
    : filer.middleInitial;
  const lastName = spouse ? filer.spouse?.lastName : filer.lastName;
  const name = firstName && lastName
    ? [firstName, middleInitial, lastName].filter(Boolean).join(" ")
    : undefined;
  const normalized = (value: string) =>
    value.trim().toUpperCase().replace(/\s+/g, " ");
  if (
    !ssn || !name || typeof item.shareholder_name !== "string" ||
    normalized(name) !== normalized(item.shareholder_name) ||
    ssn.replace(/\D/g, "").slice(-4) !== item.shareholder_ssn_last4
  ) {
    throw new Error(
      "Form 2439 PDF shareholder does not match payer-issued Copy B",
    );
  }
  if (
    filer.address.foreignCountry || !filer.address.line1 ||
    !filer.address.city || !filer.address.state || !filer.address.zip
  ) {
    throw new Error("Form 2439 PDF needs the shareholder's US address");
  }
  return { ssn, name };
}

export const form2439Pdf: PdfFormDescriptor = {
  pendingKey: "f2439",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f2439--2021.pdf",
  fields,
  pageIndices: () => [2],
  instances(raw, filer, allPending) {
    const items = raw.f2439s;
    if (!Array.isArray(items)) return [];
    const reportable = items.map((raw, index) => {
      const item = itemSchema.parse(raw);
      assertSourcedForm2439(item, index);
      return item;
    }).filter((item) => (item.box1a ?? 0) > 0);
    if (reportable.length === 0) return [];
    if (!filer) throw new Error("Form 2439 PDF needs filer identity");
    const total = reportable.reduce((sum, item) => sum + (item.box2 ?? 0), 0);
    if (total > 0) {
      if (allPending?.schedule3?.line13a_total !== total) {
        throw new Error(
          "Form 2439 PDF box 2 must reconcile to Schedule 3 line 13a",
        );
      }
      if (
        allPending?.f1040?.line31_additional_payments !==
          allPending?.schedule3?.line15_total
      ) {
        throw new Error(
          "Form 2439 PDF Schedule 3 line 15 must reconcile to Form 1040 line 31",
        );
      }
    }
    return reportable.map((item) => {
      const shareholder = owner(item, filer);
      const calendarYear = item.tax_period_begin === "2025-01-01" &&
        item.tax_period_end === "2025-12-31";
      return {
        calendar_year_suffix: calendarYear ? "25" : undefined,
        period_begin_month_day: calendarYear
          ? undefined
          : item.tax_period_begin?.slice(5).replace("-", "/"),
        period_begin_year_suffix: calendarYear
          ? undefined
          : item.tax_period_begin?.slice(2, 4),
        period_end_month_day: calendarYear
          ? undefined
          : item.tax_period_end?.slice(5).replace("-", "/"),
        period_end_year_suffix: calendarYear
          ? undefined
          : item.tax_period_end?.slice(2, 4),
        payer_name_address: [
          item.payer_name,
          item.payer_address_line1,
          item.payer_address_line2,
          `${item.payer_address_city}, ${item.payer_address_state} ${item.payer_address_zip}`,
        ].filter(Boolean).join("\n"),
        payer_ein: item.payer_ein,
        shareholder_ssn: shareholder.ssn,
        shareholder_name_address: [
          shareholder.name,
          filer.address.line1,
          filer.address.line2,
          `${filer.address.city}, ${filer.address.state} ${filer.address.zip}`,
        ].filter(Boolean).join("\n"),
        box1a: item.box1a,
        box1b: item.box1b,
        box1d: item.box1d,
        box2: item.box2,
      };
    });
  },
};
