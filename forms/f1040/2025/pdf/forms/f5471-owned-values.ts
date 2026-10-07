import type { F5471Item } from "../../../nodes/inputs/f5471/index.ts";
import {
  owned5471Categories,
  owned5471Category,
} from "../../form5471-owned-source.ts";
export function owned5471PdfValues(
  cfc: F5471Item,
  name: string | undefined,
  schedule: "E" | "J" | "P" | "Q",
) {
  return owned5471Categories(cfc).map((category) => {
    const s = owned5471Category(cfc, category);
    const identity = {
      filer_name: name,
      filer_tin: cfc.shareholder_tin,
      shareholder_name: name,
      shareholder_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      category,
    };
    if (schedule === "J") {
      return {
        ...identity,
        a1a: s.opening,
        a1c: s.opening,
        a3: s.current,
        a7: s.opening + s.current,
        a8: -(s.subpartF + s.gilti),
        a11: -s.section956,
        a14: s.untaxedClosing,
        eiii10: s.reclassified,
        eiii11: s.section956,
        eiii14: s.reclassified + s.section956,
        eviii8: s.gilti,
        eviii10: -s.reclassGilti,
        eviii14: s.gilti - s.reclassGilti,
        ex8: s.subpartF,
        ex10: -s.reclassSf,
        ex14: s.subpartF - s.reclassSf,
        f1a: s.opening,
        f1c: s.opening,
        f3: s.current,
        f7: s.opening + s.current,
        f14: s.opening + s.current,
        part_ii_1: 0,
        part_ii_2: 0,
        part_ii_3: 0,
        part_ii_4: 0,
      };
    }
    if (schedule === "P") {
      return {
        ...identity,
        ...Object.fromEntries(["fc", "us"].flatMap((prefix) =>
          Object.entries({
            c9: s.reclassified,
            c10: s.section956,
            c12: s.reclassified + s.section956,
            h7: s.gilti,
            h9: -s.reclassGilti,
            h12: s.gilti - s.reclassGilti,
            j7: s.subpartF,
            j9: -s.reclassSf,
            j12: s.subpartF - s.reclassSf,
            k7: s.subpartF + s.gilti,
            k10: s.section956,
            k12: s.ptepClosing,
          }).map(([k, v]) => [`${prefix}_${k}`, v])
        )),
      };
    }
    if (schedule === "Q") {
      return {
        ...identity,
        foreign_source: category !== "PAS",
        us_source: category !== "GEN",
        passive_group: category === "PAS" ? "iii" : undefined,
        unit_name: category === "PAS" ? undefined : cfc.foreign_corp_name,
        country: category === "PAS" ? undefined : cfc.country_of_incorporation,
        passive_unit_name: category !== "GEN"
          ? cfc.foreign_corp_name
          : undefined,
        passive_country: undefined,
        passive_gross: s.passiveGross,
        passive_net: s.passiveNet,
        passive_interest: s.passiveInterest,
        passive_tax: s.passiveTax,
        total_tax: s.testedTaxes + s.passiveTax,
        passive_assets: s.passiveAverageAssets,
        sales_gross: s.salesGross,
        sales_net: s.salesNet,
        sales_interest: s.salesInterest,
        tested_gross: s.testedGross,
        tested_interest: s.testedInterest,
        total_interest: s.totalInterest,
        tested_other_expenses: s.testedExpenses,
        tested_tax: s.testedTaxes,
        tested_net: s.testedNet,
        creditable_tax: s.testedTaxes,
        tested_assets: s.testedAverageAssets,
        total_gross: s.salesGross + s.passiveGross + s.testedGross,
        total_net: s.salesNet + s.passiveNet + s.testedNet,
        total_assets: s.testedAverageAssets + s.passiveAverageAssets,
      };
    }
    const e = cfc.schedule_e, passive = category === "PAS";
    return {
      ...identity,
      ...(passive ? {} : {
        payor_name: cfc.foreign_corp_name,
        payor_id: cfc.foreign_corp_ein ?? cfc.foreign_corp_reference_id,
        country: e.tax_country_code,
        foreign_year_end: e.foreign_tax_year_end.replaceAll("-", "/"),
        us_year_end: e.us_tax_year_end.replaceAll("-", "/"),
        taxable_income: e.taxable_income_local,
        local_currency: e.local_currency,
        tax_local: e.tax_local,
        rate: e.tax_conversion_rate,
        tax_usd: e.tax_usd,
        tax_functional: e.tax_functional,
      }),
      disallowed_tax: s.passiveTax,
      disallowed_payor_name: s.passiveTax ? cfc.foreign_corp_name : undefined,
      disallowed_payor_id: s.passiveTax
        ? cfc.foreign_corp_reference_id
        : undefined,
      total_tax_usd: passive ? 0 : e.tax_usd,
      total_tax_functional: passive ? 0 : e.tax_functional,
      section986_election: false,
      e1_reduction: passive ? 0 : -e.tax_usd,
    };
  });
}
