import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import { reconciledForm8908Source } from "../../../../mef/forms/credits/business/f8908_source_reconciliation.ts";

// Official December 2025 fillable three-page PDF field paths, inspected from
// its AcroForm. This projection is staged and intentionally unregistered.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const page3 = "topmostSubform[0].Page3[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});

const partIFields: readonly PdfFieldEntry[] = [
  text("itemD", `${page1}.f1_03[0]`),
  text("itemE", `${page1}.f1_04[0]`),
  ...Array.from({ length: 5 }, (_, index) => [
    text(
      `line${index + 1}a`,
      `${page1}.f1_${String(5 + index * 2).padStart(2, "0")}[0]`,
    ),
    text(
      `line${index + 1}b`,
      `${page1}.f1_${String(6 + index * 2).padStart(2, "0")}[0]`,
    ),
  ]).flat(),
  text("line6a", `${page2}.f2_01[0]`),
  text("line6b", `${page2}.f2_02[0]`),
  text("line8", `${page2}.f2_04[0]`),
];

const certifierFields: readonly PdfFieldEntry[] = Array.from(
  { length: 38 },
  (_, index) => {
    const row = index + 1;
    const base = 5 + index * 5;
    return [
      text(
        `certifier_${row}_name`,
        `${page2}.Table_PartII[0].Row${row}[0].f2_${
          String(base).padStart(2, "0")
        }[0]`,
      ),
      text(
        `certifier_${row}_state`,
        `${page2}.Table_PartII[0].Row${row}[0].f2_${
          String(base + 1).padStart(2, "0")
        }[0]`,
      ),
      text(
        `certifier_${row}_homes`,
        `${page2}.Table_PartII[0].Row${row}[0].f2_${
          String(base + 2).padStart(2, "0")
        }[0]`,
      ),
      text(
        `certifier_${row}_modified`,
        `${page2}.Table_PartII[0].Row${row}[0].f2_${
          String(base + 3).padStart(2, "0")
        }[0]`,
      ),
    ];
  },
).flat();

const addressFields: readonly PdfFieldEntry[] = Array.from(
  { length: 20 },
  (_, index) => {
    const row = index + 1;
    const base = 1 + index * 4;
    return [
      text(
        `home_${row}_street`,
        `${page3}.Table_PartIII[0].Row${row}[0].f3_${
          String(base).padStart(2, "0")
        }[0]`,
      ),
      text(
        `home_${row}_city`,
        `${page3}.Table_PartIII[0].Row${row}[0].f3_${
          String(base + 1).padStart(2, "0")
        }[0]`,
      ),
      text(
        `home_${row}_state`,
        `${page3}.Table_PartIII[0].Row${row}[0].f3_${
          String(base + 2).padStart(2, "0")
        }[0]`,
      ),
      text(
        `home_${row}_zip`,
        `${page3}.Table_PartIII[0].Row${row}[0].f3_${
          String(base + 3).padStart(2, "0")
        }[0]`,
      ),
    ];
  },
).flat();

export const form8908Pdf: PdfFormDescriptor = {
  pendingKey: "f8908",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8908--2025.pdf",
  pageIndices: () => [0, 1, 2],
  fields: [
    { kind: "checkbox", domainKey: "itemA", pdfField: `${page1}.c1_01[0]` },
    { kind: "checkbox", domainKey: "itemB", pdfField: `${page1}.c1_02[0]` },
    { kind: "checkbox", domainKey: "itemC", pdfField: `${page1}.c1_03[0]` },
    ...partIFields,
    ...certifierFields,
    ...addressFields,
  ],
  filerFields: [
    text("nameLine1", `${page1}.f1_01[0]`),
    text("primarySSN", `${page1}.f1_02[0]`),
  ],
  projectFields(raw, allPending) {
    if (JSON.stringify(raw) !== JSON.stringify(allPending.f8908)) {
      throw new Error("Form 8908 PDF source differs from filed return");
    }
    const { lines } = reconciledForm8908Source(raw, allPending.f3800);
    const fields: Record<string, unknown> = {
      itemA: true,
      itemB: true,
      itemC: true,
      itemD: lines.itemD_distinct_certifiers,
      itemE: lines.itemE_certifications,
      line8: lines.line8,
    };
    lines.counts.forEach((count, index) => {
      fields[`line${index + 1}a`] = count;
      fields[`line${index + 1}b`] = lines.credits[index];
    });
    lines.certifiers.forEach((certifier, index) => {
      const row = index + 1;
      fields[`certifier_${row}_name`] = certifier.name;
      fields[`certifier_${row}_state`] = certifier.state;
      fields[`certifier_${row}_homes`] = certifier.homes_certified;
      fields[`certifier_${row}_modified`] = certifier.modified_certifications;
    });
    lines.first20HomeAddresses.forEach((home, index) => {
      const row = index + 1;
      fields[`home_${row}_street`] = home.unit
        ? `${home.street}, ${home.unit}`
        : home.street;
      fields[`home_${row}_city`] = home.city;
      fields[`home_${row}_state`] = home.state;
      fields[`home_${row}_zip`] = home.zip;
    });
    return fields;
  },
};
