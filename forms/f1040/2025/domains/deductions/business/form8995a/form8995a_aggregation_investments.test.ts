import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  aggregationInvestmentCases,
  aggregationInvestmentFixture,
} from "./form8995a_aggregation_investments_fixture.ts";
type Row = Record<string, any>;
// Independently checked decimal source ledger; QSS stays below the NIIT threshold.
const expected: Record<string, number[]> = {
  "single-direct-three": [7782, 222164, 47594, 49767, 10233],
  "joint-spouse-direct-four": [38038, 413462, 85873, 95498, 35496],
  "hoh-direct-four": [8574, 223363, 46239, 48763, 11237],
  "mfs-direct-three": [7782, 222164, 47594, 50442, 9558],
  "qss-direct-three": [9739, 204457, 34578, 36504, 23496],
  "joint-primary-rpe-phase": [68860, 356140, 70871, 71118, 61118],
  "joint-spouse-rpe-full": [66250, 458750, 100365, 100612, 89992],
  "single-rpe-income-cap": [45490, 185260, 37012, 37259, 37259],
};
for (const name of aggregationInvestmentCases) {
  test(`aggregation investments ${name}: source limit, preferential tax and complete packet`, async () => {
    const input = await aggregationInvestmentFixture(name);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line35a_refund ?? f.line37_amount_owed,
    ], expected[name]);
    assertEquals(result.pending.form8995a.net_capital_gain, 3300);
    assertEquals(
      result.pending.form8960?.line17_niit ?? 0,
      name.startsWith("qss") ? 0 : 247,
    );
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const p: Row = prepared.bundle.pending;
    if (name.includes("rpe")) {
      const source =
        input.k1_s_corp[0].rpe_aggregation_source.issued_statement_pdf;
      assertEquals(
        prepared.bundle.attachments[1].bytes,
        Uint8Array.from(atob(source.pdf_base64), (c) => c.charCodeAt(0)),
      );
    }
    const root = process.env.AGGREGATION_INVESTMENT_EVIDENCE;
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
      await fs.writeFile(
        `${dir}/annual.pdf`,
        prepared.bundle.attachments[0].bytes,
      );
      if (name.includes("rpe")) {
        await fs.writeFile(
          `${dir}/issued.pdf`,
          prepared.bundle.attachments[1].bytes,
        );
      }
      const xsd = await new sys.Command("xmllint", {
        args: [
          "--noout",
          "--schema",
          new URL(
            "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
        for (const key of ["form8995a", "form8995a_schedule_b"]) {
          if (kind === "capital-source-amount") {
            changed[key].qbi_capital_sources[0].amount++;
          }
          if (kind === "capital-source-identity") {
            changed[key].qbi_capital_sources[0].source =
              "form8814.qualified_dividends";
          }
          if (kind === "limit") changed[key].net_capital_gain++;
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
    for (const kind of ["owner", "duplicate", "holding"]) {
      const invalid = structuredClone(input);
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
