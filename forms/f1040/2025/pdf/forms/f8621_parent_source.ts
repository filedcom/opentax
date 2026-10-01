import type { FilerIdentity } from "../../../mef/header.ts";
import {
  type Form8621Lines,
  PficRegime,
} from "../../../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../../../nodes/inputs/f8621/excess_distribution.ts";
import { projectForm8621ParentSource } from "../../form8621_parent_source.ts";
import { explainForm8621ExcessStatement } from "../../mef/forms/f8621_excess_statement.ts";

type Fields = Record<string, string | boolean>;

function dollars(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error("Form 8621 PDF amount is missing or invalid");
  }
  return String(Math.round(value));
}

function checkedFiler(filer: FilerIdentity): { name: string; ssn: string } {
  const name = (filer.fullName ?? filer.nameLine1).trim();
  const ssn = filer.primarySSN.replaceAll("-", "");
  if (
    !name || !/^\d{9}$/.test(ssn) || !filer.address.line1 ||
    !filer.address.city ||
    !(filer.address.foreignPostalCode ?? filer.address.zip)
  ) {
    throw new Error(
      "Form 8621 parent needs final filer name, SSN, and address",
    );
  }
  if (!filer.address.foreignCountry && !filer.address.state) {
    throw new Error("Form 8621 parent needs filer state or foreign country");
  }
  return { name, ssn };
}

/** Page 1 widget values, staged without registering a partial printable filing. */
export function projectForm8621Page1(
  line: Form8621Lines,
  filer: FilerIdentity,
): Fields {
  const { item } = line;
  const source = projectForm8621ParentSource(item);
  const { name, ssn } = checkedFiler(filer);
  if (item.regime !== PficRegime.EXCESS_DISTRIBUTION) {
    throw new Error("Form 8621 staged parent PDF supports section 1291 only");
  }
  explainForm8621ExcessStatement(line);
  const page = "topmostSubform[0].Page1[0].";
  const calendar = source.corporation_tax_year_start === "2025-01-01" &&
    source.corporation_tax_year_end === "2025-12-31";
  const section1291Amount = line.excessEvents.reduce(
    (total, event) => total + event.amount_usd,
    0,
  );
  const fields: Fields = {
    [`${page}NameAddress[0].f1_1[0]`]: name,
    [`${page}NameAddress[0].f1_2[0]`]: filer.address.line1,
    [`${page}NameAddress[0].f1_4[0]`]: filer.address.city,
    [`${page}NameAddress[0].f1_5[0]`]: filer.address.foreignProvinceState ??
      filer.address.state,
    [`${page}NameAddress[0].f1_6[0]`]: filer.address.foreignCountry ??
      "United States",
    [`${page}NameAddress[0].f1_7[0]`]: filer.address.foreignPostalCode ??
      filer.address.zip,
    [`${page}NameAddress[0].ShareholderTaxYear[0].f1_9[0]`]: "25",
    [`${page}f1_8[0]`]: ssn,
    [`${page}c1_1[0]`]: true,
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
  if (section1291Amount > 0) {
    fields[`${page}f1_27[0]`] = dollars(section1291Amount);
  }
  if (filer.address.line2) {
    fields[`${page}NameAddress[0].f1_3[0]`] = filer.address.line2;
  }
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

/** The 2025 blank has one Part V per excess distribution or disposition. */
export function projectForm8621PartV(line: Form8621Lines): Fields[] {
  if (line.item.regime !== PficRegime.EXCESS_DISTRIBUTION) {
    throw new Error("Form 8621 staged Part V needs the section 1291 regime");
  }
  explainForm8621ExcessStatement(line);
  const page = "topmostSubform[0].Page3[0].";
  return line.excessEvents.map((event) => {
    if (event.amount_usd <= 0) {
      throw new Error(
        "Form 8621 nonexcess Part V needs a separate printable route",
      );
    }
    const fields: Fields = {
      [`${page}f3_1[0]`]: event.currency_code,
      [`${page}f3_9[0]`]: dollars(event.line16b_current_and_pre_pfic_income),
      [`${page}f3_10[0]`]: dollars(event.line16c_prior_year_tax_before_credit),
      [`${page}f3_11[0]`]: dollars(event.line16d_prior_year_foreign_tax_credit),
      [`${page}f3_12[0]`]: dollars(event.line16e_additional_tax),
      [`${page}f3_13[0]`]: dollars(event.line16f_interest),
    };
    if (event.kind === ExcessEventKind.Distribution) {
      fields[`${page}f3_2[0]`] = dollars(event.line15a_current_distributions);
      fields[`${page}f3_3[0]`] = dollars(event.line15b_prior_distributions);
      fields[`${page}f3_4[0]`] = dollars(event.line15c_prior_average);
      fields[`${page}f3_5[0]`] = dollars(event.line15d_threshold);
      fields[`${page}f3_6[0]`] = dollars(event.amount_form_currency);
      fields[`${page}f3_7[0]`] = dollars(event.amount_usd);
    } else {
      fields[`${page}f3_8[0]`] = dollars(event.amount_usd);
    }
    return fields;
  });
}

/** One page-1 and one Part V field set per event; Part VI is empty only on a declared absence. */
export function projectForm8621ParentPages(
  line: Form8621Lines,
  filer: FilerIdentity,
) {
  const source = projectForm8621ParentSource(line.item);
  if (!source.no_outstanding_section1294_election) {
    throw new Error("Form 8621 Part VI needs an outstanding election ledger");
  }
  const page1 = projectForm8621Page1(line, filer);
  const partV = projectForm8621PartV(line);
  return {
    page1,
    partV,
    partVI: {} as Fields,
    holdingPeriodStatement: partV.length > 0
      ? explainForm8621ExcessStatement(line)
      : undefined,
  };
}
