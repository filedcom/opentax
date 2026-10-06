import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  ownedCfFiledCases,
  ownedCfFiledInputs,
} from "./pdf/review-owned-cf-filed.fixture.ts";
import { normalizeAllPending } from "./pending.ts";

const single = pdfReviewFixtures.find((f) => f.id === "single-schedule-c")!;
const joint = pdfReviewFixtures.find((f) =>
  f.id === "joint-form8995a-patron-farm"
)!;
Deno.test("actual owned C/F losses retain signed whole-dollar boundaries through source, QBI, native and flattened full PDF", async () => {
  const root = ".state/research/2026-10-06-owned-cf-signed-dollars";
  await Deno.mkdir(root, { recursive: true });
  for (const row of ownedCfFiledCases) {
    const inputs = ownedCfFiledInputs(single, joint, row);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, [], row.id);
    const pending = normalizeAllPending(result.pending);
    const farmLoss = row.f < 0;
    assertEquals(
      pending.schedule1[farmLoss ? "line6_schedule_f" : "line3_schedule_c"],
      row.loss,
    );
    const sourceLoss = farmLoss
      ? (pending.schedule_f.schedule_fs as { line16_feed: number }[])[0]
        .line16_feed
      : (pending.schedule_c.schedule_cs as { line_8_advertising: number }[])[0]
        .line_8_advertising;
    assertEquals(
      sourceLoss,
      Math.round(
        ((farmLoss ? row.fGross ?? 0 : row.cGross ?? 0) -
          (farmLoss ? row.f : row.c) - (farmLoss
            ? Math.min(row.conservation ?? 0, (row.fGross ?? 0) * .25)
            : (row.meals ?? 0) * .5)) * 100,
      ) / 100,
    );
    const expectedIncome = (farmLoss ? row.c : row.loss) +
      (farmLoss ? row.loss : row.f);
    assertEquals(
      pending.schedule1.line10_total_additional_income,
      expectedIncome,
    );
    assertEquals(
      pending.f1040.line11_agi,
      expectedIncome - Number(pending.schedule1.line15_se_deduction),
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
    if (row.meals !== undefined) {
      assertStringIncludes(xml, "<MealsAndEntertainmentAmt>50</");
    }
    if (row.conservation !== undefined) {
      assertStringIncludes(xml, "<ConservationExpenseAmt>251</");
    }
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

Deno.test("owned filed C/F cent boundary rejects stale source, income and owner-QBI exports", async () => {
  const row = ownedCfFiledCases.find((row) => row.id === "farm-loss-50")!;
  const result = f1040_2025.executeReturn(
    ownedCfFiledInputs(single, joint, row),
  );
  assertEquals(result.diagnostics, []);
  const settled = normalizeAllPending(result.pending);
  const mutations: ((pending: typeof settled) => void)[] = [
    (pending) => {
      const farm =
        (pending.schedule_f.schedule_fs as { line16_feed: number }[])[0];
      farm.line16_feed = 10000.49;
    },
    (pending) => {
      pending.schedule1.line6_schedule_f = -10000;
    },
    (pending) => {
      pending.schedule1.line10_total_additional_income = 50000;
    },
    (pending) => {
      pending.f1040.line11_agi = Number(pending.f1040.line11_agi) + 1;
    },
    (pending) => {
      const farm = (pending.form8995.joint_owner_filing_rows as {
        business_reference: string;
        qbi: number;
      }[]).find((row) => row.business_reference === "Owned-Farm")!;
      farm.qbi = -10000;
    },
  ];
  const { buildPdfBytes } = await import("./pdf/builder.ts");
  for (const mutate of mutations) {
    const changed = structuredClone(settled);
    mutate(changed);
    await assertRejects(() => f1040_2025.prepareReturn!(changed, joint.filer));
    await assertRejects(() => buildPdfBytes(changed, joint.filer));
  }
});
