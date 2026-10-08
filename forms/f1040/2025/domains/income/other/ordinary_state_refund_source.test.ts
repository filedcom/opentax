import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import {
  ordinaryStateRefundAllZeroInputs,
  ordinaryStateRefundInputs,
  ordinaryStateRefundJointInputs,
  ordinaryStateRefundMixedZeroInputs,
  ordinaryStateRefundUnemploymentInputs,
} from "./ordinary_state_refund_source.fixture.ts";
const cases = [
  {
    label: "all-zero reviewed taxable recovery",
    inputs: ordinaryStateRefundAllZeroInputs,
    expected: [0, 75000, 59250, 7955, 3045, undefined],
    pages: 2,
  },
  {
    label: "refund and separate sourced unemployment",
    inputs: ordinaryStateRefundUnemploymentInputs,
    expected: [600, 85600, 69850, 10287, 713, 85000],
    pages: 4,
  },
  {
    label: "mixed zero-taxable third issued copy",
    inputs: ordinaryStateRefundMixedZeroInputs,
    expected: [1000, 76000, 60250, 8175, 2825, 75000],
  },
  {
    label: "one",
    inputs: () => ordinaryStateRefundInputs(1),
    expected: [600, 75600, 59850, 8087, 2913, 75000],
  },
  {
    label: "two",
    inputs: () => ordinaryStateRefundInputs(2),
    expected: [1000, 76000, 60250, 8175, 2825, 75000],
  },
  {
    label: "three",
    inputs: () => ordinaryStateRefundInputs(3),
    expected: [1300, 76300, 60550, 8241, 2759, 75000],
  },
  {
    label: "nine-copy inventory",
    inputs: () => ordinaryStateRefundInputs(9),
    expected: [1900, 76900, 61150, 8373, 2627, 75000],
  },
  {
    label: "joint same payer two recipients",
    inputs: ordinaryStateRefundJointInputs,
    expected: [1000, 116000, 84500, 9666, 5334, 115000],
  },
];
for (const c of cases) {
  Deno.test(`ordinary ${c.label} state refund retains complete source computation and correct filing`, async () => {
    const inputs = c.inputs(),
      copies = inputs.f1099g.length,
      result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const p = normalizeAllPending(result.pending),
      f = p.f1040,
      filer = extractFilerIdentity(f)!;
    assertEquals([
      p.schedule1.line1_state_refund ?? 0,
      f.line11_agi,
      f.line15_taxable_income,
      f.line24_total_tax,
      f.line35a_refund,
      p.form6251.amti,
    ], c.expected);
    assertEquals((p.f1099g.f1099gs as unknown[]).length, copies);
    const additional = c.expected[1]! -
      inputs.w2.reduce((sum, w) => sum + w.box1_wages, 0);
    assertEquals(f.line8_additional_income ?? 0, additional);
    assertEquals(p.schedule1.line10_total_additional_income ?? 0, additional);
    assertEquals(p.form6251.line11_amt ?? 0, 0);
    for (let index = 0; index < copies; index++) {
      const source = c.inputs();
      source.f1099g[index].recipient_tin = "999887777";
      const altered = f1040_2025.executeReturn(source);
      if (!altered.diagnostics.some((d) => d.severity === "error")) {
        await assertRejects(
          () => f1040_2025.prepareReturn(altered.pending, filer),
          Error,
          undefined,
          `public recipient copy${index + 1}`,
        );
      }
    }
    const prepared = await f1040_2025.prepareReturn(p, filer);
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
    await writer.write(new TextEncoder().encode(prepared.bundle.xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    assertEquals(prepared.bundle.xml.includes("<IRS6251 "), false);
    assertEquals(prepared.bundle.xml.includes("<IRS1040Schedule2 "), false);
    const doc = await PDFDocument.load(await prepared.renderPdf());
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(doc.getPageCount(), "pages" in c ? c.pages : 4);
    const mutations: [string, (v: any) => void][] = [
      [
        "Schedule1 refund total",
        (v) =>
          v.schedule1.line1_state_refund =
            (v.schedule1.line1_state_refund ?? 0) + 1,
      ],
      [
        "retained AMT refund",
        (v) =>
          v.form6251.line2b_tax_refund = (v.form6251.line2b_tax_refund ?? 0) +
            1,
      ],
      [
        "later issued recipient",
        (v) => v.f1099g.f1099gs[copies - 1].recipient_tin = "999887777",
      ],
      [
        "later taxable recovery",
        (v) =>
          v.f1099g
            .f1099gs[
              c.label === "refund and separate sourced unemployment"
                ? 0
                : copies - 1
            ].box_2_taxable_recovery_verified_amount++,
      ],
      ["invented AMT", (v) => v.form6251.line11_amt = 1],
    ];
    if (copies > 1 && c.label !== "refund and separate sourced unemployment") {
      mutations.push(
        [
          "duplicate later issuer copy",
          (v) =>
            v.f1099g.f1099gs[copies - 1].source_document_reference =
              v.f1099g.f1099gs[0].source_document_reference,
        ],
        [
          "missing later issuer copy",
          (v) => delete v.f1099g.f1099gs[copies - 1].source_document_reference,
        ],
        ["ambiguous same-owner normalized payer", (v) => {
          v.f1099g.f1099gs[copies - 1].payer_tin = v.f1099g.f1099gs[0].payer_tin
            .replaceAll("-", "");
          v.f1099g.f1099gs[copies - 1].recipient_tin =
            v.f1099g.f1099gs[0].recipient_tin;
        }],
        [
          "conflicting later combined review",
          (v) =>
            v.f1099g.f1099gs[copies - 1].box_2_recovery_workpaper_reference =
              "different prior return review",
        ],
        [
          "unsupported later recovery year",
          (v) => v.f1099g.f1099gs[copies - 1].box_3_tax_year = 2023,
        ],
      );
    }
    for (const [label, mutate] of mutations) {
      const v = structuredClone(p);
      mutate(v);
      await assertRejects(
        () => f1040_2025.prepareReturn(v, filer),
        Error,
        undefined,
        `native ${label}`,
      );
      await assertRejects(
        () => buildPdfBytes(v, filer),
        Error,
        undefined,
        `PDF ${label}`,
      );
    }
  });
}
