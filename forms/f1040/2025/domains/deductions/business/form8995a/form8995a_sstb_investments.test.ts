import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  sstbInvestmentCases,
  sstbInvestmentFixture,
} from "./form8995a_sstb_investments_fixture.ts";
type Row = Record<string, any>;
// Independent decimal source ledger, including a binding investment-income cap.
const expected: Record<string, number[]> = {
  "hoh-owner-only": [
    1561,
    219364,
    44959,
    46293,
    3707,
  ],
  "mfs-payroll": [
    1934,
    226866,
    49099,
    51108,
    1108,
  ],
  "primary-capped-owner-only": [
    2872,
    420178,
    88022,
    90796,
    40796,
  ],
  "primary-partial-payroll": [
    3811,
    417611,
    87201,
    93231,
    43231,
  ],
  "qss-payroll": [
    3711,
    209339,
    35652,
    36739,
    13261,
  ],
  "single-income-cap": [
    2474,
    211698,
    25490,
    30644,
    30644,
  ],
  "single-payroll": [
    1934,
    226866,
    49099,
    50433,
    433,
  ],
  "spouse-capped-payroll": [
    3890,
    419160,
    87696,
    90470,
    40470,
  ],
  "spouse-partial-owner-only": [
    2830,
    418592,
    87514,
    93544,
    43544,
  ],
};
for (const name of sstbInvestmentCases) {
  test(`SSTB investments ${name}: source limit, preferential tax and complete packet`, async () => {
    const input = await sstbInvestmentFixture(name);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      Math.round(f.line24_total_tax as number),
      f.line35a_refund ?? f.line37_amount_owed,
    ], expected[name]);
    assertEquals(
      result.pending.form8995a.net_capital_gain,
      name === "single-income-cap" ? 201800 : 3300,
    );
    assertEquals(
      Math.round(result.pending.form8960?.line17_niit as number ?? 0),
      name.startsWith("qss") ? 0 : name === "single-income-cap" ? 1137 : 247,
    );
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const p: Row = prepared.bundle.pending;
    const root = process.env.SSTB_INVESTMENT_EVIDENCE;
    const dir = root ? `${root}/${name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(
        `${dir}/source.json`,
        JSON.stringify({ input, filer, pending: p }, null, 2),
      );
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
      const origins: Parameters<typeof buildPdfBytes>[4] = [];
      await fs.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(p, filer, ".pdf-cache", prepared.bundle, origins),
      );
      await fs.writeFile(
        `${dir}/origins.json`,
        JSON.stringify(origins, null, 2),
      );
      const parentXml = prepared.bundle.xml.match(
        /<IRS8995A\b[^>]*>([\s\S]*?)<\/IRS8995A>/,
      )![1];
      assert(
        parentXml.includes(
          `<NetCapitalGainAmt>${
            name === "single-income-cap" ? 201800 : 3300
          }</NetCapitalGainAmt>`,
        ),
      );
      const xsd = await new sys.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
            import.meta.url,
          ).pathname,
          `${dir}/return.xml`,
        ],
        stdout: "piped",
        stderr: "piped",
      }).output();
      await fs.writeFile(`${dir}/xsd.log`, xsd.stderr);
      assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
      for (
        const kind of [
          "int-owner",
          "div-owner",
          "holding",
          "qualified-copy",
          "capital-copy",
          "interest-copy",
          "capital-source-amount",
          "capital-source-identity",
          "limit",
          "regular-tax",
          "wages",
          "agi",
          "business-total",
          "deduction",
          "payer",
          "review-answer",
          "worksheet",
          "duplicate-copy",
        ]
      ) {
        const changed: Row = structuredClone(p);
        if (kind === "int-owner") {
          changed.f1099int.f1099ints[0].recipient_tin = "999887777";
        }
        if (kind === "div-owner") {
          changed.f1099div.f1099divs[0].recipient_tin = "999887777";
        }
        if (kind === "holding") {
          delete changed.f1099div.f1099divs[0].qualified_dividend_filing_review;
        }
        if (kind === "qualified-copy") changed.f1099div.f1099divs[0].box1b++;
        if (kind === "capital-copy") changed.f1099div.f1099divs[0].box2a++;
        if (kind === "interest-copy") changed.f1099int.f1099ints[0].box1++;
        if (kind === "duplicate-copy") {
          changed.f1099div.f1099divs.push(
            structuredClone(changed.f1099div.f1099divs[0]),
          );
        }
        if (kind === "review-answer") {
          changed.schedule_c.schedule_cs[0].qbi_sstb_filing_review
            .qualified_dividends_zero_confirmed = true;
        }
        for (const key of ["form8995a", "form8995a_schedule_a"]) {
          // Mirror copies so ownership, holding and duplicates require a real replay.
          changed[key].investment_interest_sources = structuredClone(
            changed.f1099int.f1099ints,
          );
          changed[key].investment_dividend_sources = structuredClone(
            changed.f1099div.f1099divs,
          );
          if (kind === "review-answer") {
            changed[key].sstb_filing_details
              .qualified_dividends_zero_confirmed = true;
            changed[key].single_sstb_schedule_c_source.business
              .source_schedule_c = structuredClone(
                changed.schedule_c.schedule_cs[0],
              );
          }

          if (kind === "capital-source-amount") {
            changed[key].qbi_capital_sources[0].amount++;
          }
          if (kind === "capital-source-identity") {
            changed[key].qbi_capital_sources[0].source =
              "form8814.qualified_dividends";
          }
          if (kind === "limit") changed[key].net_capital_gain++;
        }
        if (kind === "worksheet") {
          changed.income_tax_calculation.taxable_income++;
        }
        if (kind === "regular-tax") changed.f1040.line16_income_tax++;
        if (kind === "wages") {
          changed.f1040.line1a_wages = (changed.f1040.line1a_wages ?? 0) + 1;
        }
        if (kind === "agi") changed.f1040.line11_agi++;
        if (kind === "business-total") changed.f1040.line9_total_income++;
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        if (kind === "payer") {
          changed.schedule_b.dividend_rows[0].payerName = "Unrelated payer";
        }
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          "",
          kind,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          "",
          kind,
        );
      }
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
    const reversed = structuredClone(input);
    reversed.f1099int.reverse();
    reversed.f1099div.reverse();
    const again = f1040_2025.executeReturn(reversed);
    assertEquals(again.diagnostics, []);
    assertEquals(again.pending.f1040.line24_total_tax, f.line24_total_tax);
    await f1040_2025.prepareReturn(again.pending, filer);
    for (const kind of ["owner", "duplicate", "holding", "review-answer"]) {
      const invalid = structuredClone(input);
      if (kind === "review-answer") {
        invalid.schedule_c[0].qbi_sstb_filing_review
          .qualified_dividends_zero_confirmed = true;
      }
      if (kind === "owner") invalid.f1099div[0].recipient_tin = "999887777";
      if (kind === "duplicate") {
        invalid.f1099div.push(structuredClone(invalid.f1099div[0]));
      }
      if (kind === "holding") {
        delete invalid.f1099div[0].qualified_dividend_filing_review;
      }
      let rejected = false;
      try {
        const result = f1040_2025.executeReturn(invalid);
        if (result.diagnostics.some((d) => d.severity === "error")) {
          rejected = true;
        } else {try {
            await f1040_2025.prepareReturn(result.pending, filer);
          } catch {
            rejected = true;
          }}
      } catch {
        rejected = true;
      }
      assert(rejected, kind);
    }
  });
}

test("SSTB investment review binds zero and positive qualified dividends separately from gains", async () => {
  for (
    const kind of ["interest-only", "ordinary-and-capital", "qualified-only"]
  ) {
    const input = sstbInvestmentFixture("single-payroll");
    if (kind === "interest-only") delete input.f1099div;
    else {
      for (const row of input.f1099div) {
        if (kind === "ordinary-and-capital") row.box1b = 0;
        if (kind === "qualified-only") row.box2a = 0;
      }
    }
    input.schedule_c[0].qbi_sstb_filing_review
      .qualified_dividends_zero_confirmed = kind !== "qualified-only";
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.form8995a.net_capital_gain,
      kind === "interest-only"
        ? 0
        : kind === "ordinary-and-capital"
        ? 1800
        : 1500,
    );
    await f1040_2025.prepareReturn(
      result.pending,
      extractFilerIdentity(result.pending.f1040)!,
    );
    input.schedule_c[0].qbi_sstb_filing_review
      .qualified_dividends_zero_confirmed = kind === "qualified-only";
    assert(
      f1040_2025.executeReturn(input).diagnostics.some((d) =>
        d.severity === "error"
      ),
      kind,
    );
  }
});
