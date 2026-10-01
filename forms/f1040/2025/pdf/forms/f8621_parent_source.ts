import type { F8621Item } from "../../../nodes/inputs/f8621/index.ts";
import { projectForm8621ParentSource } from "../../form8621_parent_source.ts";

/** Page 1 widget values, staged without registering a partial printable filing. */
export function projectForm8621Page1(
  item: F8621Item,
): Record<string, string | boolean> {
  const source = projectForm8621ParentSource(item);
  const page = "topmostSubform[0].Page1[0].";
  const calendar = source.corporation_tax_year_start === "2025-01-01" &&
    source.corporation_tax_year_end === "2025-12-31";
  const fields: Record<string, string | boolean> = {
    [`${page}NameAddress2[0].f1_14[0]`]: item.company_name,
    [`${page}NameAddress2[0].f1_15[0]`]: [
      source.corporation_address.line1,
      source.corporation_address.line2,
      source.corporation_address.city,
      source.corporation_address.province_or_state,
      source.corporation_address.postal_code,
      source.corporation_address.country_code,
    ].filter(Boolean).join(", "),
    [`${page}f1_23[0]`]: source.share_classes.map((row) => row.description)
      .join("; "),
    [`${page}f1_25[0]`]: String(item.shares_owned),
    [`${page}c1_4[0]`]: source.jointly_owned_with_spouse,
    [`${page}c1_6[0]`]:
      source.election_status === "section1291_no_new_election",
    [`${page}c1_7[0]`]: source.election_status.startsWith("qef_"),
    [`${page}c1_8[0]`]: source.election_status.startsWith("mtm_"),
    [`${page}c1_9[0]`]: source.election_status === "qef_new_2025",
    [`${page}c1_11[0]`]: source.election_status === "mtm_new_2025",
  };
  if (/^\d{2}-?\d{7}$/.test(item.company_ein_or_ref)) {
    fields[`${page}f1_16[0]`] = item.company_ein_or_ref;
  } else {
    fields[`${page}f1_17[0]`] = item.company_ein_or_ref;
  }
  if (calendar) {
    fields[`${page}TaxYearOfPFIC[0].f1_18[0]`] = "25";
  } else {
    fields[`${page}TaxYearOfPFIC[0].f1_19[0]`] = source
      .corporation_tax_year_start.slice(5).replace("-", "/");
    fields[`${page}TaxYearOfPFIC[0].f1_20[0]`] = source
      .corporation_tax_year_start.slice(2, 4);
    fields[`${page}TaxYearOfPFIC[0].f1_21[0]`] = source.corporation_tax_year_end
      .slice(5).replace("-", "/");
    fields[`${page}TaxYearOfPFIC[0].f1_22[0]`] = source.corporation_tax_year_end
      .slice(2, 4);
  }
  if (source.acquisition_date) {
    fields[`${page}f1_24[0]`] = source.acquisition_date;
  }
  if (item.fmv_at_year_end <= 50_000) fields[`${page}c1_5[0]`] = true;
  else if (item.fmv_at_year_end <= 100_000) fields[`${page}c1_5[1]`] = true;
  else if (item.fmv_at_year_end <= 150_000) fields[`${page}c1_5[2]`] = true;
  else if (item.fmv_at_year_end <= 200_000) fields[`${page}c1_5[3]`] = true;
  else fields[`${page}f1_26[0]`] = String(item.fmv_at_year_end);
  return fields;
}
