import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { projectForm8992Source } from "../../form8992_source.ts";

const page = (number: number) => `topmostSubform[0].Page${number}[0].`;
const field = (
  key: string,
  number: number,
  name: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: `${page(number)}${name}`,
  printZero,
});
const p1 = (key: string, number: number, printZero = false) =>
  field(key, 1, `f1_${number}[0]`, printZero);
const p6 = (key: string, number: number, printZero = false) =>
  field(key, 6, `f6_${number}[0]`, printZero);
const partII = (key: string, path: string) =>
  field(key, 2, `Table_SchB_PartII[0].Row1[0].${path}`);
const partI = (key: string, path: string) =>
  field(key, 2, `Table_SchB_PartI[0].Row1[0].${path}`);
const scheduleC = (key: string, line: string, number: number) =>
  field(key, 3, `Table_SchC[0].Row${line}[0].f3_${number}[0]`);
const scheduleF = (
  key: string,
  section: "Assets" | "Liabilities",
  line: string,
  number: number,
) =>
  field(
    key,
    4,
    `Table_SchF_${section}[0].Row${line}[0].f4_${number}[0]`,
  );
const monthDay = (date: string) => date.slice(5).replace("-", "/");
const shortYear = (date: string) => date.slice(2, 4);
const fullDate = (date: string) =>
  date.slice(5).replace("-", "/") +
  "/" + date.slice(0, 4);

const scheduleGQuestions = [
  ["q1_foreign_partnership", 4, 1],
  ["q2_trust", 4, 2],
  ["q3a_foreign_entity_or_branch", 4, 3],
  ["q3b_different_currency_qbu", 4, 4],
  ["q4a_base_erosion", 4, 5],
  ["q5a_disallowed_267a", 5, 1],
  ["q6a_fdii", 5, 2],
  ["q7_cost_sharing", 5, 3],
  ["q8_triangular_stock", 5, 4],
  ["q9a_intangible_property", 5, 5],
  ["q10_expatriated_subsidiary", 5, 6],
  ["q11_reportable_transaction", 5, 7],
  ["q12_disqualified_901m_tax", 5, 8],
  ["q13_section909_tax", 5, 9],
  ["q14_special_exceptions", 5, 10],
  ["q15_disallowed_interest", 5, 11],
  ["q16_interest_carryforward", 5, 12],
  ["q17a_extraordinary_reduction", 5, 13],
  ["q18a_safe_haven_rate", 5, 15],
  ["q18b_outside_safe_haven_rate", 5, 16],
  ["q19a_covered_debt", 5, 17],
  ["q20a_top_up_tax", 6, 1],
  ["q21a_section304_ep", 6, 2],
] as const;

export const form5471Pdf: PdfFormDescriptor = {
  pendingKey: "f5471_parent",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5471--2025.pdf",
  // The direct sole owner is both Category 4 and 5a.
  pageIndices: () => [0, 1, 2, 3, 4, 5],
  fields: [
    field("cfc_begin_md", 1, "PgHeader[0].f1_1[0]"),
    field("cfc_begin_year", 1, "PgHeader[0].f1_2[0]"),
    field("cfc_end_md", 1, "PgHeader[0].f1_3[0]"),
    field("cfc_end_year", 1, "PgHeader[0].f1_4[0]"),
    field("shareholder_name", 1, "Address[0].f1_5[0]"),
    field("filer_street", 1, "Address[0].f1_6[0]"),
    field("filer_line2", 1, "Address[0].f1_7[0]"),
    field("filer_city", 1, "Address[0].f1_8[0]"),
    field("filer_state", 1, "Address[0].f1_9[0]"),
    field("filer_zip", 1, "Address[0].f1_10[0]"),
    p1("shareholder_tin", 11),
    {
      kind: "checkbox",
      domainKey: "category4",
      pdfField: `${page(1)}c1_6[0]`,
    },
    {
      kind: "checkbox",
      domainKey: "category5a",
      pdfField: `${page(1)}c1_7[0]`,
    },
    p1("voting_percent", 12),
    p1("filer_begin_md", 13),
    p1("filer_begin_year", 14),
    p1("filer_end_md", 15),
    p1("filer_end_year", 16),
    p1("cfc_name_address", 30),
    p1("cfc_ein", 31),
    p1("cfc_reference_id", 32),
    p1("incorporation_country", 34),
    p1("incorporation_date", 35),
    p1("principal_country", 36),
    p1("activity_code", 37),
    p1("activity_description", 38),
    p1("functional_currency", 39),
    p1("statutory_agent", 43),
    p1("books_custodian", 44),
    field("stock_class", 1, "Table_SchA[0].Row1[0].f1_45[0]"),
    field("total_shares_begin", 1, "Table_SchA[0].Row1[0].f1_46[0]"),
    field("total_shares_end", 1, "Table_SchA[0].Row1[0].f1_47[0]"),
    partI("shareholder_detail", "f2_1[0]"),
    partI("stock_class", "Row1b[0].f2_2[0]"),
    partI("shares_begin", "Row1c[0].f2_6[0]"),
    partI("shares_end", "Row1d[0].f2_10[0]"),
    partI("pro_rata_subpart_f_percent", "f2_14[0]"),
    partII("shareholder_detail", "f2_72[0]"),
    partII("stock_class", "Row1b[0].f2_73[0]"),
    partII("shares_begin", "Row1c[0].f2_77[0]"),
    partII("shares_end", "Row1d[0].f2_81[0]"),
    ...([
      ["c_sales", "1a", 1],
      ["c_net_sales", "1c", 5],
      ["c_cogs", "2", 7],
      ["c_gross_profit", "3", 9],
      ["c_interest_income", "5", 13],
      ["c_total_income", "10", 27],
      ["c_interest_expense", "13", 35],
      ["c_depreciation", "14", 37],
      ["c_total_deductions", "18", 45],
      ["c_pre_tax_income", "19", 47],
      ["c_current_income_tax", "21a", 51],
      ["c_net_income", "22", 55],
    ] as const).flatMap(([key, line, first]) => [
      scheduleC(key, line, first),
      scheduleC(key, line, first + 1),
    ]),
    scheduleF("f_cash_begin", "Assets", "1", 1),
    scheduleF("f_cash_end", "Assets", "1", 2),
    scheduleF("f_gross_assets_begin", "Assets", "9a", 19),
    scheduleF("f_gross_assets_end", "Assets", "9a", 20),
    scheduleF("f_accum_depreciation_begin", "Assets", "9b", 21),
    scheduleF("f_accum_depreciation_end", "Assets", "9b", 22),
    scheduleF("f_total_assets_begin", "Assets", "14", 39),
    scheduleF("f_total_assets_end", "Assets", "14", 40),
    scheduleF("f_common_stock_begin", "Liabilities", "20b", 53),
    scheduleF("f_common_stock_end", "Liabilities", "20b", 54),
    scheduleF("f_retained_begin", "Liabilities", "22", 57),
    scheduleF("f_retained_end", "Liabilities", "22", 58),
    scheduleF("f_total_equity_begin", "Liabilities", "24", 61),
    scheduleF("f_total_equity_end", "Liabilities", "24", 62),
    ...scheduleGQuestions.map(([domainKey, pdfPage, question]) => ({
      kind: "checkboxWhen" as const,
      domainKey,
      pdfField: `${page(pdfPage)}${
        pdfPage === 4 && question === 1
          ? "TagCorrectingSubform[0]."
          : pdfPage === 5 && question === 1
          ? "TagCorrectionSubform[0]."
          : ""
      }c${pdfPage}_${question}[1]`,
      whenValue: "false",
    })),
    p6("shareholder_name", 8),
    p6("shareholder_tin", 9),
    p6("line1a", 10),
    p6("line1b", 11),
    p6("line1c", 12),
    p6("line1d", 13),
    p6("line1e", 14),
    p6("line1f", 15),
    p6("line1g", 16),
    p6("line1h", 17),
    p6("line2", 18),
    p6("line4", 20),
    p6("line5a", 21),
    p6("line5b", 22),
    p6("line5c", 23),
    p6("line5d", 24),
    p6("line5e", 25),
    p6("line6", 26),
    {
      kind: "checkboxWhen",
      domainKey: "income_blocked",
      pdfField: `${page(6)}c6_3[1]`,
      whenValue: "false",
    },
    {
      kind: "checkboxWhen",
      domainKey: "income_unblocked",
      pdfField: `${page(6)}c6_4[1]`,
      whenValue: "false",
    },
    {
      kind: "checkboxWhen",
      domainKey: "extraordinary_disposition_account",
      pdfField: `${page(6)}c6_5[1]`,
      whenValue: "false",
    },
    p6("line9", 31),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) throw new Error("Form 5471 PDF needs final filer identity");
    if (filer.address.foreignCountry) {
      throw new Error("Bounded Form 5471 PDF needs a U.S. filer address");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    const id = cfc.form5471_identity;
    const i = cfc.schedule_i;
    const c = cfc.schedule_c;
    const f = cfc.schedule_f;
    const grossProfit = c.gross_sales_receipts_functional -
      c.cost_of_goods_sold_functional;
    const totalIncome = grossProfit + c.interest_income_functional;
    const totalDeductions = c.interest_expense_functional +
      c.depreciation_functional;
    const preTaxIncome = totalIncome - totalDeductions;
    const netIncome = preTaxIncome - c.current_income_tax_expense_functional;
    const assetsBegin = f.cash_begin_usd +
      f.depreciable_assets_gross_begin_usd -
      f.accumulated_depreciation_begin_usd;
    const assetsEnd = f.cash_end_usd +
      f.depreciable_assets_gross_end_usd -
      f.accumulated_depreciation_end_usd;
    const a = id.foreign_address;
    const foreignAddress =
      `${a.line1}\n${a.city} ${a.postal_code}\n${a.country_code}`;
    return [{
      cfc_begin_md: monthDay(id.cfc_tax_year_begin),
      cfc_begin_year: shortYear(id.cfc_tax_year_begin),
      cfc_end_md: monthDay(id.cfc_tax_year_end),
      cfc_end_year: shortYear(id.cfc_tax_year_end),
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      filer_street: filer.address.line1,
      filer_line2: filer.address.line2,
      filer_city: filer.address.city,
      filer_state: filer.address.state,
      filer_zip: filer.address.zip,
      category5a: true,
      category4: true,
      voting_percent: cfc.ownership_percent,
      filer_begin_md: monthDay(id.filer_tax_year_begin),
      filer_begin_year: shortYear(id.filer_tax_year_begin),
      filer_end_md: monthDay(id.filer_tax_year_end),
      filer_end_year: shortYear(id.filer_tax_year_end),
      cfc_name_address: `${cfc.foreign_corp_name}\n${foreignAddress}`,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      incorporation_country: cfc.country_of_incorporation,
      incorporation_date: fullDate(id.incorporation_date),
      principal_country: id.principal_business_country_code,
      activity_code: id.principal_business_activity_code,
      activity_description: id.principal_business_activity_description,
      functional_currency: cfc.functional_currency,
      statutory_agent: `${id.statutory_agent_business_name}\n${foreignAddress}`,
      books_custodian: `${id.books_custodian_business_name}\n${foreignAddress}`,
      shareholder_detail: [
        shareholderName,
        filer.address.line1,
        filer.address.line2,
        `${filer.address.city}, ${filer.address.state} ${filer.address.zip}`,
        cfc.shareholder_tin,
      ].filter(Boolean).join("\n"),
      stock_class: id.stock_class_description,
      total_shares_begin: id.total_outstanding_shares_begin,
      total_shares_end: id.total_outstanding_shares_end,
      shares_begin: id.direct_shares_begin,
      shares_end: id.direct_shares_end,
      pro_rata_subpart_f_percent: cfc.ownership_percent,
      c_sales: c.gross_sales_receipts_functional,
      c_net_sales: c.gross_sales_receipts_functional,
      c_cogs: c.cost_of_goods_sold_functional,
      c_gross_profit: grossProfit,
      c_interest_income: c.interest_income_functional,
      c_total_income: totalIncome,
      c_interest_expense: c.interest_expense_functional,
      c_depreciation: c.depreciation_functional,
      c_total_deductions: totalDeductions,
      c_pre_tax_income: preTaxIncome,
      c_current_income_tax: c.current_income_tax_expense_functional,
      c_net_income: netIncome,
      f_cash_begin: f.cash_begin_usd,
      f_cash_end: f.cash_end_usd,
      f_gross_assets_begin: f.depreciable_assets_gross_begin_usd,
      f_gross_assets_end: f.depreciable_assets_gross_end_usd,
      f_accum_depreciation_begin: f.accumulated_depreciation_begin_usd,
      f_accum_depreciation_end: f.accumulated_depreciation_end_usd,
      f_total_assets_begin: assetsBegin,
      f_total_assets_end: assetsEnd,
      f_common_stock_begin: f.common_stock_begin_usd,
      f_common_stock_end: f.common_stock_end_usd,
      f_retained_begin: f.retained_earnings_begin_usd,
      f_retained_end: f.retained_earnings_end_usd,
      f_total_equity_begin: assetsBegin,
      f_total_equity_end: assetsEnd,
      ...Object.fromEntries(
        scheduleGQuestions.map(([key]) => [key, cfc.schedule_g[key]]),
      ),
      line1a: i.line1a,
      line1b: i.line1b,
      line1c: i.line1c,
      line1d: i.line1d,
      line1e: i.line1e,
      line1f: i.line1f,
      line1g: i.line1g,
      line1h: i.line1h,
      line2: i.line2_us_property,
      line4: i.line4_factoring,
      line5a: i.line5a_eligible_dividends,
      line5b: i.line5b_extraordinary_disposition,
      line5c: i.line5c_extraordinary_reduction,
      line5d: i.line5d_hybrid_dividends,
      line5e: i.line5e_other_dividends,
      line6: i.line6_exchange_gain_or_loss,
      income_blocked: i.income_blocked,
      income_unblocked: i.income_unblocked,
      extraordinary_disposition_account: i.extraordinary_disposition_account,
      line9: i.hybrid_deduction_accounts,
    }];
  },
};
