import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  sstbZeroCases,
  sstbZeroFixture,
} from "./form8995a_sstb_zero_fixture.ts";
import {
  sstbZeroExpected as expected,
  sstbZeroExpectedNiit as expectedNiit,
} from "./form8995a_sstb_zero_expected.ts";
type Row = Record<string, any>;
for (const c of sstbZeroCases) {
  const name = c.name;
  test(`SSTB zero ${name}: sourced zero deduction and complete packet`, async () => {
    const input = sstbZeroFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    const actual = [
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      Math.round(f.line24_total_tax as number),
      f.line35a_refund ?? f.line37_amount_owed,
    ];
    assertEquals(actual, expected[name]);
    const capitalLimit = c.kind === "cap"
      ? name.startsWith("joint") ? 441800 : 221800
      : 3300;
    assertEquals(result.pending.form8995a.net_capital_gain, capitalLimit);
    assertEquals(
      Math.round(result.pending.form8960?.line17_niit as number ?? 0),
      expectedNiit[name],
    );
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const p: Row = prepared.bundle.pending;
    const root = process.env.SSTB_ZERO_EVIDENCE;
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
          `<NetCapitalGainAmt>${capitalLimit}</NetCapitalGainAmt>`,
        ),
      );
      assert(
        parentXml.includes(
          "<QualifiedBusinessIncomeDedAmt>0</QualifiedBusinessIncomeDedAmt>",
        ),
      );
      if (name === "single-rounded-qbi") {
        assert(
          parentXml.includes(
            "<QualifiedBusinessIncomeAmt>0</QualifiedBusinessIncomeAmt>",
          ),
        );
        assert(
          parentXml.includes(
            "<AllocableShareW2WagesAmt>0</AllocableShareW2WagesAmt>",
          ),
        );
        assert(
          prepared.bundle.xml.includes(
            "<ApplicablePctW2WagesAmt>1</ApplicablePctW2WagesAmt>",
          ),
        );
      }
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
          "unsourced-zero",
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
          if (kind === "unsourced-zero") {
            delete changed[key].single_sstb_schedule_c_source;
          }
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
    if (c.kind === "upper") {
      const beyond = structuredClone(input);
      beyond.w2[0].box1_wages++;
      assert(
        f1040_2025.executeReturn(beyond).diagnostics.some((d) =>
          d.severity === "error"
        ),
      );
    }
  });
}
