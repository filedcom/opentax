import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { aggregationInvestmentFixture } from "./form8995a_aggregation_investments_fixture.ts";
import {
  jointAggregationInvestmentCases,
  jointAggregationInvestmentFixture,
} from "./form8995a_aggregation_joint_investments_fixture.ts";
type Row = Record<string, any>;
// Independent decimal joint-return ledger, including short-term netting.
const expected: Record<string, number[]> = {
  "direct-primary-spouse-portfolio": [36525, 419975, 87277, 97092, 37090],
  "direct-spouse-mixed-portfolio": [37130, 417370, 86613, 96352, 36350],
  "rpe-primary-spouse-portfolio": [68747, 359253, 71348, 71709, 61709],
  "rpe-spouse-mixed-portfolio": [66250, 463750, 101285, 101722, 91102],
};
for (const c of jointAggregationInvestmentCases) {
  const name = c.name;
  test(`aggregation investments ${name}: source limit, preferential tax and complete packet`, async () => {
    const input = await jointAggregationInvestmentFixture(c);
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
    assertEquals(
      result.pending.form8995a.net_capital_gain,
      c.shortGain > 0 ? 7300 : 6300,
    );
    assertEquals(
      result.pending.form8960?.line17_niit ?? 0,
      c.shortGain > 0 ? 437 : 361,
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
    const root = process.env.AGGREGATION_JOINT_INVESTMENT_EVIDENCE;
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
          "interest-owner",
          "dividend-owner",
          "broker-owner",
          "broker-amount",
          "broker-duplicate",
          "missing-spouse",
          "changed-spouse",
          "duplicate-owner",
          "nonjoint",
          "capital-limit",
          "capital-total",
          "regular-tax",
        ]
      ) {
        const changed: Row = structuredClone(p);
        const identity = {
          ...structuredClone(filer),
          spouse: filer.spouse ? { ...filer.spouse } : undefined,
        };
        if (kind === "interest-owner") {
          changed.f1099int.f1099ints[0].recipient_tin = "999887777";
          for (const key of ["form8995a", "form8995a_schedule_b"]) {
            changed[key].investment_interest_sources[0].recipient_tin =
              "999887777";
          }
        }
        if (kind === "dividend-owner") {
          changed.f1099div.f1099divs[0].recipient_tin = "999887777";
          for (const key of ["form8995a", "form8995a_schedule_b"]) {
            changed[key].investment_dividend_sources[0].recipient_tin =
              "999887777";
          }
        }
        if (kind === "broker-owner") {
          changed.f1099b.f1099bs[0].recipient_ssn = "999887777";
        }
        if (kind === "broker-amount") changed.f1099b.f1099bs[0].proceeds++;
        if (kind === "broker-duplicate") {
          changed.f1099b.f1099bs.push(
            structuredClone(changed.f1099b.f1099bs[0]),
          );
        }
        if (kind === "missing-spouse") identity.spouse = undefined;
        if (kind === "changed-spouse") identity.spouse!.ssn = "999887777";
        if (kind === "duplicate-owner") {
          identity.spouse!.ssn = identity.primarySSN;
        }
        for (const key of ["form8995a", "form8995a_schedule_b"]) {
          if (kind === "nonjoint") changed[key].filing_status = "single";
          if (kind === "capital-limit") changed[key].net_capital_gain++;
        }
        if (kind === "capital-total") changed.f1040.line7_capital_gain++;
        if (kind === "regular-tax") changed.f1040.line16_income_tax++;
        await assertRejects(
          () => f1040_2025.prepareReturn(changed, identity),
          Error,
          "",
          kind,
        );
        await assertRejects(
          () => buildPdfBytes(changed, identity, ".pdf-cache"),
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
    reversed.f1099b.reverse();
    const again = f1040_2025.executeReturn(reversed);
    assertEquals(again.diagnostics, []);
    assertEquals(again.pending.f1040.line24_total_tax, f.line24_total_tax);
    await f1040_2025.prepareReturn(again.pending, filer);
    for (
      const kind of [
        "owner",
        "duplicate",
        "holding",
        "broker-owner",
        "spouse-owner",
      ]
    ) {
      const invalid = structuredClone(input);
      if (kind === "owner") invalid.f1099div[0].recipient_tin = "999887777";
      if (kind === "duplicate") {
        invalid.f1099div.push(structuredClone(invalid.f1099div[0]));
      }
      if (kind === "holding") {
        delete invalid.f1099div[0].qualified_dividend_filing_review;
      }
      if (kind === "broker-owner") {
        invalid.f1099b[0].recipient_ssn = "999887777";
      }
      if (kind === "spouse-owner") invalid.general.spouse_ssn = "999-88-7777";
      let rejected = false;
      try {
        const result = f1040_2025.executeReturn(invalid);
        if (result.diagnostics.some((d) => d.severity === "error")) {
          rejected = true;
        } else {try {
            await f1040_2025.prepareReturn(
              result.pending,
              extractFilerIdentity(result.pending.f1040)!,
            );
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

test("MFS aggregation cannot include the separately filing spouse's investments", async () => {
  const input = await aggregationInvestmentFixture("mfs-direct-three");
  input.f1099div[0].recipient_tin = input.general.spouse_ssn.replaceAll(
    "-",
    "",
  );
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  await assertRejects(() => f1040_2025.prepareReturn(result.pending, filer));
  await assertRejects(() => buildPdfBytes(result.pending, filer, ".pdf-cache"));
});
