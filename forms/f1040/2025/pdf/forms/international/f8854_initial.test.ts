import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f8854, inputSchema } from "../../../../nodes/inputs/f8854/index.ts";
import { assertAttachmentCoverage } from "../../../domains/execution/attachment-coverage.ts";
import { form8854InitialCash } from "../../../domains/international/form8854/form8854_initial.fixture.ts";
import { form8992Filer } from "../../../domains/international/form8992/form8992.fixture.ts";
import { form8854 } from "../../../mef/forms/international/f8854/f8854.ts";
import { form8854InitialPdf } from "./f8854_initial.ts";

const source = form8854InitialCash;
const pending = { f8854: source };

Deno.test("initial Form 8854 cash-only source reaches native and matching PDF Sections A-B", () => {
  const parsed = inputSchema.parse(source);
  assertEquals(
    f8854.compute({ taxYear: 2025, formType: "f1040" }, parsed).outputs,
    [],
  );
  const native = form8854.build(source, { pending });
  assertStringIncludes(
    native,
    "<USIncomeTax1stYearBfrExptrtAmt>80</USIncomeTax1stYearBfrExptrtAmt>",
  );
  assertStringIncludes(native, "<CashIncludingBankDepositsGrp>");
  assertStringIncludes(native, "<NetWorthAmt>100000</NetWorthAmt>");
  const [pdf] = form8854InitialPdf.instances!(source, form8992Filer, pending);
  assertEquals(form8854InitialPdf.pageIndices!(pdf), [0, 1, 2, 3, 4]);
  assertEquals(pdf.initial_statement, true);
  assertEquals(pdf.prior_tax_2024, 80);
  assertEquals(pdf.prior_tax_2023, 0);
  assertEquals(pdf.cash_fmv, 100_000);
  assertEquals(pdf.cash_basis, 100_000);
  assertEquals(pdf.total_assets_fmv, 100_000);
  assertEquals(pdf.total_liabilities, 0);
  assertEquals(pdf.balance_sheet_net_worth, 100_000);
  assertEquals(pdf.certified_compliance, true);
  assertEquals(
    form8854InitialPdf.fields.find((entry) => entry.domainKey === "cash_fmv")
      ?.pdfField,
    "topmostSubform[0].Page2[0].Table1_SectionB[0].BodyRow1[0].f2_1[0]",
  );
  assertThrows(
    () => assertAttachmentCoverage(pending, "pdf"),
    Error,
    "authenticated",
  );
});

Deno.test("initial Form 8854 PDF rejects changed prior tax, final return, and assets", () => {
  assertThrows(
    () => form8854InitialPdf.instances!(source, form8992Filer),
    Error,
    "finalized initial return",
  );
  assertThrows(
    () =>
      form8854InitialPdf.instances!(source, form8992Filer, {
        f8854: {
          ...source,
          part_i: {
            ...source.part_i,
            telephone: { kind: "US", number: "3025550124" },
          },
        },
      }),
    Error,
    "differs from the finalized return",
  );
  assertThrows(
    () =>
      form8854InitialPdf.instances!(
        {
          ...source,
          prior_year_filed_return_sources: source
            .prior_year_filed_return_sources.map((row) =>
              row.tax_year === 2024
                ? { ...row, schedule3_line1_foreign_tax_credit: 21 }
                : row
            ),
        },
        form8992Filer,
        pending,
      ),
    Error,
  );
  const otherAsset = {
    ...source,
    balance_sheet: {
      ...source.balance_sheet,
      marketable_us_securities: {
        fair_market_value: 100,
        us_adjusted_basis: 100,
      },
    },
  };
  assertThrows(
    () =>
      form8854InitialPdf.instances!(otherAsset, form8992Filer, {
        f8854: otherAsset,
      }),
    Error,
    "cash-only",
  );
});
