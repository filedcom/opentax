import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  allocateOtherPassivePrior4797,
  inputSchema as form8582InputSchema,
} from "../../../nodes/intermediate/forms/form8582/index.ts";
import {
  k1Section1231RowSchema,
  passivePropertySaleSchema,
  passiveSaleGain,
  samePassiveSale,
} from "../../../nodes/intermediate/forms/form4797/index.ts";
import {
  inputSchema as scheduleEInputSchema,
  qualifiedEntireDispositionGain,
  qualifiedEntireDispositionLoss,
  qualifiedRetainedPropertySale,
} from "../../../nodes/inputs/schedule_e/index.ts";
import { z } from "zod";
import {
  assertFullyRecapturedInvestment1245Return,
  assertInvestment1245FilingLinks,
  assertMixedInvestment1245Return,
  calculateInvestment1245Disposition,
  investment1245DispositionSchema,
} from "../../../nodes/intermediate/forms/form4797/investment_1245.ts";
import { transactionSchema as form8949TransactionSchema } from "../../../nodes/intermediate/forms/form8949/index.ts";
import { assertK1Section1231FilingLinks } from "../../../nodes/intermediate/forms/form4797/k1_1231_source.ts";
import { calculateInstallmentSale } from "../../../nodes/intermediate/forms/form6252/calculation.ts";
import { inputSchema as form6252InputSchema } from "../../../nodes/intermediate/forms/form6252/index.ts";
import { calculateLikeKindExchange } from "../../../nodes/intermediate/forms/form8824/calculation.ts";
import { inputSchema as form8824InputSchema } from "../../../nodes/intermediate/forms/form8824/index.ts";
import { box11Line10SourceSchema } from "../../../nodes/inputs/k1_partnership/box11_line10.ts";
import { appendForm4797Line10Statement } from "./f4797_line10_statement.ts";
import { appendForm4797Line2Statement } from "./f4797_line2_statement.ts";
import { form8582 as nativeForm8582 } from "../../mef/forms/f8582.ts";
import { assertSingleFilerActiveEntireLoss } from "../../form8582_active_entire_loss.ts";

// IRS Form 4797 (2025) AcroForm field names.
// Part I  — installment/exchange gain and section 1231 lines 4–9.
// Part II — ordinary gains: line 18b total.
// Part III — recapture: 1245 (line 22) and 1250 (line 26c).
// Nonrecaptured 1231 loss from prior years: line 8.
const fields: ReadonlyArray<PdfFieldEntry> = [
  ...([
    ["pdf_passive_line2_acquired", 7],
    ["pdf_passive_line2_sold", 8],
    ["pdf_passive_line2_price", 9],
    ["pdf_passive_line2_depreciation", 10],
    ["pdf_passive_line2_basis", 11],
  ] as const).map(([domainKey, n]): PdfFieldEntry => ({
    kind: "text",
    domainKey,
    pdfField: `topmostSubform[0].Page1[0].TableLine2[0].Row1[0].f1_${n}[0]`,
    ...(n === 10 ? { printZero: true } : {}),
  })),
  ...Array.from({ length: 4 }, (_, index): PdfFieldEntry[] => {
    const row = index + 1;
    const first = 6 + index * 7;
    const base = `topmostSubform[0].Page1[0].TableLine2[0].Row${row}[0]`;
    return [
      {
        kind: "text",
        domainKey: `pdf_k1_line2_${row}_description`,
        pdfField: `${base}.f1_${first}[0]`,
      },
      {
        kind: "text",
        domainKey: `pdf_k1_line2_${row}_gain`,
        pdfField: `${base}.f1_${first + 6}[0]`,
      },
    ];
  }).flat(),
  {
    kind: "text",
    domainKey: "gain_form6252",
    pdfField: "topmostSubform[0].Page1[0].f1_35[0]",
  },
  {
    kind: "text",
    domainKey: "gain_form8824",
    pdfField: "topmostSubform[0].Page1[0].f1_36[0]",
  },
  {
    kind: "text",
    domainKey: "section_1231_gain",
    pdfField: "topmostSubform[0].Page1[0].f1_38[0]",
  },
  {
    kind: "text",
    domainKey: "nonrecaptured_1231_loss",
    pdfField: "topmostSubform[0].Page1[0].f1_39[0]",
  },
  {
    kind: "text",
    domainKey: "pdf_section_1231_line9",
    pdfField: "topmostSubform[0].Page1[0].f1_40[0]",
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "ordinary_gain",
    pdfField: "topmostSubform[0].Page1[0].f1_77[0]",
  },
  ...([
    ["pdf_sale_description", 41],
    ["pdf_sale_acquired", 42],
    ["pdf_sale_sold", 43],
    ["pdf_sale_price", 44],
    ["pdf_sale_depreciation", 45],
    ["pdf_sale_basis", 46],
    ["pdf_sale_gain", 47],
  ] as const).map(([domainKey, n]): PdfFieldEntry => ({
    kind: "text",
    domainKey,
    pdfField: `topmostSubform[0].Page1[0].TableLine10[0].Row1[0].f1_${n}[0]`,
    ...(n === 45 ? { printZero: true } : {}),
  })),
  ...Array.from({ length: 3 }, (_, index): PdfFieldEntry[] => {
    const row = index + 2;
    const first = 48 + index * 7;
    return [
      {
        kind: "text",
        domainKey: `pdf_k1_line10_${row}_description`,
        pdfField:
          `topmostSubform[0].Page1[0].TableLine10[0].Row${row}[0].f1_${first}[0]`,
      },
      {
        kind: "text",
        domainKey: `pdf_k1_line10_${row}_gain`,
        pdfField: `topmostSubform[0].Page1[0].TableLine10[0].Row${row}[0].f1_${
          first + 6
        }[0]`,
      },
    ];
  }).flat(),
  {
    kind: "text",
    domainKey: "pdf_line11_loss",
    pdfField: "topmostSubform[0].Page1[0].f1_69[0]",
  },
  {
    kind: "text",
    domainKey: "pdf_line12",
    pdfField: "topmostSubform[0].Page1[0].f1_70[0]",
  },
  {
    kind: "text",
    domainKey: "pdf_line13",
    pdfField: "topmostSubform[0].Page1[0].f1_71[0]",
  },
  {
    kind: "text",
    domainKey: "pdf_line17",
    pdfField: "topmostSubform[0].Page1[0].f1_75[0]",
  },
  ...Array.from({ length: 4 }, (_, index): PdfFieldEntry[] => {
    const column = index + 1;
    const p2 = "topmostSubform[0].Page2[0]";
    const table1 = `${p2}.PartIIITable1[0].Row${column}[0]`;
    const table2 = `${p2}.PartIIITable2[0]`;
    const cell = (key: string, row: string, field: number): PdfFieldEntry => ({
      kind: "text",
      domainKey: `pdf_investment_${column}_${key}`,
      pdfField: `${table2}.Row${row}[0].f2_${field}[0]`,
    });
    return [
      {
        kind: "text",
        domainKey: `pdf_investment_${column}_description`,
        pdfField: `${table1}.f2_${index * 3 + 1}[0]`,
      },
      {
        kind: "text",
        domainKey: `pdf_investment_${column}_acquired`,
        pdfField: `${table1}.f2_${index * 3 + 2}[0]`,
      },
      {
        kind: "text",
        domainKey: `pdf_investment_${column}_sold`,
        pdfField: `${table1}.f2_${index * 3 + 3}[0]`,
      },
      cell("line20", "20", 13 + index),
      cell("line21", "21", 17 + index),
      cell("line22", "22", 21 + index),
      cell("line23", "23", 25 + index),
      cell("line24", "24", 29 + index),
      cell("line25a", "25a", 33 + index),
      cell("line25b", "25b", 37 + index),
    ];
  }).flat(),
  ...(["line30", "line31", "line32"] as const).map((
    key,
    index,
  ): PdfFieldEntry => ({
    kind: "text",
    domainKey: `pdf_investment_${key}`,
    pdfField: `topmostSubform[0].Page2[0].f2_${97 + index}[0]`,
    ...(key === "line32" ? { printZero: true } : {}),
  })),
];

export const form4797Pdf: PdfFormDescriptor = {
  pendingKey: "form4797",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4797--2025.pdf",
  filerFields: [
    {
      kind: "text",
      domainKey: "nameLine1",
      pdfField: "topmostSubform[0].Page1[0].f1_1[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_2[0]",
    },
  ],
  projectFields(fields, allPending) {
    if (fields.k1_box11_line10_rows !== undefined) {
      const rows = z.array(box11Line10SourceSchema).min(1)
        .parse(fields.k1_box11_line10_rows);
      if (
        Object.entries(fields).some(([key, value]) =>
          key !== "k1_box11_line10_rows" && value !== undefined &&
          value !== null &&
          (Array.isArray(value) ? value.length > 0 : value !== 0)
        )
      ) {
        throw new Error(
          "Form 4797 PDF code L/R line 10 rows cannot overlap another Part I/II/III source",
        );
      }
      const total = rows.reduce((sum, row) => sum + row.gain_loss, 0);
      const projected: Record<string, unknown> = {
        pdf_sale_description: `K-1 ${rows[0].code} ${rows[0].partnership_ein}`,
        pdf_sale_gain: rows[0].gain_loss,
        pdf_line17: total,
        ordinary_gain: total,
      };
      rows.slice(1, rows.length > 4 ? 3 : 4).forEach((row, index) => {
        const n = index + 2;
        projected[`pdf_k1_line10_${n}_description`] =
          `K-1 ${row.code} ${row.partnership_ein}`;
        projected[`pdf_k1_line10_${n}_gain`] = row.gain_loss;
      });
      if (rows.length > 4) {
        const overflow = rows.slice(3);
        projected.pdf_k1_line10_4_description = "See attached";
        projected.pdf_k1_line10_4_gain = overflow.reduce(
          (sum, row) => sum + row.gain_loss,
          0,
        );
        projected.pdf_line10_overflow_rows = overflow;
      }
      return projected;
    }
    if (fields.investment_1245_dispositions !== undefined) {
      const source = z.array(investment1245DispositionSchema).min(1).max(4)
        .parse(fields.investment_1245_dispositions);
      if (
        new Set(source.map((sale) => sale.property_id)).size !==
          source.length ||
        Object.entries(fields).some(([key, value]) =>
          key !== "investment_1245_dispositions" && value !== undefined &&
          value !== null &&
          (Array.isArray(value) ? value.length > 0 : value !== 0)
        )
      ) {
        throw new Error(
          "Form 4797 PDF investment source cannot overlap other Part I/II/III amounts",
        );
      }
      const calculated = source.map(calculateInvestment1245Disposition);
      const transaction = allPending.form8949?.transaction;
      const rows = transaction === undefined
        ? []
        : z.array(form8949TransactionSchema).parse(
          Array.isArray(transaction) ? transaction : [transaction],
        );
      assertInvestment1245FilingLinks(
        calculated,
        rows,
        allPending.schedule1?.line4_other_gains,
      );
      assertFullyRecapturedInvestment1245Return(calculated, allPending);
      assertMixedInvestment1245Return(calculated, allPending);
      const ordinary = calculated.reduce(
        (sum, sale) => sum + sale.ordinaryRecapture,
        0,
      );
      const totalGain = calculated.reduce(
        (sum, sale) => sum + sale.totalGain,
        0,
      );
      const pdfFields: Record<string, unknown> = {
        pdf_line13: ordinary,
        pdf_line17: ordinary,
        ordinary_gain: ordinary,
        pdf_investment_line30: totalGain,
        pdf_investment_line31: ordinary,
        pdf_investment_line32: totalGain - ordinary,
      };
      const date = (iso: string) => {
        const [year, month, day] = iso.split("-");
        return `${month}/${day}/${year}`;
      };
      calculated.forEach((item, index) => {
        const prefix = `pdf_investment_${index + 1}`;
        pdfFields[`${prefix}_description`] = item.sale.property_description;
        pdfFields[`${prefix}_acquired`] = date(item.sale.acquired_on);
        pdfFields[`${prefix}_sold`] = date(item.sale.sold_on);
        pdfFields[`${prefix}_line20`] = item.sale.gross_sales_price;
        pdfFields[`${prefix}_line21`] =
          item.sale.cost_or_other_basis_plus_sale_expense;
        pdfFields[`${prefix}_line22`] =
          item.sale.depreciation_allowed_or_allowable;
        pdfFields[`${prefix}_line23`] = item.adjustedBasis;
        pdfFields[`${prefix}_line24`] = item.totalGain;
        pdfFields[`${prefix}_line25a`] =
          item.sale.depreciation_allowed_or_allowable;
        pdfFields[`${prefix}_line25b`] = item.ordinaryRecapture;
      });
      return pdfFields;
    }
    if (
      (typeof fields.recapture_1245 === "number" &&
        fields.recapture_1245 > 0) ||
      (typeof fields.recapture_1250 === "number" && fields.recapture_1250 > 0)
    ) {
      throw new Error(
        "Form 4797 PDF needs property-level Part III source, not aggregate recapture",
      );
    }
    const passiveSales = z.array(passivePropertySaleSchema).parse(
      fields.passive_property_sales ?? [],
    );
    if (
      passiveSales.some((sale) =>
        sale.part === "I" && sale.entire_activity_interest_disposed === true
      )
    ) {
      throw new Error(
        "Form 4797 PDF Part I entire gain needs executor-owned authentication of accepted prior-year activity and zero passive-loss balance",
      );
    }
    if (
      passiveSales.length === 1 &&
      passiveSales[0].entire_activity_interest_disposed === true
    ) {
      const scheduleE = scheduleEInputSchema.parse(allPending.schedule_e ?? {});
      const activity = scheduleE.schedule_es[0];
      const entireLoss = activity
        ? qualifiedEntireDispositionLoss(activity)
        : undefined;
      const entireGain = activity
        ? qualifiedEntireDispositionGain(activity)
        : undefined;
      if (entireLoss !== undefined && activity) {
        assertSingleFilerActiveEntireLoss(activity, allPending);
      }
      const gainLedger = entireGain === undefined
        ? undefined
        : form8582InputSchema.safeParse(allPending.form8582);
      if (
        scheduleE.schedule_es.length !== 1 || !activity ||
        (entireLoss === undefined && entireGain === undefined) ||
        (entireLoss !== undefined && allPending.form8582 !== undefined &&
          allPending.form8582 !== null &&
          (!Object.hasOwn(allPending.form8582, "filing_status") ||
            Object.keys(allPending.form8582).some((key) =>
              key !== "filing_status"
            ))) ||
        (entireGain !== undefined &&
          (!gainLedger?.success ||
            gainLedger.data.activities?.length !== 1 ||
            gainLedger.data.activities?.[0]?.activity_id !==
              activity.activity_id ||
            gainLedger.data.current_4797_sale_gains?.length !== 1 ||
            gainLedger.data.current_4797_sale_gains?.[0]?.gain !==
              passiveSaleGain(passiveSales[0]) ||
            gainLedger.data.current_4797_sale_gains?.[0]
                .entire_activity_interest_disposed !== true)) ||
        !activity.passive_property_sales?.[0] ||
        !samePassiveSale(activity.passive_property_sales[0], passiveSales[0]) ||
        Object.keys(fields).some((key) =>
          key !== "passive_property_sales" &&
          key !== "disposed_properties" &&
          key !== "passive_disposed_activity_ids" &&
          !(entireGain !== undefined && key === "passive_activity_sources")
        )
      ) {
        throw new Error(
          "Form 4797 PDF entire disposition needs one linked Schedule E overall-gain or overall-loss sale",
        );
      }
      const sale = passiveSales[0];
      const date = (iso: string) => {
        const [year, month, day] = iso.split("-");
        return `${month}/${day}/${year}`;
      };
      const gain = passiveSaleGain(sale);
      return {
        pdf_sale_description: sale.property_description,
        pdf_sale_acquired: date(sale.acquired_on),
        pdf_sale_sold: date(sale.sold_on),
        pdf_sale_price: sale.gross_sales_price,
        pdf_sale_depreciation: sale.depreciation_allowed,
        pdf_sale_basis: sale.cost_or_other_basis,
        pdf_sale_gain: gain,
        pdf_line17: gain,
        ordinary_gain: gain,
      };
    }
    if (passiveSales.length === 1 && passiveSales[0].part === "I") {
      const scheduleE = scheduleEInputSchema.parse(allPending.schedule_e ?? {});
      const activity = scheduleE.schedule_es[0];
      const ledger = form8582InputSchema.safeParse(allPending.form8582);
      const sale = passiveSales[0];
      if (
        scheduleE.schedule_es.length !== 1 || !activity ||
        !qualifiedRetainedPropertySale(activity) ||
        !activity.passive_property_sales?.[0] ||
        !samePassiveSale(activity.passive_property_sales[0], sale) ||
        !ledger.success || ledger.data.activities?.length !== 1 ||
        ledger.data.activities[0].activity_id !== sale.activity_id ||
        ledger.data.current_4797_sale_gains?.length !== 1 ||
        ledger.data.current_4797_sale_gains[0].part !== "I" ||
        ledger.data.current_4797_sale_gains[0].gain !==
          passiveSaleGain(sale) ||
        fields.nonrecaptured_1231_loss !== 0 ||
        Object.keys(fields).some((key) =>
          ![
            "passive_property_sales",
            "disposed_properties",
            "passive_disposed_activity_ids",
            "passive_activity_sources",
            "nonrecaptured_1231_loss",
          ].includes(key)
        )
      ) {
        throw new Error(
          "Form 4797 PDF retained Part I sale needs its Schedule E, Form 8582 and five-year lookback sources",
        );
      }
      nativeForm8582.build(allPending.form8582!, { pending: allPending });
      const date = (iso: string) => {
        const [year, month, day] = iso.split("-");
        return `${month}/${day}/${year}`;
      };
      const gain = passiveSaleGain(sale);
      return {
        pdf_k1_line2_1_description: sale.property_description,
        pdf_passive_line2_acquired: date(sale.acquired_on),
        pdf_passive_line2_sold: date(sale.sold_on),
        pdf_passive_line2_price: sale.gross_sales_price,
        pdf_passive_line2_depreciation: sale.depreciation_allowed,
        pdf_passive_line2_basis: sale.cost_or_other_basis,
        pdf_k1_line2_1_gain: gain,
        section_1231_gain: gain,
        nonrecaptured_1231_loss: 0,
        pdf_section_1231_line9: gain,
      };
    }
    const form8582 = allPending.form8582;
    if (form8582 !== undefined) {
      const input = form8582InputSchema.parse(form8582);
      if (
        input.activities?.some((activity) =>
          activity.prior_unallowed_4797_part1 > 0 ||
          activity.prior_unallowed_4797_part2 > 0
        )
      ) {
        const allocation = allocateOtherPassivePrior4797(input);
        if (allocation.allowedPartI + allocation.allowedPartII > 0) {
          throw new Error(
            "Form 4797 PDF needs PAL property rows and Part I/II line mapping",
          );
        }
      }
    }
    if (
      Array.isArray(fields.passive_property_sales) &&
      fields.passive_property_sales.length > 0
    ) {
      throw new Error(
        "Form 4797 PDF needs property-level line 2/10 row mapping for passive sales",
      );
    }
    const k1Rows = z.array(k1Section1231RowSchema).parse(
      fields.k1_1231_rows ?? [],
    );
    const projected: Record<string, unknown> = { ...fields };
    if (k1Rows.length > 0) {
      assertK1Section1231FilingLinks(k1Rows, allPending);
      const sourceTotal = k1Rows.reduce((sum, row) => sum + row.gain_loss, 0) +
        Number(fields.gain_form6252 ?? 0) + Number(fields.gain_form8824 ?? 0);
      if (sourceTotal !== fields.section_1231_gain) {
        throw new Error(
          "Form 4797 PDF line 2 K-1 sources must reconcile to line 7",
        );
      }
      k1Rows.slice(0, k1Rows.length > 4 ? 3 : 4).forEach((row, index) => {
        const rowNumber = index + 1;
        projected[`pdf_k1_line2_${rowNumber}_description`] = row.source ===
            "partnership"
          ? `K-1 1065 ${row.source_ein}`
          : `K-1 1120-S ${row.source_ein}`;
        projected[`pdf_k1_line2_${rowNumber}_gain`] = row.gain_loss;
      });
      if (k1Rows.length > 4) {
        const overflow = k1Rows.slice(3);
        projected.pdf_k1_line2_4_description = "See attached";
        projected.pdf_k1_line2_4_gain = overflow.reduce(
          (sum, row) => sum + row.gain_loss,
          0,
        );
        projected.pdf_line2_overflow_rows = overflow;
      }
      if (sourceTotal < 0) {
        projected.pdf_line11_loss = -sourceTotal;
        projected.pdf_line17 = sourceTotal;
        projected.ordinary_gain = sourceTotal;
      }
    }
    if (typeof fields.gain_form6252 === "number" && fields.gain_form6252 > 0) {
      if (!allPending.form6252) {
        throw new Error("Form 4797 PDF line 4 needs its Form 6252 source");
      }
      const sales = form6252InputSchema.parse(allPending.form6252).f6252s;
      const gain = sales.filter((sale) => sale.is_capital_asset === false)
        .reduce((sum, sale) => sum + calculateInstallmentSale(sale).line26, 0);
      if (gain !== fields.gain_form6252) {
        throw new Error("Form 4797 PDF line 4 must match Form 6252 line 26");
      }
    }
    if (typeof fields.gain_form8824 === "number" && fields.gain_form8824 > 0) {
      if (!allPending.form8824) {
        throw new Error("Form 4797 PDF line 5 needs its Form 8824 source");
      }
      const exchange = form8824InputSchema.parse(allPending.form8824);
      if (
        exchange.gain_type !== "section_1231" ||
        calculateLikeKindExchange(exchange).line22 !== fields.gain_form8824
      ) {
        throw new Error("Form 4797 PDF line 5 must match Form 8824 line 22");
      }
    }
    const priorLoss = fields.nonrecaptured_1231_loss;
    if (typeof priorLoss === "number" && priorLoss > 0) {
      const gain = fields.section_1231_gain;
      if (typeof gain !== "number" || gain <= 0) {
        throw new Error(
          "Form 4797 PDF line 8 needs a positive section 1231 line 7 gain",
        );
      }
      if (
        gain !== Number(fields.gain_form6252 ?? 0) +
            Number(fields.gain_form8824 ?? 0) ||
        Number(fields.ordinary_gain ?? 0) !== 0 ||
        Number(fields.ordinary_gain_form4684 ?? 0) !== 0 ||
        Number(fields.recapture_form6252 ?? 0) !== 0 ||
        (Array.isArray(fields.k1_1231_rows) &&
          fields.k1_1231_rows.length > 0)
      ) {
        throw new Error(
          "Form 4797 PDF prior-loss recapture needs only linked line 4/5 section 1231 gains",
        );
      }
      const recaptured = Math.min(gain, priorLoss);
      return {
        ...projected,
        pdf_section_1231_line9: Math.max(0, gain - priorLoss),
        pdf_line12: recaptured,
        pdf_line17: recaptured,
        ordinary_gain: recaptured,
      };
    }
    return projected;
  },
  async appendSupplementalPages(document, projected, filer, allPending) {
    await appendForm4797Line2Statement(
      document,
      projected,
      filer,
      allPending,
    );
    await appendForm4797Line10Statement(document, projected, filer);
  },
  fields,
};
