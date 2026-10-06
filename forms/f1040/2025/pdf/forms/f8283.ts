import { assertReviewedForm8283Return } from "../../mef/forms/f8283_return.ts";
import { type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  groupSectionBSourceForms,
  inputSchema,
  type SectionAItem,
  type SectionBItem,
  SectionBPropertyType,
  specialSectionBAsSectionA,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  assertCreatorReductionSource,
  assertIntellectualPropertyReductionSource,
  assertInventoryReductionSource,
  assertManuscriptReductionSource,
  assertPrivateFoundationReductionSource,
  assertShortTermReductionSource,
  assertTaxidermyReductionSource,
  assertUnrelatedUseReductionSource,
  assertVehicleSaleReductionSource,
  fmvReductionExplanation,
  needsFmvReductionStatement,
  sectionAFmvMethodDescription,
} from "../../mef/forms/f8283.ts";
import {
  assertElectedSectionAReconciled,
  assertElectedSectionBReconciled,
  assertExceptionVehicleUnreducedSource,
  assertOrdinarySectionAReconciled,
  assertOrdinarySectionBReconciled,
  assertReviewedForm8283Owners,
  isReviewedSectionBReductionInventory,
  isSingleSectionAExceptionVehicleUnreduced,
  isSingleSectionAVehicleSale,
  isTwoSectionBReducedEquipmentGifts,
  isTwoSectionBSimilarArtGroup,
} from "../../mef/forms/f8283_election.ts";
import {
  carriedSectionAItem,
  reconcileForm8283Carryover,
} from "../../mef/forms/f8283_carryover.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Verified against the December 2025 IRS AcroForm, not the older f8283.pdf.
const page = "Form8283[0].Page1[0]";
const page2 = "Form8283[0].Page2[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
});

const fields: PdfFieldEntry[] = [
  text("filer_name", "f1_1[0]"),
  text("filer_ssn", "f1_2[0]"),
  {
    kind: "checkbox",
    domainKey: "section_b_art_at_least_20000",
    pdfField: `${page}.Lines2a-c[0].c1_6[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_art_under_20000",
    pdfField: `${page}.Lines2a-c[0].c1_6[2]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_other_real_estate",
    pdfField: `${page}.Lines2d-h[0].c1_6[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_equipment",
    pdfField: `${page}.Lines2d-h[0].c1_6[1]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_securities",
    pdfField: `${page}.Lines2d-h[0].c1_6[2]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_collectibles",
    pdfField: `${page}.Lines2d-h[0].c1_6[3]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_clothing_household",
    pdfField: `${page}.Lines2i-l[0].c1_6[1]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_vehicle",
    pdfField: `${page}.Lines2i-l[0].c1_6[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_other",
    pdfField: `${page}.Lines2i-l[0].c1_6[3]`,
  },
  ...[1, 2].flatMap((row): PdfFieldEntry[] => {
    const letter = "ABC"[row], suffix = letter.toLowerCase();
    return ["description", "condition", "appraised_fmv"].map((
      key,
      offset,
    ) => ({
      kind: "text",
      domainKey: `section_b_${key}_${suffix}`,
      pdfField: `${page}.Table_Line3_ColsA-C[0].Line3${letter}[0].f1_${
        42 + 3 * row + offset
      }[0]`,
    } as PdfFieldEntry)).concat(
      [
        "acquired_date",
        "how_acquired",
        "basis",
        "bargain_sale_received",
        "conservation_basis",
        "claim",
      ].map((
        key,
        offset,
      ) => ({
        kind: "text",
        domainKey: `section_b_${key}_${suffix}`,
        pdfField: `${page}.Table_Line3_ColsD-I[0].Row3${letter}[0].f1_${
          51 + 6 * row + offset
        }[0]`,
      } as PdfFieldEntry)),
    );
  }),
  text("section_b_description", "Table_Line3_ColsA-C[0].Row3A[0].f1_42[0]"),
  text("section_b_condition", "Table_Line3_ColsA-C[0].Row3A[0].f1_43[0]"),
  text("section_b_appraised_fmv", "Table_Line3_ColsA-C[0].Row3A[0].f1_44[0]"),
  ...[
    "acquired_date",
    "how_acquired",
    "basis",
    "bargain_sale_received",
    "conservation_basis",
    "claim",
  ].map((key, offset): PdfFieldEntry => ({
    kind: "text",
    domainKey: `section_b_${key}`,
    pdfField: `${page}.Table_Line3_ColsD-I[0].Row3A[0].f1_${51 + offset}[0]`,
  })),
  {
    kind: "text",
    domainKey: "page2_filer_name",
    pdfField: `${page2}.f2_1[0]`,
  },
  {
    kind: "text",
    domainKey: "page2_filer_ssn",
    pdfField: `${page2}.f2_2[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_unrelated_use_yes",
    pdfField: `${page2}.c2_4[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "section_b_unrelated_use_no",
    pdfField: `${page2}.c2_4[1]`,
  },
  ...([
    ["donor_statement", "f2_12[0]"],
    ["appraiser_name", "f2_13[0]"],
    ["appraiser_street", "f2_15[0]"],
    ["appraiser_id", "f2_16[0]"],
    ["appraiser_city_state_zip", "f2_17[0]"],
    ["donee_received_date", "f2_18[0]"],
    ["donee_name", "f2_19[0]"],
    ["donee_ein", "f2_20[0]"],
    ["donee_street", "f2_21[0]"],
    ["donee_city_state_zip", "f2_22[0]"],
  ] as const).map(([key, field]) => ({
    kind: "text" as const,
    domainKey: `section_b_${key}`,
    pdfField: `${page2}.${field}`,
  })),
];

for (let row = 0; row < 4; row++) {
  const letter = "ABCD"[row];
  const first = 5 + row * 3;
  const second = 17 + row * 6;
  const colABC = `${page}.Table_Line1_ColsA-C[0].Row1${letter}[0]`;
  const colB = `${colABC}.ColB[0]`;
  const colDI = `${page}.Table_Line1_ColsD-I[0].Row1${letter}[0]`;
  fields.push(
    text(
      `row${row + 1}_donee`,
      `Table_Line1_ColsA-C[0].Row1${letter}[0].f1_${first}[0]`,
    ),
    {
      kind: "checkbox",
      domainKey: `row${row + 1}_vehicle`,
      pdfField: `${colB}.c1_${row + 2}[0]`,
    },
    {
      kind: "text",
      domainKey: `row${row + 1}_vin`,
      pdfField: `${colB}.f1_${first + 1}[0]`,
    },
    {
      kind: "text",
      domainKey: `row${row + 1}_description`,
      pdfField: `${colABC}.f1_${first + 2}[0]`,
    },
    ...[
      "contribution_date",
      "acquired_date",
      "how_acquired",
      "basis",
      "claim",
      "fmv_method",
    ].map((key, offset): PdfFieldEntry => ({
      kind: "text",
      domainKey: `row${row + 1}_${key}`,
      pdfField: `${colDI}.f1_${second + offset}[0]`,
    })),
  );
}

function identity(filer: FilerIdentity | undefined): {
  filer_name: string;
  filer_ssn: string;
} {
  if (!filer?.nameLine1 || !filer.primarySSN) {
    throw new Error("Form 8283 PDF needs filer name and SSN");
  }
  const ssn = filer.primarySSN.replace(/\D/g, "");
  if (!/^\d{9}$/.test(ssn)) {
    throw new Error("Form 8283 PDF needs a nine-digit filer SSN");
  }
  return { filer_name: filer.nameLine1, filer_ssn: ssn };
}

function printedDate(
  value: string | undefined,
  monthOnly = false,
): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Form 8283 PDF needs a valid ISO calendar date");
  }
  const [year, month, day] = value.split("-");
  return monthOnly ? `${month}/${year}` : `${month}/${day}/${year}`;
}

function doneeLine(item: {
  donee_organization_name?: string;
  donee_organization_us_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
}): string {
  const address = item.donee_organization_us_address;
  if (!address) throw new Error("Form 8283 PDF needs a donee address");
  return [
    item.donee_organization_name,
    `${
      [address.line1, address.line2].filter(Boolean).join(" ")
    }, ${address.city}, ${address.state} ${address.zip}`,
  ].join("\n");
}

function assertUnreducedSectionACompanion(item: SectionAItem): void {
  const address = item.donee_organization_us_address;
  const acquired = printedDate(item.date_acquired);
  const contributed = printedDate(item.date_contributed);
  if (
    item.is_vehicle === true ||
    item.short_term_ordinary_income_reduction_confirmed === true ||
    item.capital_gain_reduction_election_confirmed === true ||
    item.is_capital_gain_property !== false ||
    item.charitable_limit_category !== "noncash_50" ||
    !item.property_description?.trim() ||
    !item.donee_organization_name?.trim() ||
    !address?.line1.trim() || !address.city.trim() ||
    !address.state.trim() || !address.zip.trim() ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    !acquired || !contributed ||
    !item.date_contributed?.startsWith("2025-") ||
    (item.date_acquired ?? "") > (item.date_contributed ?? "") ||
    item.fmv === undefined || item.fmv <= 0 || item.fmv > 5_000 ||
    item.deduction_claimed !== item.fmv ||
    item.cost_or_adjusted_basis === undefined ||
    item.cost_or_adjusted_basis < item.fmv ||
    (!item.fmv_method && !item.fmv_method_description?.trim())
  ) {
    throw new Error(
      "Form 8283 PDF unreduced companion needs a complete purchased noncapital Section A gift claimed at FMV",
    );
  }
}

function street(address: {
  line1: string;
  line2?: string;
}): string {
  return [address.line1, address.line2].filter(Boolean).join(" ");
}

function cityStateZip(address: {
  city: string;
  state: string;
  zip: string;
}): string {
  return `${address.city}, ${address.state} ${address.zip}`;
}

function sectionBPrintedFields(
  item: SectionBItem,
  filer: FilerIdentity | undefined,
): Record<string, unknown> {
  const appraisal = item.qualified_appraisal!;
  const donee = item.donee_acknowledgment!;
  const person = identity(filer);
  return {
    ...person,
    page2_filer_name: person.filer_name,
    page2_filer_ssn: person.filer_ssn,
    section_b_donor_statement: item.donor_statement_source_review
      ? `Property ${item.donor_statement_source_review.property_id}`
      : undefined,
    section_b_description: item.property_description,
    section_b_condition: item.physical_condition,
    section_b_appraised_fmv: item.fmv,
    section_b_acquired_date: printedDate(item.date_acquired, true),
    section_b_how_acquired: item.donor_acquisition_description,
    section_b_basis: item.cost_or_adjusted_basis,
    section_b_claim: item.deduction_claimed,
    section_b_appraiser_name:
      `${appraisal.appraiser_first_name} ${appraisal.appraiser_last_name}`,
    section_b_appraiser_id: appraisal.appraiser_ein ?? appraisal.appraiser_ssn,
    section_b_appraiser_street: street(appraisal.us_address),
    section_b_appraiser_city_state_zip: cityStateZip(appraisal.us_address),
    section_b_donee_received_date: printedDate(donee.received_date),
    section_b_unrelated_use_yes: donee.unrelated_use,
    section_b_unrelated_use_no: !donee.unrelated_use,
    section_b_donee_name: donee.organization_name,
    section_b_donee_ein: donee.ein,
    section_b_donee_street: street(donee.us_address),
    section_b_donee_city_state_zip: cityStateZip(donee.us_address),
  };
}

function sectionBInstance(
  item: SectionBItem,
  filer: FilerIdentity | undefined,
): Record<string, unknown> {
  const appraisal = item.qualified_appraisal;
  const donee = item.donee_acknowledgment;
  if (
    item.property_type !== SectionBPropertyType.OtherRealEstate ||
    item.capital_gain_reduction_election_confirmed !== true ||
    !item.property_description?.trim() || !item.physical_condition?.trim() ||
    !item.date_acquired || !item.date_contributed ||
    !item.donor_acquisition_description?.trim() ||
    item.cost_or_adjusted_basis === undefined || !appraisal || !donee ||
    !appraisal.signature_attachment_file_name ||
    !donee.signature_attachment_file_name ||
    !item.reduction_statement_attachment_file_name ||
    donee.received_date !== item.date_contributed
  ) {
    throw new Error(
      "Form 8283 Section B PDF needs one complete investment-land election source with named signature PDFs",
    );
  }
  const reduction = item.fmv - item.deduction_claimed;
  return {
    ...sectionBPrintedFields(item, filer),
    section_b_other_real_estate: true,
    reduction_statements: [
      `Section B item A: unimproved investment land appraised at FMV $${
        item.fmv.toFixed(2)
      }. The confirmed 50% limit election removes long-term appreciation $${
        reduction.toFixed(2)
      }, leaving adjusted basis and claimed contribution $${
        item.deduction_claimed.toFixed(2)
      }. Appraiser signed ${
        printedDate(appraisal.signed_date)
      }. Source names the separate reduction statement ${item.reduction_statement_attachment_file_name} and signature PDFs ${appraisal.signature_attachment_file_name} and ${donee.signature_attachment_file_name}. A separately reviewed completed signed Form 8283 PDF is still required for MeF filing. This generated PDF does not reproduce signatures and is not a signed paper Form 8283.`,
    ],
  };
}

function sectionBOrdinaryTangibleInstance(
  item: SectionBItem,
  filer: FilerIdentity | undefined,
): Record<string, unknown> {
  if (item.unreduced_purchased_property) {
    return {
      ...sectionBPrintedFields(item, filer),
      section_b_equipment:
        item.property_type === SectionBPropertyType.Equipment,
      section_b_collectibles:
        item.property_type === SectionBPropertyType.Collectibles,
      section_b_art_under_20000:
        item.property_type === SectionBPropertyType.ArtUnder20000,
      section_b_art_at_least_20000:
        item.property_type === SectionBPropertyType.ArtAtLeast20000,
      reduction_statements: [],
    };
  }
  if (item.special_fmv_reduction) {
    return {
      ...sectionBPrintedFields(item, filer),
      section_b_art_at_least_20000:
        item.property_type === SectionBPropertyType.ArtAtLeast20000,
      section_b_art_under_20000:
        item.property_type === SectionBPropertyType.ArtUnder20000,
      section_b_equipment:
        item.property_type === SectionBPropertyType.Equipment,
      section_b_collectibles:
        item.property_type === SectionBPropertyType.Collectibles,
      section_b_other_real_estate:
        item.property_type === SectionBPropertyType.OtherRealEstate,
      section_b_securities:
        item.property_type === SectionBPropertyType.Securities,
      section_b_other: item.property_type === SectionBPropertyType.Other,
      reduction_statements: [
        fmvReductionExplanation(specialSectionBAsSectionA(item), 0),
      ],
    };
  }
  const appraisal = item.qualified_appraisal;
  const donee = item.donee_acknowledgment;
  const propertyType = item.property_type;
  const supportedType = propertyType === SectionBPropertyType.ArtUnder20000 ||
    propertyType === SectionBPropertyType.ArtAtLeast20000 ||
    propertyType === SectionBPropertyType.Equipment ||
    propertyType === SectionBPropertyType.Securities ||
    propertyType === SectionBPropertyType.Collectibles ||
    propertyType === SectionBPropertyType.ClothingHousehold ||
    propertyType === SectionBPropertyType.OtherRealEstate;
  const label = propertyType === SectionBPropertyType.ArtUnder20000 ||
      propertyType === SectionBPropertyType.ArtAtLeast20000
    ? "art"
    : propertyType === SectionBPropertyType.Equipment
    ? "equipment"
    : propertyType === SectionBPropertyType.Securities
    ? "nonpublic securities"
    : propertyType === SectionBPropertyType.Collectibles
    ? "collectible"
    : propertyType === SectionBPropertyType.OtherRealEstate
    ? "unimproved investment land"
    : "clothing or household property";
  if (
    !supportedType ||
    (propertyType === SectionBPropertyType.ClothingHousehold &&
      item.good_used_condition_confirmed !== true) ||
    item.capital_gain_reduction_election_confirmed === true ||
    item.is_capital_gain_property !==
      (item.unrelated_use_capital_gain_reduction !== undefined) ||
    item.charitable_limit_category !== "noncash_50" ||
    item.fmv <= 0 || item.fmv > 500_000 ||
    (propertyType === SectionBPropertyType.ArtUnder20000 &&
      item.deduction_claimed >= 20_000) ||
    (propertyType === SectionBPropertyType.ArtAtLeast20000 &&
      (item.deduction_claimed < 20_000 ||
        !appraisal?.attachment_file_name ||
        !appraisal.full_appraisal_source_review ||
        appraisal.attachment_file_name ===
          item.signed_form_attachment_file_name)) ||
    (propertyType === SectionBPropertyType.OtherRealEstate &&
      (item.investment_land_unimproved_confirmed !== true ||
        item.ordinary_income_reduction?.reason !==
          "purchased_short_term_capital_asset")) ||
    (propertyType === SectionBPropertyType.Securities &&
      item.ordinary_income_reduction === undefined) ||
    (item.ordinary_income_reduction === undefined &&
        item.unrelated_use_capital_gain_reduction === undefined
      ? item.deduction_claimed !== item.fmv
      : (propertyType !== SectionBPropertyType.Equipment &&
        propertyType !== SectionBPropertyType.ArtUnder20000 &&
        propertyType !== SectionBPropertyType.ArtAtLeast20000 &&
        propertyType !== SectionBPropertyType.Securities &&
        propertyType !== SectionBPropertyType.Collectibles &&
        propertyType !== SectionBPropertyType.OtherRealEstate) ||
        !appraisal?.attachment_file_name ||
        !appraisal.full_appraisal_source_review ||
        item.deduction_claimed !== item.cost_or_adjusted_basis ||
        item.fmv <= item.deduction_claimed) ||
    item.cost_or_adjusted_basis === undefined ||
    (item.ordinary_income_reduction === undefined &&
      item.unrelated_use_capital_gain_reduction === undefined &&
      item.cost_or_adjusted_basis < item.fmv) ||
    !item.property_description?.trim() ||
    (propertyType !== SectionBPropertyType.Securities &&
      !item.physical_condition?.trim()) ||
    !item.date_acquired || !item.date_contributed?.startsWith("2025-") ||
    item.date_acquired > item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    !appraisal?.signature_attachment_file_name ||
    !donee?.signature_attachment_file_name ||
    !item.signed_form_attachment_file_name || !item.signed_form_source_review ||
    donee.received_date !== item.date_contributed
  ) {
    throw new Error(
      "Form 8283 Section B PDF needs one complete purchased tangible gift and its supported claim",
    );
  }
  const ordinary = item.ordinary_income_reduction;
  const unrelated = item.unrelated_use_capital_gain_reduction;
  const securityReference = item.nonpublic_security
    ? `Nonpublic C corporation issuer EIN ${item.nonpublic_security.issuer_ein}; ${item.nonpublic_security.shares_contributed} ${item.nonpublic_security.share_class} shares. `
    : "";
  const ordinaryExplanation = ordinary?.reason === "purchased_inventory"
    ? `Purchased inventory held for sale to customers has $${
      ordinary.gain_removed.toFixed(2)
    } hypothetical ordinary sale gain removed under section 170(e)(1)(A). Cost record ${ordinary.inventory_cost_record_reference}, purchase/basis PDF ${ordinary.purchase_record_attachment_file_name}, full appraisal ${appraisal.attachment_file_name}, and reduction statement ${ordinary.reduction_statement_attachment_file_name} have separate source reviews. `
    : ordinary
    ? `The purchased short-term capital asset's FMV sale gain $${
      ordinary.gain_removed.toFixed(2)
    } is removed under section 170(e)(1)(A); purchase record ${ordinary.purchase_record_attachment_file_name}, full appraisal ${appraisal.attachment_file_name}, and reduction statement ${ordinary.reduction_statement_attachment_file_name} have separate source reviews. `
    : "";
  const unrelatedExplanation = unrelated
    ? `Purchased long-term art was put to unrelated use by the donee. The section 170(e)(1)(B)(i) appreciation reduction is $` +
      unrelated.appreciation_removed.toFixed(2) +
      `; purchase record ${unrelated.purchase_record_attachment_file_name}, donee-use statement ${unrelated.donee_use_attachment_file_name}, full appraisal ${appraisal.attachment_file_name}, and reduction statement ${unrelated.reduction_statement_attachment_file_name} have separate source reviews. `
    : "";
  return {
    ...sectionBPrintedFields(item, filer),
    section_b_other_real_estate:
      propertyType === SectionBPropertyType.OtherRealEstate,
    section_b_art_at_least_20000:
      propertyType === SectionBPropertyType.ArtAtLeast20000,
    section_b_art_under_20000:
      propertyType === SectionBPropertyType.ArtUnder20000,
    section_b_equipment: propertyType === SectionBPropertyType.Equipment,
    section_b_securities: propertyType === SectionBPropertyType.Securities,
    section_b_collectibles: propertyType === SectionBPropertyType.Collectibles,
    section_b_clothing_household:
      propertyType === SectionBPropertyType.ClothingHousehold,
    reduction_statements: [
      `Section B item A: purchased ${label} ${item.property_description} ` +
      `appraised at $${item.fmv.toFixed(2)} and claimed at $${
        item.deduction_claimed.toFixed(2)
      }, with adjusted basis $${item.cost_or_adjusted_basis.toFixed(2)}. ` +
      `Appraiser signed ${printedDate(appraisal.signed_date)}. ` +
      securityReference +
      ordinaryExplanation +
      unrelatedExplanation +
      `The completed signed Form 8283 ${item.signed_form_attachment_file_name} ` +
      `was reviewed ${item.signed_form_source_review.reviewed_on} by ${item.signed_form_source_review.reviewed_by}. ` +
      (propertyType === SectionBPropertyType.ArtAtLeast20000
        ? `The complete signed appraisal ${appraisal.attachment_file_name} was reviewed ${
          appraisal.full_appraisal_source_review!.reviewed_on
        } by ${appraisal.full_appraisal_source_review!.reviewed_by}. `
        : "") +
      `This generated PDF does not reproduce signatures and is not the signed filing attachment.`,
    ],
  };
}

function sectionBVehicleInstance(
  item: SectionBItem,
  filer: FilerIdentity | undefined,
): Record<string, unknown> {
  const appraisal = item.qualified_appraisal;
  const donee = item.donee_acknowledgment;
  const acknowledgment = item.vehicle_material_improvement_acknowledgment ??
    item.vehicle_significant_use_acknowledgment ??
    item.vehicle_needy_transfer_acknowledgment;
  const description = item.property_description?.toLowerCase() ?? "";
  const compactDescription = description.replace(/[,\s]/g, "");
  if (
    item.property_type !== SectionBPropertyType.Vehicle ||
    item.capital_gain_reduction_election_confirmed === true ||
    item.is_capital_gain_property !== false ||
    item.charitable_limit_category !== "noncash_50" ||
    item.fmv <= 5_000 || item.deduction_claimed !== item.fmv ||
    item.cost_or_adjusted_basis === undefined ||
    item.cost_or_adjusted_basis < item.fmv ||
    !item.property_description?.trim() || !item.physical_condition?.trim() ||
    !item.vehicle_vin?.trim() || !item.date_acquired ||
    !item.date_contributed?.startsWith("2025-") ||
    item.date_acquired > item.date_contributed ||
    item.donor_acquisition_description?.trim().toLowerCase() !== "purchase" ||
    !appraisal?.signature_attachment_file_name ||
    !donee?.signature_attachment_file_name ||
    !item.signed_form_attachment_file_name || !item.signed_form_source_review ||
    !item.vehicle_acknowledgment_attachment_file_name || !acknowledgment ||
    !description.includes(String(acknowledgment.vehicle_year)) ||
    !description.includes(acknowledgment.vehicle_make.toLowerCase()) ||
    !description.includes(acknowledgment.vehicle_model.toLowerCase()) ||
    !description.includes(acknowledgment.vehicle_condition.toLowerCase()) ||
    !compactDescription.includes(String(acknowledgment.odometer_miles)) ||
    donee.received_date !== item.date_contributed ||
    donee.organization_name !== acknowledgment.donee_name ||
    donee.ein !== acknowledgment.donee_ein ||
    JSON.stringify(donee.us_address) !==
      JSON.stringify(acknowledgment.donee_us_address)
  ) {
    throw new Error(
      "Form 8283 Section B PDF needs one fully sourced exception vehicle and signed-form review",
    );
  }
  const certification = item.vehicle_material_improvement_acknowledgment
    ? `The donee certified a material improvement: ${item.vehicle_material_improvement_acknowledgment.intended_improvement_description}.`
    : item.vehicle_significant_use_acknowledgment
    ? `The donee certified significant charitable use: ${item.vehicle_significant_use_acknowledgment.intended_use_description} for ${item.vehicle_significant_use_acknowledgment.intended_use_duration}.`
    : "The donee certified a transfer to a needy recipient for significantly below FMV in direct furtherance of its charitable transportation purpose.";
  return {
    ...sectionBPrintedFields(item, filer),
    section_b_vehicle: true,
    reduction_statements: [
      `Section B item A: ${item.property_description}; VIN ${item.vehicle_vin}. ` +
      `${certification} ` +
      `Appraised FMV and claimed deduction are both $${item.fmv.toFixed(2)}. ` +
      `Appraiser signed ${printedDate(appraisal.signed_date)}. ` +
      `Review the donee-issued acknowledgment ${item.vehicle_acknowledgment_attachment_file_name} ` +
      `and completed signed Form 8283 ${item.signed_form_attachment_file_name} ` +
      `(reviewed ${item.signed_form_source_review.reviewed_on} by ${item.signed_form_source_review.reviewed_by}). ` +
      `This generated PDF does not reproduce signatures and is not the signed filing attachment.`,
    ],
  };
}

function drawWrappedText(
  page: PDFPage,
  font: PDFFont,
  value: string,
  y: number,
): number {
  const maxWidth = 516;
  let line = "";
  for (const word of value.split(/\s+/)) {
    if (font.widthOfTextAtSize(word, 10) > maxWidth) {
      if (line) {
        page.drawText(line, { x: 48, y, size: 10, font });
        y -= 15;
        line = "";
      }
      let remaining = word;
      while (remaining) {
        let count = remaining.length;
        while (
          count > 1 &&
          font.widthOfTextAtSize(remaining.slice(0, count), 10) > maxWidth
        ) count--;
        const part = remaining.slice(0, count);
        remaining = remaining.slice(count);
        if (remaining) {
          page.drawText(part, { x: 48, y, size: 10, font });
          y -= 15;
        } else line = part;
      }
    } else {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 10) > maxWidth && line) {
        page.drawText(line, { x: 48, y, size: 10, font });
        y -= 15;
        line = word;
      } else line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x: 48, y, size: 10, font });
    y -= 15;
  }
  return y;
}

function sectionBSourceFormInstances(
  items: readonly SectionBItem[],
  filer: FilerIdentity | undefined,
) {
  return groupSectionBSourceForms(items).map((rows) => {
    const first = sectionBOrdinaryTangibleInstance(rows[0], filer);
    for (let index = 1; index < rows.length; index++) {
      const fields = sectionBPrintedFields(rows[index], filer);
      const suffix = "abc"[index];
      for (
        const key of [
          "description",
          "condition",
          "appraised_fmv",
          "acquired_date",
          "how_acquired",
          "basis",
          "claim",
        ]
      ) {
        first[`section_b_${key}_${suffix}`] = fields[`section_b_${key}`];
      }
    }
    first.section_b_donor_statement = rows.filter((row) =>
      row.donor_statement_source_review
    )
      .map((row) =>
        `Property ${row.donor_statement_source_review!.property_id}`
      ).join("; ") || undefined;
    first.reduction_statements = rows.flatMap((row, index) => {
      const projected = sectionBOrdinaryTangibleInstance(row, filer);
      return (projected.reduction_statements as string[] ?? []).map((text) =>
        text.replace("Section B item A", `Section B item ${"ABC"[index]}`)
      );
    });
    return first;
  });
}

export const form8283Pdf: PdfFormDescriptor = {
  pendingKey: "f8283",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8283--2025.pdf",
  fields,
  pageIndices: (instance) =>
    instance.section_b_other_real_estate === true ||
      instance.section_b_art_at_least_20000 === true ||
      instance.section_b_art_under_20000 === true ||
      instance.section_b_equipment === true ||
      instance.section_b_securities === true ||
      instance.section_b_collectibles === true ||
      instance.section_b_clothing_household === true ||
      instance.section_b_vehicle === true || instance.section_b_other === true
      ? [0, 1]
      : [0],
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    const source = inputSchema.parse(raw);
    assertReviewedForm8283Owners(source, filer);
    assertReviewedForm8283Return({ pending: allPending });
    if (source.carryover_evidence !== undefined) {
      if (
        source.carryover_evidence.some((row) =>
          row.property_kind === "purchased_artwork"
        )
      ) {
        throw new Error(
          "Form 8283 Section B artwork carryover needs authenticated accepted 2024 filing before PDF export",
        );
      }
      const reconciled = reconcileForm8283Carryover(
        source,
        { pending: allPending, filer },
      );
      return reconciled.map(({ evidence }) => {
        const item = carriedSectionAItem(evidence);
        return {
          ...identity(filer),
          row1_donee: doneeLine(item),
          row1_vehicle: false,
          row1_description: item.property_description,
          row1_contribution_date: printedDate(item.date_contributed),
          row1_acquired_date: printedDate(item.date_acquired, true),
          row1_how_acquired: item.donor_acquisition_description,
          row1_basis: item.cost_or_adjusted_basis,
          row1_claim: item.deduction_claimed,
          row1_fmv_method: sectionAFmvMethodDescription(item),
          reduction_statements: needsFmvReductionStatement(item)
            ? [fmvReductionExplanation(item, 0)]
            : [],
        };
      });
    }
    const sectionA = source.section_a_items ?? [];
    const sectionB = source.section_b_items ?? [];
    const mixedInventory = sectionA.length > 0 && sectionB.length > 0 &&
      isReviewedSectionBReductionInventory(source);
    const mixedCopies = mixedInventory
      ? sectionBSourceFormInstances(sectionB, filer)
      : [];
    if (mixedInventory) {
      assertOrdinarySectionBReconciled(
        { pending: allPending },
        sectionB[0].property_type!,
      );
    }
    if (
      sectionA.length > 12 ||
      (sectionA.length > 4 &&
        ((!mixedInventory && sectionB.length > 0) ||
          sectionA.some((item) =>
            item.is_vehicle === true ||
            item.capital_gain_reduction_election_confirmed === true
          )))
    ) {
      throw new Error(
        "Form 8283 PDF supports five to twelve Section A rows only as distinct unreduced nonvehicle gifts on repeated copies",
      );
    }
    if (sectionB.length > 0 && !mixedInventory) {
      if (sectionB.length > 1) {
        const similarArt = isTwoSectionBSimilarArtGroup(source);
        const reducedEquipment = isTwoSectionBReducedEquipmentGifts(source);
        if (
          !similarArt && !reducedEquipment &&
          !isReviewedSectionBReductionInventory(source)
        ) {
          throw new Error(
            "Form 8283 PDF two Section B gifts need distinct signed/appraised similar-art sources and donees or reduced equipment sources",
          );
        }
        assertOrdinarySectionBReconciled(
          { pending: allPending },
          sectionB[0].property_type!,
        );
        if (
          JSON.stringify(source) !==
            JSON.stringify(inputSchema.parse(allPending?.f8283))
        ) {
          throw new Error(
            "Form 8283 PDF source differs from the pending return",
          );
        }
        return sectionBSourceFormInstances(sectionB, filer);
      }
      if (sectionA.length > 0 || sectionB.length !== 1) {
        throw new Error(
          "Form 8283 PDF Section B supports one standalone item without Section A",
        );
      }
      const ordinaryType = sectionB[0].property_type;
      if (
        ordinaryType && new Set<SectionBPropertyType>([
          SectionBPropertyType.ArtUnder20000,
          SectionBPropertyType.ArtAtLeast20000,
          SectionBPropertyType.Vehicle,
          SectionBPropertyType.Equipment,
          ...(sectionB[0].ordinary_income_reduction !== undefined
            ? [SectionBPropertyType.Securities]
            : []),
          SectionBPropertyType.Collectibles,
          SectionBPropertyType.ClothingHousehold,
          ...(sectionB[0].special_fmv_reduction
            ? [SectionBPropertyType.Other]
            : []),
          ...(sectionB[0].ordinary_income_reduction !== undefined
            ? [SectionBPropertyType.OtherRealEstate]
            : []),
        ]).has(ordinaryType)
      ) {
        assertOrdinarySectionBReconciled(
          { pending: allPending },
          ordinaryType,
        );
      } else {
        assertElectedSectionBReconciled({ pending: allPending });
      }
      if (
        JSON.stringify(source) !==
          JSON.stringify(inputSchema.parse(allPending?.f8283))
      ) {
        throw new Error("Form 8283 PDF source differs from the pending return");
      }
      const item = sectionB[0];
      return [
        item.property_type === SectionBPropertyType.Vehicle
          ? sectionBVehicleInstance(item, filer)
          : item.property_type === SectionBPropertyType.ArtUnder20000 ||
              item.property_type === SectionBPropertyType.ArtAtLeast20000 ||
              item.property_type === SectionBPropertyType.Equipment ||
              (item.property_type === SectionBPropertyType.Securities &&
                item.ordinary_income_reduction !== undefined) ||
              item.property_type === SectionBPropertyType.Collectibles ||
              item.property_type === SectionBPropertyType.ClothingHousehold ||
              item.special_fmv_reduction !== undefined ||
              (item.property_type === SectionBPropertyType.OtherRealEstate &&
                item.ordinary_income_reduction !== undefined)
          ? sectionBOrdinaryTangibleInstance(item, filer)
          : sectionBInstance(item, filer),
      ];
    }
    if (sectionA.length === 0) return [];
    const soldVehicle = isSingleSectionAVehicleSale(source);
    const exceptionVehicle = isSingleSectionAExceptionVehicleUnreduced(source);
    if (
      sectionA.some((item) => item.is_vehicle === true) &&
      !soldVehicle && !exceptionVehicle
    ) {
      throw new Error(
        "Form 8283 PDF supports only one reconciled certified-sale or unreduced exception Section A vehicle",
      );
    }
    const elected = sectionA.some((item) =>
      item.capital_gain_reduction_election_confirmed === true
    );
    const shortTermReduction = sectionA.some((item) =>
      item.short_term_ordinary_income_reduction_confirmed === true &&
      needsFmvReductionStatement(item)
    );
    const inventoryReduction = sectionA.some((item) =>
      item.inventory_ordinary_income_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    const creatorReduction = sectionA.some((item) =>
      item.creator_ordinary_income_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    const manuscriptReduction = sectionA.some((item) =>
      item.manuscript_ordinary_income_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    const unrelatedUseReduction = sectionA.some((item) =>
      item.unrelated_use_capital_gain_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    const dispositionReduction = sectionA.some((item) =>
      item.contribution_year_disposition_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    const privateFoundationReduction = sectionA.some((item) =>
      item.private_foundation_capital_gain_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    const taxidermyReduction = sectionA.some((item) =>
      item.taxidermy_capital_gain_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    const intellectualPropertyReduction = sectionA.some((item) =>
      item.intellectual_property_capital_gain_reduction !== undefined &&
      needsFmvReductionStatement(item)
    );
    if (
      !elected && !shortTermReduction && !inventoryReduction &&
      !creatorReduction && !manuscriptReduction &&
      !unrelatedUseReduction && !soldVehicle && !exceptionVehicle &&
      !privateFoundationReduction && !taxidermyReduction &&
      !intellectualPropertyReduction && !dispositionReduction &&
      sectionA.some((item) => needsFmvReductionStatement(item))
    ) {
      throw new Error(
        "Form 8283 PDF needs a sourced reduction for each reduced Section A gift",
      );
    }
    if (elected) assertElectedSectionAReconciled({ pending: allPending });
    if (
      !elected && !shortTermReduction && !inventoryReduction &&
      !creatorReduction && !manuscriptReduction && !unrelatedUseReduction &&
      !privateFoundationReduction && !taxidermyReduction &&
      !intellectualPropertyReduction && !dispositionReduction &&
      !soldVehicle &&
      !exceptionVehicle
    ) {
      assertUnreducedSectionACompanion(sectionA[0]);
    }
    if (soldVehicle) {
      assertVehicleSaleReductionSource(sectionA[0]);
    }
    if (exceptionVehicle) assertExceptionVehicleUnreducedSource(source);
    for (const item of sectionA) {
      if (soldVehicle || exceptionVehicle) continue;
      if (!elected && !needsFmvReductionStatement(item)) {
        assertUnreducedSectionACompanion(item);
      } else {
        assertShortTermReductionSource(item);
        assertInventoryReductionSource(item);
        assertCreatorReductionSource(item);
        assertManuscriptReductionSource(item);
        assertUnrelatedUseReductionSource(item);
        assertPrivateFoundationReductionSource(item);
        assertTaxidermyReductionSource(item);
        assertIntellectualPropertyReductionSource(item);
      }
    }
    if (
      JSON.stringify(source) !==
        JSON.stringify(inputSchema.parse(allPending?.f8283))
    ) {
      throw new Error("Form 8283 PDF source differs from the pending return");
    }
    if (!elected) assertOrdinarySectionAReconciled({ pending: allPending });
    const pages = Array.from(
      { length: Math.ceil(sectionA.length / 4) },
      (_, index) => sectionA.slice(index * 4, (index + 1) * 4),
    );
    return [
      ...mixedCopies,
      ...pages.map((items, pageIndex) => {
        const instance: Record<string, unknown> = {
          ...identity(filer),
          reduction_statements: items.flatMap((item, index) =>
            needsFmvReductionStatement(item)
              ? [fmvReductionExplanation(item, pageIndex * 4 + index)]
              : []
          ),
        };
        items.forEach((item, index) => {
          const prefix = `row${index + 1}_`;
          instance[`${prefix}donee`] = doneeLine(item);
          instance[`${prefix}vehicle`] = item.is_vehicle === true;
          instance[`${prefix}vin`] = item.is_vehicle
            ? item.vehicle_vin
            : undefined;
          instance[`${prefix}description`] = item.property_description;
          instance[`${prefix}contribution_date`] = printedDate(
            item.date_contributed,
          );
          instance[`${prefix}acquired_date`] = printedDate(
            item.date_acquired,
            true,
          );
          instance[`${prefix}how_acquired`] =
            item.donor_acquisition_description;
          instance[`${prefix}basis`] = item.cost_or_adjusted_basis;
          instance[`${prefix}claim`] = item.deduction_claimed ?? item.fmv;
          instance[`${prefix}fmv_method`] = sectionAFmvMethodDescription(item);
        });
        return instance;
      }),
    ];
  },
  async appendSupplementalPages(document, instance) {
    const statements = instance.reduction_statements as string[] | undefined;
    if (!statements?.length) return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const page = document.addPage([612, 792]);
    page.drawText(
      instance.section_b_other_real_estate === true ||
        instance.section_b_art_at_least_20000 === true ||
        instance.section_b_art_under_20000 === true ||
        instance.section_b_equipment === true ||
        instance.section_b_securities === true ||
        instance.section_b_collectibles === true ||
        instance.section_b_clothing_household === true ||
        instance.section_b_vehicle === true || instance.section_b_other === true
        ? "Form 8283 Section B - Source and attachment record"
        : "Form 8283 Section A - Fair market value reductions",
      {
        x: 48,
        y: 742,
        size: 14,
        font: bold,
        color: rgb(0, 0, 0),
      },
    );
    page.drawText(`${instance.filer_name}    SSN: ${instance.filer_ssn}`, {
      x: 48,
      y: 718,
      size: 10,
      font,
    });
    let y = 685;
    for (const statement of statements) {
      y = drawWrappedText(page, font, statement, y) - 20;
      if (y < 48) {
        throw new Error(
          "Form 8283 PDF reduction explanations exceed one supplemental page",
        );
      }
    }
  },
};
