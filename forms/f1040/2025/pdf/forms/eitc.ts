import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { rgb, StandardFonts } from "pdf-lib";
import { qualifyingChildDetailSchema } from "../../../nodes/intermediate/forms/eitc/index.ts";
import { scheduleEicLine6Months } from "../../eic-birth-residency.ts";

// The 2025 Schedule EIC filing page has child columns, not income summaries.
// AcroForm fields 24-26 are each child's line 6 months lived in the U.S.
const PAGE = "topmostSubform[0].Page1[0]";

function text(domainKey: string, path: string): PdfFieldEntry {
  return { kind: "text", domainKey, pdfField: `${PAGE}.${path}` };
}

function answer(
  domainKey: string,
  yesPath: string,
  noPath: string,
): PdfFieldEntry[] {
  return [
    {
      kind: "checkboxWhen",
      domainKey,
      pdfField: `${PAGE}.${yesPath}`,
      whenValue: "true",
    },
    {
      kind: "checkboxWhen",
      domainKey,
      pdfField: `${PAGE}.${noPath}`,
      whenValue: "false",
    },
  ];
}

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...[1, 2, 3].flatMap((child, index) => {
    const yearBase = 9 + index * 4;
    const relationship = 21 + index;
    const months = 24 + index;
    const yearPath = child < 3 ? `Year${child}_ReadOrder[0].` : "";
    return [
      text(`child${child}_name`, `f1_0${3 + index}[0]`),
      text(`child${child}_ssn`, `f1_0${6 + index}[0]`),
      ...[0, 1, 2, 3].map((digit) =>
        text(
          `child${child}_birth_year_digit${digit + 1}`,
          `${yearPath}f1_${String(yearBase + digit).padStart(2, "0")}[0]`,
        )
      ),
      ...answer(
        `child${child}_student`,
        child < 3
          ? `Line4a_Child${child}_ReadOrder[0].Yes_ReadOrder[0].c1_${child}[0]`
          : `Line4a_Child3_Yes_ReadOrder[0].c1_3[0]`,
        child < 3
          ? `Line4a_Child${child}_ReadOrder[0].c1_${child}[0]`
          : "c1_3[0]",
      ),
      ...answer(
        `child${child}_disabled`,
        child < 3
          ? `Line4b_Child${child}_ReadOrder[0].Yes_ReadOrder[0].c1_${
            child + 3
          }[0]`
          : `Line4b_Child3_Yes_ReadOrder[0].c1_6[0]`,
        child < 3
          ? `Line4b_Child${child}_ReadOrder[0].c1_${child + 3}[0]`
          : "c1_6[0]",
      ),
      text(`child${child}_relationship`, `f1_${relationship}[0]`),
      text(
        `child${child}_us_months`,
        child < 3
          ? `Line6_Child${child}_ReadOrder[0].f1_${months}[0]`
          : `f1_${months}[0]`,
      ),
    ];
  }),
];

export const eitcPdf: PdfFormDescriptor = {
  pendingKey: "eitc",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sei--2025.pdf",
  pageIndices: () => [0],
  filerFields: [
    text("nameShownOnForm1040", "f1_01[0]"),
    text("primarySSN", "f1_02[0]"),
  ],
  projectFields(source) {
    const count = source.qualifying_children;
    if (count === undefined || count === 0) return source;
    if (
      typeof count !== "number" || !Number.isInteger(count) || count < 0 ||
      count > 3
    ) {
      throw new Error("Schedule EIC PDF needs one through three child rows");
    }
    const children = qualifyingChildDetailSchema.array().max(3).parse(
      source.qualifying_child_details ?? [],
    );
    if (children.length !== count) {
      throw new Error(
        "Schedule EIC PDF child count does not match qualifying-child details",
      );
    }
    const projected: Record<string, unknown> = { ...source };
    const seenSsns = new Set<string>();
    children.forEach((child, index) => {
      const n = index + 1;
      const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(child.dob);
      const date = parts
        ? new Date(Date.UTC(
          Number(parts[1]),
          Number(parts[2]) - 1,
          Number(parts[3]),
        ))
        : undefined;
      if (!date || date.toISOString().slice(0, 10) !== child.dob) {
        throw new Error(`Schedule EIC child ${n} needs a valid birth date`);
      }
      if (
        !child.first_name.trim() || !child.last_name.trim() ||
        !child.irs_relationship_code ||
        !/^\d{3}-?\d{2}-?\d{4}$/.test(child.ssn) ||
        !child.name_control || !/^[A-Z][A-Z\- ]{0,3}$/.test(child.name_control)
      ) {
        throw new Error(
          `Schedule EIC child ${n} needs name, SSN, relationship, and qualifying residency`,
        );
      }
      const normalizedSsn = child.ssn.replaceAll("-", "");
      if (seenSsns.has(normalizedSsn)) {
        throw new Error(`Schedule EIC child ${n} needs a unique SSN`);
      }
      seenSsns.add(normalizedSsn);
      const line6Months = scheduleEicLine6Months(child);
      const year = child.dob.slice(0, 4);
      if (Number(year) <= 2006) {
        if (child.full_time_student === undefined) {
          throw new Error(
            `Schedule EIC child ${n} needs a line 4a student answer`,
          );
        }
        projected[`child${n}_student`] = child.full_time_student;
        if (child.full_time_student === false) {
          if (child.disabled === undefined) {
            throw new Error(
              `Schedule EIC child ${n} needs a line 4b disability answer`,
            );
          }
          projected[`child${n}_disabled`] = child.disabled;
        }
      }
      projected[`child${n}_name`] = `${child.first_name} ${child.last_name}`;
      projected[`child${n}_first_name`] = child.first_name;
      projected[`child${n}_last_name`] = child.last_name;
      projected[`child${n}_ssn`] = normalizedSsn;
      projected[`child${n}_relationship`] = child.irs_relationship_code;
      projected[`child${n}_us_months`] = line6Months;
      for (let digit = 0; digit < 4; digit++) {
        projected[`child${n}_birth_year_digit${digit + 1}`] = year[digit];
      }
    });
    return projected;
  },
  async decoratePages(document, pages, fields) {
    const page = pages[0];
    if (!page) return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    for (let index = 0; index < 3; index++) {
      const first = fields[`child${index + 1}_first_name`];
      const last = fields[`child${index + 1}_last_name`];
      if (typeof first !== "string" || typeof last !== "string") continue;
      const left = 209.8 + index * 122.4;
      const textSize = (value: string) => {
        const width = font.widthOfTextAtSize(value, 9);
        const size = Math.min(9, 54 * 9 / Math.max(width, 1));
        if (size < 6) {
          throw new Error(
            "Schedule EIC PDF child name exceeds its printed box",
          );
        }
        return size;
      };
      // The IRS AcroForm has one full-name field per child column. Print
      // separate names in the two halves shown on the paper form.
      page.drawRectangle({
        x: left + 0.3,
        y: 468.2,
        width: 119.9,
        height: 11.4,
        color: rgb(1, 1, 1),
      });
      page.drawText(first, {
        x: left + 2,
        y: 470,
        size: textSize(first),
        font,
        color: rgb(0, 0, 0.55),
      });
      page.drawText(last, {
        x: left + 62,
        y: 470,
        size: textSize(last),
        font,
        color: rgb(0, 0, 0.55),
      });
    }
  },
  fields,
  includeWhen: (source, all) =>
    typeof source.qualifying_children === "number" &&
    source.qualifying_children > 0 &&
    typeof all?.f1040?.line27_eitc === "number" &&
    all.f1040.line27_eitc > 0,
};
