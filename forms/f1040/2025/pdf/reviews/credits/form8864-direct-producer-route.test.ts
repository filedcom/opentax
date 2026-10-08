import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { buildPending } from "../../../mef/execution/pending.ts";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import {
  directAgriBiodieselPending,
  directAgriBiodieselSource,
} from "../../../../nodes/inputs/f8864/fixture.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";
import { form8864Pdf } from "../../forms/credits/f8864.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-agri-biodiesel-producer-credit"
)!;
const source = base.inputs.f8864 as typeof directAgriBiodieselSource;

Deno.test("direct Form 8864 producer source reaches full return, AMT, native and filled PDF", async () => {
  const result = f1040_2025.executeReturn(base.inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(result.pending.schedule3.line6a_total, 500);
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 500);
  assertEquals(result.pending.form6251.line3_form8864_income_exclusion, -500);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<QlfyAgriBioDieselProdAfterQty>2500</QlfyAgriBioDieselProdAfterQty>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<BiodieselRnwblAvnFuelCrAmt>500</BiodieselRnwblAvnFuelCrAmt>",
  );
  assertEquals(
    prepared.bundle.form3800Parts!.currentAmounts.find((row) =>
      row.line === "1l"
    )!.appliedCredit,
    500,
  );
  const fields = form8864Pdf.projectFields!(
    pending.f8864 as Record<string, unknown>,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(fields.line8_gallons, 2500);
  assertEquals(fields.line8, 500);
  assertEquals(fields.line11, 500);
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, prepared.bundle.xml);
    const xsd = new URL(
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await prepared.renderPdf();
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../../../.state/research/ty2025-filled-pdf-review/2026-10-05-form8864-direct-producer/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
    await Deno.writeTextFile(`${directory}return.xml`, prepared.bundle.xml);
    await Deno.writeTextFile(
      `${directory}pending.json`,
      JSON.stringify(result.pending, null, 2),
    );
  }
  assert(pdf.length > 0);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 23);

  for (
    const changed of [
      {
        ...result.pending,
        f3800: { ...result.pending.f3800, form8864_applied_credit: 499 },
      },
      {
        ...result.pending,
        form6251: {
          ...result.pending.form6251,
          line3_form8864_income_exclusion: -499,
        },
      },
      { ...result.pending, f8864: { ...source, proprietor_ssn: "222334444" } },
      {
        ...result.pending,
        schedule_c: {
          schedule_cs: [{
            ...directAgriBiodieselPending.schedule_c.schedule_cs[0],
            line_6_other_income: 499,
          }],
        },
      },
    ]
  ) {
    await assertRejects(() => f1040_2025.prepareReturn(changed, base.filer));
  }
});
