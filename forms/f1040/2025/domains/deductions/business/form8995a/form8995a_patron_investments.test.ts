import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import {
  patronInvestmentCases,
  patronInvestmentFixture,
} from "./form8995a_patron_investments_fixture.ts";
// Independent Decimal source proof and IRS Tax Computation Worksheet.
const patronInvestmentExpected: Record<string, number[]> = {
  "single-farm": [26226, 254111, 57826, 79632, 69632],
  "single-c-health": [23579, 398721, 108440, 117771, 107771],
  "hoh-farm": [26226, 246236, 53559, 75365, 65365],
  "hoh-c-health": [23579, 390846, 103945, 113276, 103276],
  "qss-farm": [26226, 238361, 42604, 64410, 54410],
  "qss-c-health": [23579, 382971, 77310, 86641, 76641],
  "mfs-farm": [26226, 254111, 57826, 80307, 70307],
  "mfs-c-health": [23579, 398721, 108997, 119004, 109004],
  "joint-farm": [26228, 468359, 103440, 126866, 74595],
  "joint-c-health": [23579, 612971, 153139, 164091, 111820],
  "spouse-farm": [26228, 468359, 103440, 126866, 74595],
  "spouse-c-health": [23579, 612971, 153139, 164091, 111820],
};
// Mutations intentionally cross the untrusted persisted-data boundary.
type Row = Record<string, any>;

for (const c of patronInvestmentCases) {
  test(`Patron investments ${c.name}: owned sources, final tax and complete packet`, async () => {
    const input = patronInvestmentFixture(c);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals([
      f.line13_qbi_deduction,
      Math.round(Number(f.line15_taxable_income)),
      f.line16_income_tax,
      f.line24_total_tax,
      f.line37_amount_owed,
    ], patronInvestmentExpected[c.name]);
    const filer = extractFilerIdentity(f)!;
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const pending: Row = prepared.bundle.pending;
    assertEquals(
      pending.form8995a.patron_business_source.review,
      pending.qbi_patron,
    );
    assertEquals(pending.form8995a_schedule_d, pending.form8995a);
    assert(prepared.bundle.xml.includes("<IRS8995AScheduleD "));
    const root = process.env.PATRON_INVESTMENTS_EVIDENCE;
    const dir = root ? `${root}/${c.name}` : await sys.makeTempDir();
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(
        `${dir}/source.json`,
        JSON.stringify({ input, filer, pending }, null, 2),
      );
      await fs.writeFile(`${dir}/return.xml`, prepared.bundle.xml);
      const origins: Parameters<typeof buildPdfBytes>[4] = [];
      await fs.writeFile(
        `${dir}/return.pdf`,
        await buildPdfBytes(
          pending,
          filer,
          ".pdf-cache",
          prepared.bundle,
          origins,
        ),
      );
      await fs.writeFile(
        `${dir}/origins.json`,
        JSON.stringify(origins, null, 2),
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
      const kinds = [
        "interest-owner",
        "dividend-owner",
        "interest-reference",
        "dividend-reference",
        "interest-amount",
        "dividend-amount",
        "qualified-review",
        "capital-distribution",
        "capital-limit",
        "payer",
        "schedule-b",
        "tax-worksheet",
        "niit",
        "niit-interest",
        "niit-dividends",
        "niit-gain",
        "deduction",
      ];
      for (const kind of kinds) {
        const changed: Row = structuredClone(pending);
        const interest = changed.f1099int.f1099ints[0];
        const dividend = changed.f1099div.f1099divs[0];
        if (kind === "interest-owner") interest.recipient_tin = "999001234";
        if (kind === "dividend-owner") dividend.recipient_tin = "999001234";
        if (kind === "interest-reference") {
          interest.source_document_reference = "";
        }
        if (kind === "dividend-reference") {
          dividend.source_document_reference = "";
        }
        if (kind === "interest-amount") interest.box1++;
        if (kind === "dividend-amount") dividend.box1a++;
        if (kind === "qualified-review") {
          delete dividend.qualified_dividend_filing_review;
        }
        if (kind === "capital-distribution") dividend.box2a++;
        if (kind === "payer") interest.payer_tin = "bad";
        for (const key of ["form8995", "form8995a", "form8995a_schedule_d"]) {
          changed[key].investment_interest_sources = structuredClone(
            changed.f1099int.f1099ints,
          );
          changed[key].investment_dividend_sources = structuredClone(
            changed.f1099div.f1099divs,
          );
          if (kind === "dividend-amount") {
            changed[key].investment_dividend_totals.ordinary++;
          }
          if (kind === "capital-distribution") {
            changed[key].investment_dividend_totals
              .capital_gain_distributions++;
          }
          if (kind === "capital-limit") changed[key].net_capital_gain++;
        }
        if (kind === "schedule-b") changed.schedule_b.interest_rows[0].amount++;
        if (kind === "tax-worksheet") {
          changed.income_tax_calculation.qualified_dividends++;
        }
        if (kind === "niit") changed.form8960.line17_niit++;
        if (kind === "niit-interest") changed.form8960.line1_taxable_interest++;
        if (kind === "niit-dividends") {
          changed.form8960.line2_ordinary_dividends++;
        }
        if (kind === "niit-gain") changed.form8960.line5a_net_gain++;
        if (kind === "deduction") changed.f1040.line13_qbi_deduction++;
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, filer),
          Error,
          "",
          `${c.name}/${kind}/native`,
        );
        await assertRejects(
          () => buildPdfBytes(changed, filer, ".pdf-cache"),
          Error,
          "",
          `${c.name}/${kind}/pdf`,
        );
      }
      await fs.writeFile(
        `${dir}/checks.json`,
        JSON.stringify(
          {
            case: c.name,
            nativeRejections: kinds.length,
            pdfRejections: kinds.length,
          },
          null,
          2,
        ),
      );
    } finally {
      if (!root) await sys.remove(dir, { recursive: true });
    }
  });
}
