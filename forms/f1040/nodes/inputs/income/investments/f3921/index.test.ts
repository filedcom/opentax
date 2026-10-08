import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildStartNode, inputNodes } from "../../../../../2025/return-processing/start.ts";
import { form6251 } from "../../../../intermediate/forms/taxes/amt/form6251/index.ts";
import { form6251 as mef6251 } from "../../../../../2025/mef/forms/taxes/amt/f6251.ts";
import { form6251Pdf } from "../../../../../2025/pdf/forms/taxes/amt/f6251.ts";
import {
  assertForm3921IsoSource,
  buildIsoAmtBasisLedger,
  f3921,
  inputSchema,
  itemSchema,
} from "./index.ts";
import { FilingStatus as MefFilingStatus } from "../../../../../mef/header.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;
const exercise = {
  source_document_reference: "Issued Form 3921 copy 1",
  corporation_name: "Option Corporation",
  corporation_ein: "12-3456789",
  employee_tin: "111-22-3333",
  box1_date_option_granted: "2022-06-01",
  box2_date_option_exercised: "2025-06-02",
  box3_exercise_price_per_share: 10,
  box4_fmv_per_share: 25,
  box5_shares_transferred: 100,
  rights_transferable_and_not_subject_to_substantial_risk_on_exercise: true,
  shares_disposed_during_exercise_year: 0,
  amount_paid_for_option: 0,
} as const;

Deno.test("Form 3921 boxes 3–5 route a vested, retained ISO spread to Form 6251 line 2i", () => {
  const start = buildStartNode(inputNodes);
  const source = start.compute(ctx, { f3921: [exercise] });
  assertEquals(source.outputs[0].nodeType, "f3921");
  const copies = [exercise, {
    ...exercise,
    source_document_reference: "Issued Form 3921 copy 2",
    box3_exercise_price_per_share: 12.5,
    box4_fmv_per_share: 20,
    box5_shares_transferred: 20,
  }];
  const result = f3921.compute(ctx, { f3921s: copies });
  assertEquals(result.outputs[0].fields.iso_adjustment, 1_650);
  const amt = form6251.compute(
    ctx,
    form6251.inputSchema.parse({
      filing_status: "single",
      regular_tax_income: 200_000,
      regular_tax: 0,
      ...result.outputs[0].fields,
    }),
  );
  const filed = amt.outputs.find((row) => row.nodeType === "form6251")?.fields;
  assertEquals(filed?.iso_adjustment, 1_650);
  assertEquals(filed?.amti, 201_650);
  assertStringIncludes(
    mef6251.build(filed ?? {}, {
      filer: {
        primarySSN: "111223333",
        nameLine1: "Test Taxpayer",
        nameControl: "TAXP",
        address: {
          line1: "1 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        filingStatus: MefFilingStatus.Single,
      },
      pending: {
        f3921: {
          f3921s: copies,
          iso_amt_basis_ledger: buildIsoAmtBasisLedger({ f3921s: copies }),
        },
      },
    }),
    "<IncentiveStockOptionsAmt>1650</IncentiveStockOptionsAmt>",
  );
  assertEquals(
    form6251Pdf.fields.find((row) => row.domainKey === "iso_adjustment")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_13[0]",
  );
});

Deno.test("Form 3921 blocks a sold, unvested, or extra-cost exercise", () => {
  for (
    const change of [
      { shares_disposed_during_exercise_year: 1 },
      {
        rights_transferable_and_not_subject_to_substantial_risk_on_exercise:
          false,
      },
      { amount_paid_for_option: 50 },
    ]
  ) {
    assertEquals(
      itemSchema.safeParse({ ...exercise, ...change }).success,
      false,
    );
  }
});

Deno.test("Form 3921 rejects an exercise outside 2025 and ignores a nonpositive spread", () => {
  assertThrows(
    () =>
      f3921.compute(ctx, {
        f3921s: [{
          ...exercise,
          box2_date_option_exercised: "2024-06-02",
        }],
      }),
    Error,
    "must occur in 2025",
  );
  const belowExercisePrice = f3921.compute(ctx, {
    f3921s: [{
      ...exercise,
      box4_fmv_per_share: 8,
    }],
  });
  assertEquals(belowExercisePrice.outputs.length, 1);
  assertEquals(belowExercisePrice.outputs[0].nodeType, "f3921");
  assertEquals(
    (belowExercisePrice.outputs[0].fields.iso_amt_basis_ledger as Array<{
      amt_adjustment_cents: number;
    }>)[0].amt_adjustment_cents,
    0,
  );
});

Deno.test("retained ISO exercise emits a cent-precise regular and AMT basis lot", () => {
  const ledger = buildIsoAmtBasisLedger({ f3921s: [exercise] });
  assertEquals(ledger, [{
    tax_year: 2025,
    source_document_reference: "Issued Form 3921 copy 1",
    corporation_ein: "123456789",
    employee_tin: "111223333",
    exercise_date: "2025-06-02",
    shares_remaining: 100,
    regular_basis_cents: 100_000,
    amt_adjustment_cents: 150_000,
    amt_basis_cents: 250_000,
  }]);
  const result = f3921.compute(ctx, { f3921s: [exercise] });
  assertEquals(result.outputs[1].fields.iso_amt_basis_ledger, ledger);
});

Deno.test("Form 3921 issued copies reject duplicates and reconcile owner and amount", () => {
  const prepared = {
    f3921s: [exercise],
    iso_amt_basis_ledger: buildIsoAmtBasisLedger({ f3921s: [exercise] }),
  };
  assertEquals(
    inputSchema.safeParse({ f3921s: [exercise, exercise] }).success,
    false,
  );
  assertForm3921IsoSource(prepared, 1_500, ["111223333"]);
  assertThrows(
    () => assertForm3921IsoSource(prepared, 1_500, ["999887777"]),
    Error,
    "employee must match",
  );
  assertThrows(
    () => assertForm3921IsoSource(prepared, 1_499, ["111223333"]),
    Error,
    "must equal",
  );
  assertThrows(
    () => assertForm3921IsoSource({ f3921s: [exercise] }, 1_500, ["111223333"]),
    Error,
    "AMT basis ledger",
  );
  assertThrows(
    () => assertForm3921IsoSource(undefined, 1_500, ["111223333"]),
    Error,
    "issued Form 3921",
  );
});
