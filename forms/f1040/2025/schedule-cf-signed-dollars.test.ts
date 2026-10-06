import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  mixedOwnerCases,
  ownedFarmInputs,
} from "./pdf/review-schedule-se-farm-owner.fixture.ts";
import { normalizeAllPending } from "./pending.ts";

const single = pdfReviewFixtures.find((f) => f.id === "single-schedule-c")!;
const joint = pdfReviewFixtures.find((f) =>
  f.id === "joint-form8995a-patron-farm"
)!;
const cases = [
  { id: "farm-loss-49", c: 60000, f: -10000.49, loss: -10000 },
  { id: "farm-loss-50", c: 60000, f: -10000.50, loss: -10001 },
  { id: "farm-loss-51", c: 60000, f: -10000.51, loss: -10001 },
  { id: "business-loss-49", c: -300.49, f: 800, loss: -300 },
  { id: "business-loss-50", c: -300.50, f: 800, loss: -301 },
  { id: "farm-loss-small-half", c: 60000, f: -.50, loss: -1 },
];
Deno.test("actual owned C/F losses retain signed whole-dollar boundaries through source, QBI, native and flattened full PDF", async () => {
  const root = ".state/research/2026-10-06-owned-cf-signed-dollars";
  await Deno.mkdir(root, { recursive: true });
  for (const row of cases) {
    const inputs = ownedFarmInputs(
      single,
      joint,
      {
        ...mixedOwnerCases[0],
        c: row.c,
        f: row.f,
        recipient: "T",
        wages: [],
      } as unknown as typeof mixedOwnerCases[number],
    );
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], row.id);
    const pending = normalizeAllPending(result.pending);
    const farmLoss = row.f < 0;
    assertEquals(
      pending.schedule1[farmLoss ? "line6_schedule_f" : "line3_schedule_c"],
      farmLoss ? row.f : row.c,
    );
    const qbi = pending.form8995.joint_owner_filing_rows as {
      business_reference: string;
      qbi: number;
    }[];
    assertEquals(
      qbi.find((q) =>
        q.business_reference === (farmLoss ? "Owned-Farm" : "Owned-0")
      )?.qbi,
      row.loss,
    );
    const prepared = await f1040_2025.prepareReturn!(
      result.pending,
      joint.filer,
    );
    const xml = prepared.bundle.xml;
    assertStringIncludes(
      xml,
      `<${
        farmLoss ? "NetFarmProfitLossAmt" : "NetProfitOrLossAmt"
      }>${row.loss}</`,
    );
    assertStringIncludes(
      xml,
      `<${
        farmLoss ? "NetFarmProfitLossAmt" : "BusinessIncomeLossAmt"
      }>${row.loss}</`,
    );
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const pdf = await prepared.renderPdf();
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    const path = `${root}/${row.id}`;
    await Deno.writeTextFile(`${path}.json`, JSON.stringify(inputs, null, 2));
    await Deno.writeTextFile(`${path}.xml`, xml);
    await Deno.writeFile(`${path}.pdf`, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", `${path}.pdf`, "-"],
      stdout: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, String(row.loss));
    await Deno.writeTextFile(`${path}.txt`, text);
    console.log(
      JSON.stringify({
        id: row.id,
        pages: doc.getPageCount(),
        loss: row.loss,
        agi: pending.f1040.line11_agi,
      }),
    );
  }
});
