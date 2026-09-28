import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  allocateOtherPassivePrior4797,
  inputSchema as form8582InputSchema,
} from "../../../nodes/intermediate/forms/form8582/index.ts";
import {
  passivePropertySaleSchema,
  passiveSaleGain,
  samePassiveSale,
} from "../../../nodes/intermediate/forms/form4797/index.ts";
import {
  inputSchema as scheduleEInputSchema,
  qualifiedEntireDispositionGain,
  qualifiedEntireDispositionLoss,
} from "../../../nodes/inputs/schedule_e/index.ts";
import { z } from "zod";
import {
  assertInvestment1245FilingLinks,
  calculateInvestment1245Disposition,
  investment1245DispositionSchema,
} from "../../../nodes/intermediate/forms/form4797/investment_1245.ts";
import { transactionSchema as form8949TransactionSchema } from "../../../nodes/intermediate/forms/form8949/index.ts";

// IRS Form 4797 (2025) AcroForm field names.
// Part I  — Section 1231 gains: line 9 total.
// Part II — ordinary gains: line 18b total.
// Part III — recapture: 1245 (line 22) and 1250 (line 26c).
// Nonrecaptured 1231 loss from prior years: line 8.
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "nonrecaptured_1231_loss",
    pdfField: "topmostSubform[0].Page1[0].TableLine2[0].Row1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "section_1231_gain",
    pdfField: "topmostSubform[0].Page1[0].TableLine2[0].Row1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "ordinary_gain",
    pdfField: "topmostSubform[0].Page1[0].f1_77[0]",
  },
  ...([
    ["pdf_sale_description", 41], ["pdf_sale_acquired", 42],
    ["pdf_sale_sold", 43], ["pdf_sale_price", 44],
    ["pdf_sale_depreciation", 45], ["pdf_sale_basis", 46],
    ["pdf_sale_gain", 47],
  ] as const).map(([domainKey, n]): PdfFieldEntry => ({
    kind: "text",
    domainKey,
    pdfField: `topmostSubform[0].Page1[0].TableLine10[0].Row1[0].f1_${n}[0]`,
    ...(n === 45 ? { printZero: true } : {}),
  })),
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
      { kind: "text", domainKey: `pdf_investment_${column}_description`, pdfField: `${table1}.f2_${index * 3 + 1}[0]` },
      { kind: "text", domainKey: `pdf_investment_${column}_acquired`, pdfField: `${table1}.f2_${index * 3 + 2}[0]` },
      { kind: "text", domainKey: `pdf_investment_${column}_sold`, pdfField: `${table1}.f2_${index * 3 + 3}[0]` },
      cell("line20", "20", 13 + index),
      cell("line21", "21", 17 + index),
      cell("line22", "22", 21 + index),
      cell("line23", "23", 25 + index),
      cell("line24", "24", 29 + index),
      cell("line25a", "25a", 33 + index),
      cell("line25b", "25b", 37 + index),
    ];
  }).flat(),
  ...(["line30", "line31", "line32"] as const).map((key, index): PdfFieldEntry => ({
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
    { kind: "text", domainKey: "nameLine1", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_2[0]" },
  ],
  projectFields(fields, allPending) {
    if (fields.investment_1245_dispositions !== undefined) {
      const source = z.array(investment1245DispositionSchema).min(1).max(4)
        .parse(fields.investment_1245_dispositions);
      if (
        new Set(source.map((sale) => sale.property_id)).size !== source.length ||
        Object.entries(fields).some(([key, value]) =>
          key !== "investment_1245_dispositions" && value !== undefined &&
          value !== null && (Array.isArray(value) ? value.length > 0 : value !== 0)
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
        pdfFields[`${prefix}_line21`] = item.sale.cost_or_other_basis_plus_sale_expense;
        pdfFields[`${prefix}_line22`] = item.sale.depreciation_allowed_or_allowable;
        pdfFields[`${prefix}_line23`] = item.adjustedBasis;
        pdfFields[`${prefix}_line24`] = item.totalGain;
        pdfFields[`${prefix}_line25a`] = item.sale.depreciation_allowed_or_allowable;
        pdfFields[`${prefix}_line25b`] = item.ordinaryRecapture;
      });
      return pdfFields;
    }
    if (
      (typeof fields.recapture_1245 === "number" && fields.recapture_1245 > 0) ||
      (typeof fields.recapture_1250 === "number" && fields.recapture_1250 > 0)
    ) {
      throw new Error(
        "Form 4797 PDF needs property-level Part III source, not aggregate recapture",
      );
    }
    const passiveSales = z.array(passivePropertySaleSchema).parse(
      fields.passive_property_sales ?? [],
    );
    if (passiveSales.length === 1 &&
      passiveSales[0].entire_activity_interest_disposed === true) {
      const scheduleE = scheduleEInputSchema.parse(allPending.schedule_e ?? {});
      const activity = scheduleE.schedule_es[0];
      const entireLoss = activity
        ? qualifiedEntireDispositionLoss(activity)
        : undefined;
      const entireGain = activity
        ? qualifiedEntireDispositionGain(activity)
        : undefined;
      const gainLedger = entireGain === undefined
        ? undefined
        : form8582InputSchema.safeParse(allPending.form8582);
      if (
        scheduleE.schedule_es.length !== 1 || !activity ||
        (entireLoss === undefined && entireGain === undefined) ||
        (entireLoss !== undefined && allPending.form8582 !== undefined) ||
        (entireGain !== undefined &&
          (!gainLedger?.success ||
            gainLedger.data.activities?.length !== 1 ||
            gainLedger.data.activities?.[0]?.activity_id !== activity.activity_id ||
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
    return fields;
  },
  fields,
};
