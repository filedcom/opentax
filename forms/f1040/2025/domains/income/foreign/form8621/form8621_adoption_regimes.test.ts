import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { createHash } from "node:crypto";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { PficRegime } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { ExcessEventKind } from "../../../../../nodes/inputs/income/foreign/f8621/excess_distribution.ts";
import { form8621QefSourceInputs } from "./form8621_qef.fixture.ts";

const base = pdfReviewFixtures.find((f) =>
  f.id === "single-reviewed-adoption-credit"
)!;
const copy = (document_id: string, text: string) => ({
  document_id,
  sha256: createHash("sha256").update(text).digest("hex"),
  bytes_base64: btoa(text),
});
function holdings(): Record<string, unknown>[] {
  const qef = form8621QefSourceInputs({}).f8621[0];
  const { qef_1294_election: _election, ...ordinary } = qef;
  const {
    qef_annual_statement: _annual,
    qef_1294_activity_record: _activity,
    ...parent
  } = qef.parent_source;
  const common = {
    country_of_incorporation: "Ireland",
    shares_owned: 100,
    fmv_at_year_end: 20000,
  };
  const retained = [ordinary, {
    ...common,
    company_name: "Market Fund",
    company_ein_or_ref: "MTMADOPT",
    regime: PficRegime.MTM,
    mtm_adjusted_basis_at_year_end: 18000,
    mtm_unreversed_inclusions: 0,
    parent_source: {
      ...parent,
      election_status: "mtm_new_2025",
      issuer_record: copy(
        "market-issuer",
        "Synthetic Market Fund holdings 100 shares",
      ),
      mtm_year_end_value_record: {
        ...copy("market-quote", "Synthetic year-end market quote 20000"),
        quoted_value_usd: 20000,
        market_name: "Recognized Exchange",
      },
      mtm_adjusted_basis_record: {
        ...copy(
          "market-basis",
          "Synthetic adjusted basis 18000, no inclusions",
        ),
        adjusted_basis_usd: 18000,
        unreversed_inclusions_usd: 0,
      },
    },
  }, {
    ...common,
    company_name: "Disposition Fund",
    company_ein_or_ref: "SALEADOPT",
    regime: PficRegime.EXCESS_DISTRIBUTION,
    parent_source: {
      ...parent,
      election_status: "section1291_no_new_election",
      issuer_record: copy(
        "sale-issuer",
        "Synthetic 2025 holding and disposition gain 2000",
      ),
    },
    excess_events: [{
      kind: ExcessEventKind.Disposition,
      amount_usd: 2000,
      holding_period_start: "2025-01-01",
      event_date: "2025-12-15",
      first_pfic_tax_year: 2025,
      year_charges: [],
    }],
  }];
  const prior = structuredClone(retained[2]);
  Object.assign(prior, {
    company_name: "Prior Holding Fund",
    company_ein_or_ref: "PRIORADOPT",
    excess_events: [{
      kind: ExcessEventKind.Disposition,
      amount_usd: 7310,
      holding_period_start: "2024-01-01",
      event_date: "2025-12-31",
      first_pfic_tax_year: 2024,
      year_charges: [],
    }],
  });
  Object.assign(prior.parent_source, {
    shares_acquired_during_2025: false,
    acquisition_date: undefined,
    issuer_record: copy(
      "prior-issuer",
      "Synthetic 2024 holding; 2025 gain 7310",
    ),
  });
  const loss = structuredClone(retained[1]);
  Object.assign(loss, { mtm_adjusted_basis_at_year_end: 23000 });
  Object.assign(loss.parent_source, {
    mtm_adjusted_basis_record: {
      ...copy(
        "loss-basis",
        "Synthetic adjusted basis 23000; no prior inclusions",
      ),
      adjusted_basis_usd: 23000,
      unreversed_inclusions_usd: 0,
    },
  });
  return [...retained, prior, loss];
}
for (
  const [id, indexes, income, tax, finalTax] of [
    ["qef", [0], 2000, 4115, 0],
    ["mtm", [1], 2000, 4115, 0],
    ["current-disposition", [2], 2000, 4115, 0],
    ["mixed", [0, 1, 2], 6000, 4595, 0],
    ["prior-disposition", [3], 3650, 5667, 98],
    ["mtm-unavailable-loss", [4], 0, 3875, 0],
  ] as const
) {
  Deno.test(`adoption carryforward composes retained PFIC regimes: ${id}`, async () => {
    const input = structuredClone(base.inputs) as Record<string, unknown>;
    Object.assign((input.w2 as Record<string, unknown>[])[0], {
      box1_wages: 50000,
      box3_ss_wages: 50000,
      box4_ss_withheld: 3100,
      box5_medicare_wages: 50000,
      box6_medicare_withheld: 725,
    });
    const all = holdings();
    input.f8621 = indexes.map((index) => all[index]);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(pending.f1040?.line11_agi, 50000 + income);
    assertEquals(pending.f1040?.line18_total_tax_before_credits, tax);
    assertEquals(pending.schedule3?.line6c_adoption_credit, tax);
    assertEquals(result.carryforwards.adoption_credit_2025, 6000 - tax);
    assertEquals(result.pending.form8839_carryforward.used_in_origin_year, tax);
    assertEquals(pending.f1040?.line24_total_tax, finalTax);
    assertEquals(pending.f1040?.line35a_refund, 20000 - finalTax);
    assertEquals(result.pending.form8621_1294_refigure, undefined);
    if (id === "prior-disposition") {
      // 366/731 days in 2024 => 3,660 at 37%; 365/731 => 3,650 in 2025.
      // Single tax-table row 37,900-37,949 => 4,313 plus prior tax 1,354.
      // Daily interest 4/15/2025-4/15/2026 => 97.62396, filed as 98.
      assertEquals(pending.schedule2?.line17p_form8621_interest, 98);
      assertEquals(pending.f1040?.line23_other_taxes, 98);
    }
    const packet = await f1040_2025.prepareReturn(
      pending,
      base.filer,
      base.attachments!,
    );
    assertEquals(
      (packet.bundle.xml.match(/<IRS8621\s/g) ?? []).length,
      indexes.length,
    );
    assertStringIncludes(
      packet.bundle.xml,
      "<RefundableAdoptionCreditAmt>5000</RefundableAdoptionCreditAmt>",
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      base.filer,
      ".pdf-cache",
      packet.bundle,
      origins,
    );
    const out = Deno.env.get("FORM8621_REGIMES_EVIDENCE_DIR");
    if (out) {
      const dir = `${out}/${id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify({ input, pending, origins }, null, 2),
      );
      await Deno.writeTextFile(`${dir}/return.xml`, packet.bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
    const changedLedger = {
      ...pending,
      form8839_carryforward: {
        ...result.pending.form8839_carryforward,
        carryforward_amount: 6001 - tax,
      },
    };
    await assertRejects(
      () =>
        f1040_2025.prepareReturn(changedLedger, base.filer, base.attachments!),
      Error,
      "carryforward",
    );
    await assertRejects(
      () =>
        buildPdfBytes(changedLedger, base.filer, ".pdf-cache", packet.bundle),
      Error,
      "PDF source differs from the prepared MeF return",
    );
    const missingSource = structuredClone(input);
    const first = (missingSource.f8621 as {
      parent_source: { issuer_record: { bytes_base64?: string } };
    }[])[0];
    delete first.parent_source.issuer_record.bytes_base64;
    const missing = buildPending(
      f1040_2025.executeReturn(missingSource).pending,
    );
    await assertRejects(
      () => f1040_2025.prepareReturn(missing, base.filer, base.attachments!),
      Error,
      "retained source bytes",
    );
    await assertRejects(
      () => buildPdfBytes(missing, base.filer, ".pdf-cache", packet.bundle),
      Error,
      "PDF source differs from the prepared MeF return",
    );
  });
}
