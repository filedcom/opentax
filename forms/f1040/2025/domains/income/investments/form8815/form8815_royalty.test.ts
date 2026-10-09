import {
  royaltyBondCases as cases,
  royaltyBondInputs as inputsFor,
} from "./form8815_royalty.fixture.ts";
import { assertEquals, assertRejects } from "@std/assert";
import { reconcileBondRoyaltyInterest } from "./form8815_royalty_return.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";

for (const entry of cases) {
  Deno.test(`Bond MAGI refigures royalty interest before and after exclusion: ${entry.id}`, async () => {
    const inputs = inputsFor(entry);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.form8815.line9, entry.magi);
    assertEquals(pending.form8815.line14, entry.exclusion);
    assertEquals(pending.form4952.line4a, 5000 + entry.bank - entry.exclusion);
    assertEquals(pending.form4952.line8, entry.actual);
    assertEquals(pending.form4952.line7, entry.paid - entry.actual);
    assertEquals(
      result.carryforwards.investment_interest_excess_4952 ?? 0,
      entry.paid - entry.actual,
    );
    assertEquals(
      result.carryforwards.amt_investment_interest_excess_4952 ?? 0,
      entry.paid - entry.actual,
    );
    assertEquals(pending.schedule1.line5_schedule_e, 3000 - entry.actual);
    assertEquals(
      pending.f1040.line2b_taxable_interest ?? 0,
      2000 + entry.bank - entry.exclusion,
    );
    assertEquals(pending.f1040.line11_agi, entry.agi);
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line35a_refund, 20000 - entry.tax);
    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    assertEquals((prepared.bundle.xml.match(/<IRS4952[ >]/g) ?? []).length, 1);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_BOND_ROYALTY_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            expected: entry,
            origins,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const bond = pending.form8815;
    const worksheet = inputs.form8815.line9_worksheet;
    const special = worksheet.royalty_debt_special_computation!;
    const modifications = [
      { ...pending, form8815: { ...bond, line9: entry.magi + 1 } },
      {
        ...pending,
        form8815: {
          ...bond,
          line9_worksheet: {
            ...worksheet,
            royalty_debt_special_computation: undefined,
          },
        },
      },
      {
        ...pending,
        form8815: {
          ...bond,
          line9_worksheet: {
            ...worksheet,
            no_royalty_interest_special_computation: true,
          },
        },
      },
      {
        ...pending,
        form8815: {
          ...bond,
          line9_worksheet: {
            ...worksheet,
            royalty_debt_special_computation: {
              ...special,
              other_income_before_royalty_interest:
                special.other_income_before_royalty_interest + 1,
            },
          },
        },
      },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          source_8815_excluded_interest: entry.exclusion + 1,
        },
      },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          source_8815_excluded_interest: undefined,
        },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, line8: entry.actual + 1 },
      },
      {
        ...pending,
        form8815: {
          ...bond,
          line9_worksheet: {
            ...worksheet,
            royalty_debt_special_computation: {
              ...special,
              debt_trace: { ...special.debt_trace, loan_id: "another-loan" },
            },
          },
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line9_total_income: entry.agi + 1 },
      },
      {
        ...pending,
        f1099int: {
          f1099ints: inputs.f1099int.map((row, i) =>
            i === 0 ? { ...row, recipient_tin: "999887777" } : row
          ),
        },
      },
    ];
    for (const altered of modifications) {
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(altered, filer, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
  });
}

Deno.test("Combined royalty/bond review rejects source omissions at public preparation", async () => {
  const base = inputsFor(cases[2]);
  const worksheet = base.form8815.line9_worksheet;
  const variants = [
    {
      ...base,
      form8815: {
        ...base.form8815,
        line9_worksheet: {
          ...worksheet,
          no_royalty_interest_special_computation: true,
          royalty_debt_special_computation: undefined,
        },
      },
    },
    {
      ...base,
      form8815: {
        ...base.form8815,
        line9_worksheet: {
          ...worksheet,
          other_1040_and_schedule1_income: 100000,
        },
      },
    },
    { ...base, form4952: undefined },
    {
      ...base,
      f1099div: [{
        payerName: "Dividend Fund",
        recipient_tin: "111223333",
        box1a: 1000,
        isNominee: false,
        box11: false,
        investment_property_for_form4952: false,
      }],
    },
    {
      ...base,
      f1099int: base.f1099int.map((row) => ({
        ...row,
        investment_property_for_form4952: false,
      })),
    },
  ];
  for (const input of variants) {
    await assertRejects(async () => {
      const result = f1040_2025.executeReturn(input);
      if (result.diagnostics.length) throw new Error("Rejected source input");
      const pending = normalizeAllPending(result.pending);
      await f1040_2025.prepareReturn(
        result.pending,
        extractFilerIdentity(pending.f1040),
      );
    }, Error);
  }
  const result = f1040_2025.executeReturn(base);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  for (
    const key of [
      "k1_partnership",
      "k1_s_corp",
      "k1_trust",
      "f1099div",
      "f1099b",
      "f8949",
      "f8814",
    ]
  ) {
    // Exercise the inventory guard directly, so malformed source builders cannot mask it.
    await assertRejects(
      async () => {
        reconcileBondRoyaltyInterest({ ...pending, [key]: {} });
      },
      Error,
      "complete supported investment-income inventory",
    );
  }
});
