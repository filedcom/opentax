import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import { EnergyType } from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { form8835PdfSources } from "./f8835_source.ts";

// Original TY2025 IRS Form 8835 AcroForm. The source-gated wind and geothermal
// paths use the applicable energy row; pre-2022 rates follow the printed footnote.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const page3 = "topmostSubform[0].Page3[0]";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({ kind: "text", domainKey, pdfField, printZero });
const checked = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey,
  pdfField,
  whenValue: "true",
});

function parts(value: number, degreeDigits: 2 | 3) {
  const [degrees, fraction] = Math.abs(value).toFixed(6).split(".");
  return {
    sign: value < 0 ? "-" : "+",
    degrees: degrees.padStart(degreeDigits, "0"),
    fraction,
  };
}

function usDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

export const form8835Pdf: PdfFormDescriptor = {
  pendingKey: "f8835",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8835--2025.pdf",
  fields: [
    text("filer_name", `${page1}.f1_1[0]`),
    text("filer_tin", `${page1}.f1_2[0]`),
    text("registration_number", `${page1}.f1_3[0]`),
    text("facility_type", `${page1}.f1_4[0]`),
    text("facility_description", `${page1}.f1_5[0]`),
    text("owner_name", `${page1}.f1_6[0]`),
    text("owner_tin", `${page1}.f1_7[0]`),
    text("address_line1", `${page1}.f1_8[0]`),
    text("address_line2", `${page1}.f1_9[0]`),
    text("lat_sign", `${page1}.Latitude_CombFields[0].f1_10[0]`),
    text("lat_degrees", `${page1}.Latitude_CombFields[0].f1_11[0]`),
    text("lat_fraction", `${page1}.Latitude_CombFields[0].f1_12[0]`),
    text("long_sign", `${page1}.Longitude_CombFields[0].f1_13[0]`),
    text("long_degrees", `${page1}.Longitude_CombFields[0].f1_14[0]`),
    text("long_fraction", `${page1}.Longitude_CombFields[0].f1_15[0]`),
    text("construction_date", `${page1}.f1_16[0]`),
    text("service_date", `${page1}.f1_17[0]`),
    checked("under_one_mw", `${page1}.c1_3[0]`),
    checked("early_construction", `${page1}.c1_3[1]`),
    checked("pwa_requirements", `${page1}.c1_3[2]`),
    checked("no_increased_credit", `${page1}.c1_3[3]`),
    checked("domestic_bonus", `${page1}.c1_4[0]`),
    checked("no_domestic_bonus", `${page1}.c1_4[1]`),
    checked("energy_community_bonus", `${page1}.c1_5[0]`),
    checked("no_energy_community_bonus", `${page1}.c1_5[1]`),
    checked("dc_not_applicable", `${page1}.c1_6[1]`),
    checked("dc_solar", `${page1}.c1_6[0]`),
    text("dc_solar_nameplate_kw", `${page1}.f1_18[0]`),
    checked("ac_wind", `${page1}.c1_8[0]`),
    text("ac_wind_nameplate_kw", `${page1}.f1_20[0]`),
    checked("ac_other", `${page1}.c1_9[0]`),
    text("ac_nameplate_kw", `${page1}.f1_21[0]`),
    text(
      "line1a_quantity",
      `${page2}.Table_PartII_Lines1a-j[0].Line1a[0].f2_1[0]`,
    ),
    text(
      "line1a_credit",
      `${page2}.Table_PartII_Lines1a-j[0].Line1a[0].f2_3[0]`,
    ),
    text(
      "line1b_quantity",
      `${page2}.Table_PartII_Lines1a-j[0].Line1b[0].f2_4[0]`,
    ),
    text(
      "line1b_credit",
      `${page2}.Table_PartII_Lines1a-j[0].Line1b[0].f2_6[0]`,
    ),
    text(
      "line1c_quantity",
      `${page2}.Table_PartII_Lines1a-j[0].Line1c[0].f2_7[0]`,
    ),
    text(
      "line1c_credit",
      `${page2}.Table_PartII_Lines1a-j[0].Line1c[0].f2_9[0]`,
    ),
    text(
      "line1d_quantity",
      `${page2}.Table_PartII_Lines1a-j[0].Line1d[0].f2_10[0]`,
    ),
    text(
      "line1d_credit",
      `${page2}.Table_PartII_Lines1a-j[0].Line1d[0].f2_12[0]`,
    ),
    text(
      "line1f_quantity",
      `${page2}.Table_PartII_Lines1a-j[0].Line1f[0].f2_16[0]`,
    ),
    text(
      "line1f_credit",
      `${page2}.Table_PartII_Lines1a-j[0].Line1f[0].f2_18[0]`,
    ),
    text(
      "line1g_quantity",
      `${page2}.Table_PartII_Lines1a-j[0].Line1g[0].f2_19[0]`,
    ),
    text(
      "line1g_credit",
      `${page2}.Table_PartII_Lines1a-j[0].Line1g[0].f2_21[0]`,
    ),
    text(
      "line1h_quantity",
      `${page2}.Table_PartII_Lines1a-j[0].Line1h[0].f2_22[0]`,
    ),
    text(
      "line1h_credit",
      `${page2}.Table_PartII_Lines1a-j[0].Line1h[0].f2_24[0]`,
    ),
    text("line2", `${page2}.f2_31[0]`),
    text("line4", `${page2}.f2_35[0]`),
    text("line5a", `${page2}.f2_36[0]`),
    text("line5b", `${page2}.f2_37[0]`, true),
    text("line5c", `${page2}.f2_38[0]`, true),
    text("line5d", `${page2}.f2_39[0]`, true),
    text("line6", `${page2}.f2_40[0]`),
    text("line7a", `${page2}.f2_41[0]`),
    text("line7b", `${page2}.f2_42[0]`),
    text("line7c", `${page2}.f2_43[0]`),
    text("line7d", `${page2}.f2_44[0]`),
    text("line7e", `${page2}.f2_45[0]`),
    text("line7f", `${page2}.f2_46[0]`),
    text("line7g", `${page2}.f2_47[0]`),
    text("line8", `${page2}.f2_48[0]`),
    text("line9", `${page2}.f2_49[0]`),
    text("line10", `${page2}.f2_50[0]`, true),
    text("line11", `${page2}.f2_51[0]`, true),
    text("line12", `${page2}.f2_52[0]`),
    text("line13", `${page2}.f2_53[0]`),
    text("line15", `${page3}.f3_2[0]`),
  ],
  instances(_fields, filer, allPending, preparedForm3800) {
    if (!allPending?.f8835) return [];
    if (!preparedForm3800) {
      throw new Error(
        "Form 8835 PDF needs the prepared Form 3800 source parts",
      );
    }
    return form8835PdfSources(allPending, filer, preparedForm3800).map(
      (source) => {
        const { item, lines, filerName, filerTin } = source;
        const wind = item.energy_type === EnergyType.Wind;
        const oldFacility = item.facility_placed_in_service_date < "2022-01-01";
        const constructionYear = Number(
          item.facility_construction_start_date.slice(0, 4),
        );
        const wind20 = wind && oldFacility && constructionYear === 2017;
        const wind40 = wind && oldFacility &&
          [2018, 2020, 2021].includes(constructionYear);
        const wind60 = wind && oldFacility && constructionYear === 2019;
        const closedLoopBiomass = item.energy_type === EnergyType.BiomassClosed;
        const openLoopBiomass = item.energy_type === EnergyType.BiomassOpen;
        const solar = item.energy_type === EnergyType.Solar;
        const landfill = item.energy_type === EnergyType.Landfill;
        const trash = item.energy_type === EnergyType.Trash;
        const lat = parts(item.facility_latitude!, 2);
        const long = parts(item.facility_longitude!, 3);
        return {
          filer_name: filerName,
          registration_number: item.registration_number,
          filer_tin: filerTin,
          facility_type: wind
            ? "Wind"
            : closedLoopBiomass
            ? "Closed-loop biomass"
            : openLoopBiomass
            ? item.open_loop_livestock_source
              ? "Open-loop biomass (livestock waste)"
              : "Open-loop biomass (cellulosic waste)"
            : solar
            ? "Solar"
            : landfill
            ? "Landfill gas (municipal solid waste)"
            : trash
            ? "Trash combustion (municipal solid waste)"
            : "Geothermal",
          facility_description: item.facility_description,
          owner_name: item.facility_owner_business?.name,
          owner_tin: item.facility_owner_business?.ein,
          address_line1: source.addressLine1,
          address_line2: source.addressLine2,
          lat_sign: lat.sign,
          lat_degrees: lat.degrees,
          lat_fraction: lat.fraction,
          long_sign: long.sign,
          long_degrees: long.degrees,
          long_fraction: long.fraction,
          construction_date: usDate(item.facility_construction_start_date),
          service_date: usDate(item.facility_placed_in_service_date),
          under_one_mw: item.increased_credit_reason === "under_one_mw",
          early_construction:
            item.increased_credit_reason === "construction_before_2023_01_29",
          pwa_requirements: item.increased_credit_reason ===
            "prevailing_wage_and_apprenticeship",
          no_increased_credit: !oldFacility &&
            item.increased_credit_reason === "none",
          domestic_bonus: item.domestic_content_bonus,
          no_domestic_bonus: !item.domestic_content_bonus,
          energy_community_bonus: item.energy_community_bonus,
          no_energy_community_bonus: !item.energy_community_bonus,
          dc_not_applicable: !solar,
          dc_solar: solar,
          dc_solar_nameplate_kw: solar ? item.solar_dc_nameplate_kw : undefined,
          ac_wind: wind,
          ac_wind_nameplate_kw: wind ? item.ac_nameplate_kw : undefined,
          ac_other: !wind,
          ac_nameplate_kw: wind ? undefined : item.ac_nameplate_kw,
          line1a_quantity: wind ? item.kwh_sold : undefined,
          line1a_credit: wind ? lines.line1 : undefined,
          line1b_quantity: closedLoopBiomass ? item.kwh_sold : undefined,
          line1b_credit: closedLoopBiomass ? lines.line1 : undefined,
          line1c_quantity: item.energy_type === EnergyType.Geothermal
            ? item.kwh_sold
            : undefined,
          line1c_credit: item.energy_type === EnergyType.Geothermal
            ? lines.line1
            : undefined,
          line1d_quantity: solar ? item.kwh_sold : undefined,
          line1d_credit: solar ? lines.line1 : undefined,
          line1f_quantity: openLoopBiomass ? item.kwh_sold : undefined,
          line1f_credit: openLoopBiomass ? lines.line1 : undefined,
          line1g_quantity: landfill ? item.kwh_sold : undefined,
          line1g_credit: landfill ? lines.line1 : undefined,
          line1h_quantity: trash ? item.kwh_sold : undefined,
          line1h_credit: trash ? lines.line1 : undefined,
          line2: lines.line2,
          line4: lines.line4,
          line5a: item.tax_exempt_bond_proceeds
            ? lines.line5a.toFixed(2)
            : undefined,
          line5b: item.tax_exempt_bond_proceeds ? lines.line5b : undefined,
          line5c: item.tax_exempt_bond_proceeds ? lines.line5c : undefined,
          line5d: item.tax_exempt_bond_proceeds ? lines.line5d : undefined,
          line6: lines.line6,
          line7a: wind20 ? lines.line6 : undefined,
          line7b: wind20 ? lines.line7g : undefined,
          line7c: wind40 ? lines.line6 : undefined,
          line7d: wind40 ? lines.line7g : undefined,
          line7e: wind60 ? lines.line6 : undefined,
          line7f: wind60 ? lines.line7g : undefined,
          line7g: oldFacility && wind ? lines.line7g : undefined,
          line8: lines.line8,
          line9: lines.line9,
          line10: lines.line10,
          line11: lines.line11,
          line12: lines.line12,
          line13: lines.line13,
          line15: lines.line15,
        };
      },
    );
  },
};
