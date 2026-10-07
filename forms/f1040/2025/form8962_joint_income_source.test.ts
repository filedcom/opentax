import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { form8962JointIncomeSources } from "./form8962_joint_income.fixture.ts";
Deno.test("Owned joint income inventory reaches household MAGI, Medicare, native and printed return", async () => {
  const out = await Deno.makeTempDir({
    prefix: "opentax-8962-joint-income-final-",
  });
  console.log("Joint income source archive:", out);
  for (
    const [kind, agi, household, ptc, tax, payments, refund, owed] of [
      ["low", 50000, 82400, 5244, 1853, 8244, 6391, 0],
      ["high", 251000, 283400, 7224, 38383, 32224, 0, 6159],
      ["mixed", 51950, 84550, 4944, 2048, 8094, 6046, 0],
      ["retirement-capital", 52500, 84900, 4860, 2103, 8060, 5957, 0],
    ] as const
  ) {
    const source = form8962JointIncomeSources(kind),
      result = f1040_2025.executeReturn(source);
    assertEquals(result.diagnostics, []);
    const pending: any = normalizeAllPending(result.pending);
    assertEquals(pending.f1040.line11_agi, agi);
    assertEquals(pending.form8962.household_income, household);
    assertEquals(pending.form8962.total_premium_tax_credit, ptc);
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(pending.f1040.line33_total_payments, payments);
    assertEquals(pending.f1040.line35a_refund ?? 0, refund);
    assertEquals(pending.f1040.line37_amount_owed ?? 0, owed);
    if (kind === "high") {
      assertEquals(pending.form8959.line7_wage_tax, 9);
    }
    const filer = extractFilerIdentity(pending.f1040)!,
      prepared = await f1040_2025.prepareReturn!(result.pending, filer),
      origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
        prepared.bundle.pending,
        filer,
        ".pdf-cache",
        prepared.bundle,
        origins,
      ),
      dir = out + "/" + kind;
    await Deno.mkdir(dir);
    for (
      const [name, value] of Object.entries({
        "source.json": source,
        "pending.json": pending,
        "prepared.json": prepared.bundle.pending,
        "carry.json": result.carryforwards,
        "origins.json": origins,
      })
    ) {
      await Deno.writeTextFile(
        dir + "/" + name,
        JSON.stringify(value, null, 2),
      );
    }
    await Deno.writeFile(dir + "/return.pdf", pdf);
    await Deno.writeTextFile(dir + "/return.xml", prepared.bundle.xml);
    const xsd = new URL(
      "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + "/return.xml"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    const edits: Array<(p: any) => void> = [
      (p) => {
        delete p.general.ptc_joint_income_review;
      },
      (p) => {
        p.general.ptc_joint_income_review.owners[1].income_amounts.wages = 0;
      },
      (p) => {
        p.start.w2[1].employee_ssn = "345678901";
      },
      (p) => {
        p.w2.w2s[1].box1_wages -= 1;
      },
      (p) => {
        p.start.w2[1].tax_year = 2024;
      },
      (p) => {
        p.general.ptc_joint_income_review.sources.pop();
      },
      (p) => {
        p.general.spouse_ssn = "345678901";
      },
      (p) => {
        p.f1040.line11_agi += 1;
      },
      (p) => {
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.individuals[1].employer_offer_review =
            "offer_available";
      },
      (p) => {
        p.start.ssa1099 = [{ box5_net_benefits: 1000 }];
      },
    ];
    const deletionFields: Record<string, [string, string[]]> = {
      w2: ["w2s", [
        "box1_wages",
        "employer_name",
        "employer_ein",
        "box5_medicare_wages",
        "box6_medicare_withheld",
      ]],
      f1099int: ["f1099ints", [
        "box1",
        "box8",
        "box4",
        "account_number",
        "payer_name",
        "payer_tin",
      ]],
      f1099oid: ["f1099oids", [
        "box1_oid",
        "box4_federal_withheld",
        "account_number",
        "payer_name",
        "payer_tin",
      ]],
      f1099div: ["f1099divs", [
        "box1a",
        "box4",
        "account_number",
        "payerName",
        "payerTin",
      ]],
      f1099g: ["f1099gs", [
        "box_1_unemployment",
        "box_4_federal_withheld",
        "account_number",
        "payer_name",
        "payer_tin",
      ]],
      f1099r: ["f1099rs", [
        "box1_gross_distribution",
        "box2a_taxable_amount",
        "box4_federal_withheld",
        "account_number",
        "payer_address_line1",
        "payer_name",
        "payer_ein",
      ]],
      f1099b: ["f1099bs", [
        "proceeds",
        "cost_basis",
        "federal_withheld",
        "payer_tin",
        "transaction_id",
      ]],
    };
    for (const [node, [field, properties]] of Object.entries(deletionFields)) {
      if (!source[node]) continue;
      for (const property of properties) {
        if (!(property in source[node][0])) continue;
        edits.push((p) => {
          delete p[node][field][0][property];
        });
      }
    }
    // A rewritten ordinary review copy cannot make the unchanged retained
    // source agree with a substituted entered amount.
    edits.push((p) => {
      p.start.w2[0].box1_wages -= 1;
      p.general.ptc_joint_income_review.sources[0].source_record.box1_wages -=
        1;
      p.start.general.ptc_joint_income_review = structuredClone(
        p.general.ptc_joint_income_review,
      );
    });
    for (const edit of edits) {
      const changed = structuredClone(prepared.bundle.pending);
      edit(changed);
      await assertRejects(() => f1040_2025.prepareReturn!(changed, filer));
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
    const entered = structuredClone(source);
    entered.general.ptc_joint_income_review.owners[1].owner_ssn = "345678901";
    assertEquals(
      f1040_2025.executeReturn(entered).diagnostics.length > 0,
      true,
    );
  }
});
