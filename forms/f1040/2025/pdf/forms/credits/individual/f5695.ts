import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import {
  computeForm5695PartIAmounts,
  computeForm5695PartIIAmounts,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/credits/individual/form5695/index.ts";

const page = (number: number) => "topmostSubform[0].Page" + number + "[0].";
const text = (
  key: string,
  pageNumber: number,
  fieldNumber: number,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: page(pageNumber) + "f" + pageNumber + "_" +
    String(fieldNumber).padStart(2, "0") + "[0]",
  printZero,
});
const answer = (
  key: string,
  pageNumber: number,
  number: number,
): PdfFieldEntry[] =>
  [true, false].map((value, index) => ({
    kind: "checkboxWhen",
    domainKey: key,
    pdfField: page(pageNumber) + "c" + pageNumber + "_" + number +
      "[" + index + "]",
    whenValue: String(value),
  }));

const fields: PdfFieldEntry[] = [
  ...answer("main_home_in_us", 2, 1),
  ...answer("original_user", 2, 2),
  ...answer("five_year_use", 2, 3),
  text("section_a_street", 2, 3),
  text("section_a_unit", 2, 4),
  text("section_a_city", 2, 5),
  text("section_a_state", 2, 6),
  text("section_a_zip", 2, 7),
  ...answer("related_to_new_home", 2, 4),
  text("door_cost", 2, 10),
  {
    ...text("door_qmid_first", 2, 11),
    pdfField: page(2) + "Ln19b[0].Box1-4[0].f2_11[0]",
  },
  {
    ...text("door_qmid_rest", 2, 12),
    pdfField: page(2) + "Ln19b[0].Box5-17[0].f2_12[0]",
  },
  text("door_credit", 2, 13),
  text("other_doors_cost", 2, 21, true),
  text("other_doors_total", 2, 22, true),
  text("other_doors_credit", 2, 23, true),
  text("total_door_credit", 2, 24),
  ...answer("home_in_us", 3, 1),
  ...answer("originally_placed_in_service", 3, 2),
  ...[0, 1, 2, 3, 4].map((index) => ({
    ...text(
      [
        "section_b_street",
        "section_b_unit",
        "section_b_city",
        "section_b_state",
        "section_b_zip",
      ][index],
      3,
      index + 1,
    ),
    pdfField: page(3) + "Table_Line21c[0].Row1[0].f3_" +
      String(index + 1).padStart(2, "0") + "[0]",
  })),
  text("ac_cost", 3, 21),
  {
    ...text("ac_qmid_first", 3, 22),
    pdfField: page(3) + "Ln_22a[0].Box1-4[0].f3_22[0]",
  },
  {
    ...text("ac_qmid_rest", 3, 23),
    pdfField: page(3) + "Ln_22a[0].Box5-17[0].f3_23[0]",
  },
  text("other_ac_cost", 3, 24, true),
  text("total_ac_cost", 3, 25),
  text("ac_credit", 3, 26),
  ...answer("panelboard_installed", 3, 4),
  ...answer("energy_audit", 4, 1),
  text("line27", 4, 3),
  text("line28", 4, 4),
  text("line30", 4, 19),
  text("line31", 4, 20),
  text("line32", 4, 21),
];

function address(
  output: Record<string, unknown>,
  prefix: string,
  value: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  },
) {
  output[prefix + "_street"] = value.line1;
  output[prefix + "_unit"] = value.line2;
  output[prefix + "_city"] = value.city;
  output[prefix + "_state"] = value.state;
  output[prefix + "_zip"] = value.zip;
}

function onlyKeys(value: object, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

/** One sourced Section A door and one Section B central air conditioner. */
export const form5695Pdf: PdfFormDescriptor = {
  pendingKey: "form5695",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5695--2025.pdf",
  pageIndices: () => [1, 2, 3],
  fields,
  filerFields: [
    text("nameLine1", 2, 1),
    text("primarySSN", 2, 2),
  ],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const source = inputSchema.parse(raw);
    const retained = inputSchema.parse(allPending.f5695);
    if (JSON.stringify(source) !== JSON.stringify(retained)) {
      throw new Error("Form 5695 PDF differs from retained source");
    }
    const sectionA = source.part_ii_section_a;
    const sectionB = source.part_ii_section_b;
    if (
      !sectionA || !sectionB ||
      !onlyKeys(source, [
        "part_ii_tax_limit",
        "part_ii_section_a",
        "part_ii_section_b",
      ]) ||
      !onlyKeys(sectionA, [
        "main_home_in_us",
        "original_user",
        "five_year_use",
        "home_address",
        "related_to_new_home",
        "exterior_doors",
      ]) ||
      !onlyKeys(sectionB, [
        "home_in_us",
        "originally_placed_in_service",
        "home_addresses",
        "central_air_conditioner",
      ]) ||
      sectionA.exterior_doors?.length !== 1 ||
      sectionB.home_addresses.length !== 1 ||
      !sectionB.central_air_conditioner ||
      sectionA.exterior_doors[0].qmid.length > 17 ||
      sectionB.central_air_conditioner.qmid.length > 17
    ) {
      throw new Error(
        "Form 5695 PDF needs the mapped door and central-air source route",
      );
    }
    const partI = computeForm5695PartIAmounts(source);
    const partII = computeForm5695PartIIAmounts(source);
    if (
      partI.available !== 0 || partII.allowed <= 0 ||
      partII.allowed !== allPending.schedule3?.line5b_energy_efficient_home
    ) {
      throw new Error("Form 5695 PDF credit differs from Schedule 3");
    }
    const door = sectionA.exterior_doors[0];
    const ac = sectionB.central_air_conditioner;
    const output: Record<string, unknown> = {
      main_home_in_us: sectionA.main_home_in_us,
      original_user: sectionA.original_user,
      five_year_use: sectionA.five_year_use,
      related_to_new_home: sectionA.related_to_new_home,
      door_cost: door.cost,
      door_qmid_first: door.qmid.slice(0, 4),
      door_qmid_rest: door.qmid.slice(4),
      door_credit: partII.firstDoorCredit,
      other_doors_cost: 0,
      other_doors_total: 0,
      other_doors_credit: 0,
      total_door_credit: partII.doorsCredit,
      home_in_us: sectionB.home_in_us,
      originally_placed_in_service: sectionB.originally_placed_in_service,
      ac_cost: ac.cost,
      ac_qmid_first: ac.qmid.slice(0, 4),
      ac_qmid_rest: ac.qmid.slice(4),
      other_ac_cost: 0,
      total_ac_cost: ac.cost,
      ac_credit: partII.centralAirCredit,
      panelboard_installed: false,
      energy_audit: false,
      line27: partII.standardSubtotal,
      line28: partII.cappedStandard,
      line30: partII.available,
      line31: source.part_ii_tax_limit,
      line32: partII.allowed,
    };
    address(output, "section_a", sectionA.home_address);
    address(output, "section_b", sectionB.home_addresses[0]);
    return output;
  },
  includeWhen: (projected) =>
    typeof projected.line32 === "number" && projected.line32 > 0,
};
