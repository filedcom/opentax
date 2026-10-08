import type { FilerIdentity } from "../../../../mef/header.ts";
import {
  type Form8621Lines,
  PficRegime,
} from "../../../../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../../../../nodes/inputs/f8621/excess_distribution.ts";
import { calculateMtmDisposition } from "../../../../nodes/inputs/f8621/mtm_disposition.ts";
import { calculateSection1294PriorStatus } from "../../../../nodes/inputs/f8621/section1294.ts";
import { ty2025IrsCountryName } from "../execution/irs_country_name.ts";
import { projectForm8621ParentSource } from "../../../domains/international/form8621/form8621_parent_source.ts";
import {
  explainForm8621ExcessEvent,
  explainForm8621ExcessStatement,
} from "../../../mef/forms/international/f8621_excess_statement.ts";

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
  if (item.regime === PficRegime.EXCESS_DISTRIBUTION) {
    explainForm8621ExcessStatement(line);
  }
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
      ty2025IrsCountryName(source.corporation_address.country_code),
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
    [`${page}c1_10[0]`]: item.qef_1294_election !== undefined,
    [`${page}c1_11[0]`]: source.election_status === "mtm_new_2025",
  };
  if (section1291Amount > 0) {
    fields[`${page}f1_27[0]`] = dollars(section1291Amount);
  }
  if (item.regime === PficRegime.QEF) {
    fields[`${page}f1_28[0]`] = dollars(
      (item.qef_ordinary_income ?? 0) -
        (item.qef_ordinary_951_or_1293g_reduction ?? 0) +
        (item.qef_capital_gain ?? 0) -
        (item.qef_capital_951_or_1293g_reduction ?? 0),
    );
  }
  if (item.regime === PficRegime.MTM) {
    if (item.mtm_adjusted_basis_at_year_end === undefined) {
      throw new Error("Form 8621 Part IV needs adjusted year-end basis");
    }
    const change = item.fmv_at_year_end - item.mtm_adjusted_basis_at_year_end;
    fields[`${page}f1_29[0]`] = dollars(
      (change >= 0
        ? change
        : -Math.min(-change, item.mtm_unreversed_inclusions ?? 0)) +
        (item.mtm_dispositions ?? []).reduce(
          (sum, disposition) =>
            sum + calculateMtmDisposition(disposition).ordinary,
          0,
        ),
    );
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

/** Page 2 Part III/IV amounts from the same inputs used by the tax graph. */
export function projectForm8621Page2(
  line: Form8621Lines,
  tax?: { current: number; deferred: number },
): Fields {
  const { item } = line;
  projectForm8621ParentSource(item);
  const page = "topmostSubform[0].Page2[0].";
  if (item.regime === PficRegime.QEF) {
    const ordinary = item.qef_ordinary_income;
    const capital = item.qef_capital_gain;
    if (ordinary === undefined || capital === undefined) {
      throw new Error("Form 8621 Part III needs both QEF income amounts");
    }
    const ordinaryReduction = item.qef_ordinary_951_or_1293g_reduction ?? 0;
    const capitalReduction = item.qef_capital_951_or_1293g_reduction ?? 0;
    if (ordinaryReduction > ordinary || capitalReduction > capital) {
      throw new Error("Form 8621 Part III reduction exceeds QEF income");
    }
    const result: Fields = {
      [`${page}f2_1[0]`]: dollars(ordinary),
      [`${page}f2_2[0]`]: dollars(ordinaryReduction),
      [`${page}f2_3[0]`]: dollars(ordinary - ordinaryReduction),
      [`${page}f2_4[0]`]: dollars(capital),
      [`${page}f2_5[0]`]: dollars(capitalReduction),
      [`${page}f2_6[0]`]: dollars(capital - capitalReduction),
    };
    const election = item.qef_1294_election;
    if (election) {
      if (!tax) {
        throw new Error("Form 8621 Election B PDF needs finalized return tax");
      }
      const undistributed = election.undistributed_ordinary_earnings_usd +
        election.undistributed_capital_gain_usd;
      result[`${page}f2_7[0]`] = dollars(
        ordinary - ordinaryReduction + capital - capitalReduction,
      );
      result[`${page}f2_8[0]`] = dollars(
        election.distributions_cash_and_property_usd,
      );
      result[`${page}f2_9[0]`] = dollars(
        election.transferred_share_earnings_usd,
      );
      result[`${page}f2_10[0]`] = dollars(
        election.distributions_cash_and_property_usd +
          election.transferred_share_earnings_usd,
      );
      result[`${page}f2_11[0]`] = dollars(undistributed);
      result[`${page}f2_12[0]`] = dollars(tax.current + tax.deferred);
      result[`${page}f2_13[0]`] = dollars(tax.current);
      result[`${page}f2_14[0]`] = dollars(tax.deferred);
    }
    return result;
  }
  if (item.regime === PficRegime.MTM) {
    const basis = item.mtm_adjusted_basis_at_year_end;
    if (basis === undefined) {
      throw new Error("Form 8621 Part IV needs adjusted year-end basis");
    }
    const change = item.fmv_at_year_end - basis;
    const result: Fields = {
      [`${page}f2_15[0]`]: dollars(item.fmv_at_year_end),
      [`${page}f2_16[0]`]: dollars(basis),
      [`${page}f2_17[0]`]: dollars(change),
    };
    if (change < 0) {
      if (item.mtm_unreversed_inclusions === undefined) {
        throw new Error("Form 8621 Part IV loss needs unreversed inclusions");
      }
      result[`${page}f2_18[0]`] = dollars(item.mtm_unreversed_inclusions);
      result[`${page}f2_19[0]`] = dollars(
        -Math.min(-change, item.mtm_unreversed_inclusions),
      );
    }
    if ((item.mtm_dispositions?.length ?? 0) > 1) {
      const sales = item.mtm_dispositions ?? [];
      result[`${page}f2_20[0]`] = "Multiple";
      result[`${page}f2_21[0]`] = "Multiple";
      result[`${page}f2_22[0]`] = dollars(
        sales.reduce(
          (sum, sale) =>
            sum + Math.max(0, calculateMtmDisposition(sale).ordinary),
          0,
        ),
      );
      result[`${page}f2_23[0]`] = "Multiple";
      result[`${page}f2_24[0]`] = dollars(
        sales.reduce(
          (sum, sale) =>
            sum + Math.min(0, calculateMtmDisposition(sale).ordinary),
          0,
        ),
      );
      result[`${page}f2_25[0]`] = dollars(
        sales.reduce(
          (sum, sale) => sum + calculateMtmDisposition(sale).otherLoss,
          0,
        ),
      );
      return result;
    }
    const disposition = item.mtm_dispositions?.[0];
    if (disposition) {
      const sale = calculateMtmDisposition(disposition);
      result[`${page}f2_20[0]`] = dollars(disposition.fair_market_value_usd);
      result[`${page}f2_21[0]`] = dollars(disposition.adjusted_basis_usd);
      result[`${page}f2_22[0]`] = dollars(sale.difference);
      if (sale.difference < 0) {
        result[`${page}f2_23[0]`] = dollars(
          disposition.unreversed_inclusions_usd,
        );
        result[`${page}f2_24[0]`] = dollars(sale.ordinary);
        if (sale.otherLoss > 0) {
          result[`${page}f2_25[0]`] = dollars(sale.otherLoss);
        }
      }
    }
    return result;
  }
  return {};
}

/** The 2025 blank has one Part V per excess distribution or disposition. */
export function projectForm8621PartV(line: Form8621Lines): Fields[] {
  if (line.item.regime !== PficRegime.EXCESS_DISTRIBUTION) {
    throw new Error("Form 8621 staged Part V needs the section 1291 regime");
  }
  explainForm8621ExcessStatement(line);
  const page = "topmostSubform[0].Page3[0].";
  return line.excessEvents.filter((event) => event.amount_usd > 0).map(
    (event) => {
      const fields: Fields = {
        [`${page}f3_1[0]`]: event.currency_code,
        [`${page}f3_9[0]`]: dollars(event.line16b_current_and_pre_pfic_income),
        [`${page}f3_10[0]`]: dollars(
          event.line16c_prior_year_tax_before_credit,
        ),
        [`${page}f3_11[0]`]: dollars(
          event.line16d_prior_year_foreign_tax_credit,
        ),
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
    },
  );
}

/** Part VI has six columns per page; retained elections continue on page 4. */
export function projectForm8621PartVI(line: Form8621Lines): Fields[] {
  const parent = projectForm8621ParentSource(line.item);
  const status = parent.section1294_prior_status;
  if (!status) return [];
  const columns = calculateSection1294PriorStatus(
    status,
    line.item.company_ein_or_ref,
  );
  const pages: Fields[] = [];
  const page = "topmostSubform[0].Page4[0].";
  for (let offset = 0; offset < columns.length; offset += 6) {
    const fields: Fields = {};
    for (const [index, column] of columns.slice(offset, offset + 6).entries()) {
      const put = (row: number, value: string | number | undefined) => {
        if (value === undefined) return;
        const table = row < 4
          ? "Table_17-20[0]"
          : row < 8
          ? "Table_Lines21-24[0]"
          : "Table_Lines25-26[0]";
        const tableRow = row < 4 ? row + 2 : row < 8 ? row - 2 : row - 6;
        fields[
          `${page}${table}.Row${tableRow}[0].f4_${row * 6 + index + 1}[0]`
        ] = String(value);
      };
      put(0, `12/31/${column.taxYear}`);
      put(1, dollars(column.earnings));
      put(2, dollars(column.deferredTax));
      put(3, dollars(column.interestAtFiling));
      put(4, column.terminationDescription);
      put(
        5,
        column.earningsDistributed === undefined
          ? undefined
          : dollars(column.earningsDistributed),
      );
      put(6, column.taxDue === undefined ? undefined : dollars(column.taxDue));
      put(
        7,
        column.interestDue === undefined
          ? undefined
          : dollars(column.interestDue),
      );
      put(
        8,
        column.taxRemaining === undefined
          ? undefined
          : dollars(column.taxRemaining),
      );
      put(
        9,
        column.interestRemaining === undefined
          ? undefined
          : dollars(column.interestRemaining),
      );
    }
    pages.push(fields);
  }
  return pages;
}

/** One page 1 and one Part V set per positive event; Part VI stays empty on a declared absence. */
export function projectForm8621ParentPages(
  line: Form8621Lines,
  filer: FilerIdentity,
  tax?: { current: number; deferred: number },
) {
  const page1 = projectForm8621Page1(line, filer);
  const page2 = projectForm8621Page2(line, tax);
  const partV = line.item.regime === PficRegime.EXCESS_DISTRIBUTION
    ? projectForm8621PartV(line)
    : [];
  const positiveEventIndices = line.excessEvents.flatMap((event, index) =>
    event.amount_usd > 0 ? [index] : []
  );
  return {
    page1,
    page2,
    partV,
    partVI: projectForm8621PartVI(line),
    holdingPeriodStatements: positiveEventIndices.map((index) =>
      explainForm8621ExcessEvent(line, index)
    ),
  };
}
