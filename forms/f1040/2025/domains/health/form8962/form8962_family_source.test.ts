import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { form8962FamilySourceInputs } from "./form8962_family_source.fixture.ts";

Deno.test("complete larger and joint tax families reconcile sourced dependent MAGI, monthly PTC and printable overflow", async () => {
  const out = await Deno.makeTempDir({ prefix: "opentax-8962-family-source-" });
  console.log("Family source archive:", out);
  for (
    const [size, region, joint, wages, household, credit, tax, refund, owed]
      of [
        [4, "TX", false, 50000, 82400, 5244, 3875, 4369, 0],
        [9, "TX", false, 170950, 203350, 15852, 30095, 0, 11243],
        [9, "AK", false, 221875, 254275, 12168, 43220, 0, 27855],
        [9, "HI", false, 201505, 233905, 13644, 37442, 0, 20785],
        [4, "TX", true, 50000, 82400, 5244, 1853, 6391, 0],
      ] as const
  ) {
    const input = form8962FamilySourceInputs(size, region, joint),
      result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending: any = normalizeAllPending(result.pending);
    assertEquals(pending.form8962.household_size, size);
    assertEquals(pending.form8962.dependents_modified_agi, 32400);
    assertEquals(pending.form8962.household_income, household);
    assertEquals(pending.form8962.total_premium_tax_credit, credit);
    assertEquals(pending.f1040.line11_agi, wages);
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(pending.f1040.line35a_refund ?? 0, refund);
    assertEquals(pending.f1040.line37_amount_owed ?? 0, owed);
    const filer = extractFilerIdentity(pending.f1040)!,
      prepared = await f1040_2025.prepareReturn!(result.pending, filer),
      origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const id = region + "-" + size + "-" + (joint ? "joint" : "single"),
      dir = out + "/" + id;
    await Deno.mkdir(dir);
    for (
      const [name, value] of Object.entries({
        "source.json": input,
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
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + "/return.xml"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
    const eligibilityEdits: Array<(p: any) => unknown> = [
      (p: any) =>
        delete p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review,
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.month = 2,
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.individuals[0].individual_ssn =
            "999999999",
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.individuals[0].employer_offer_review =
            "offer_available",
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.reviewed_on = "2025-01-01",
    ];
    if (joint) {
      eligibilityEdits.push(
        (p: any) => delete p.general.ptc_spouse_income_review,
        (p: any) => p.general.ptc_spouse_income_review.income_amounts.wages = 1,
        (p: any) => p.start.w2[0].employee_ssn = "234567890",
        (p: any) =>
          p.start.f1099int = [{ recipient_tin: "234567890", box1: 1 }],
      );
    }
    for (
      const edit of [
        ...eligibilityEdits,
        (p: any) => p.general.dependents[1].ssn = p.general.dependents[0].ssn,
        (p: any) => p.form8962.dependents_modified_agi = 0,
        (p: any) => p.f1095a.f1095as[0].covered_individual_ssns.pop(),
        (p: any) => {
          if (joint) {
            p.general.spouse_ssn = "999887777";
          } else delete p.general.dependents.at(-1).ptc_tax_return;
        },
      ]
    ) {
      const changed = structuredClone(prepared.bundle.pending);
      edit(changed);
      await assertRejects(() => f1040_2025.prepareReturn!(changed, filer));
      await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
    }
  }
});
