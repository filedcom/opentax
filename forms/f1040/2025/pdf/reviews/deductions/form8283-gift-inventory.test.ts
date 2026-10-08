import { income_tax_calculation } from "../../../../nodes/intermediate/worksheets/income_tax_calculation/index.ts";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../builder.ts";
import { form8283Pdf } from "../../forms/deductions/f8283.ts";
import { reviewedGiftInventory } from "./form8283-gift-inventory.fixture.ts";

for (
  const [
    count,
    sameDonee,
    mixed,
    smallGrouped,
    withSectionA,
    jointOwners,
    sharedAppraisal,
    withDividendIncome,
  ] of [
    [3, false, false, false, false],
    [9, false, false, false, false],
    [3, true, true, false, false],
    [3, false, false, true, false],
    [6, true, true, true, true, false],
    [3, true, false, false, false, true, false],
    [3, false, false, false, false, false, true],
    [3, false, false, false, false, false, false, true],
  ] as const
) {
  Deno.test(`complete reviewed8283 inventory ${count} sameDonee${sameDonee} mixed${mixed} small${smallGrouped} sectionA${withSectionA} joint${jointOwners} dividends${withDividendIncome}`, async () => {
    const source = await reviewedGiftInventory(
      count,
      sameDonee,
      mixed,
      smallGrouped,
      withSectionA,
      jointOwners,
      sharedAppraisal,
    );
    const publicInputs = {
      ...source.inputs,
      ...(withDividendIncome
        ? {
          schedule_b_part_iii: {
            foreign_accounts_question: false,
            foreign_trust_question: false,
          },
          f1099div: [{
            payerName: "Example Equity Fund",
            payerTin: "246810121",
            recipient_tin: "111223333",
            account_number: "DIV-OWNED-2025",
            source_document_reference:
              "Issued Example Equity Fund2025 Form1099DIV accountDIV-OWNED-2025",
            isNominee: false,
            box11: false,
            box1a: 2000,
            box1b: 1000,
            box2a: 1000,
            qualified_dividend_filing_review: {
              ex_dividend_date: "2025-06-15",
              qualified_held_days_in_121_day_window: 121,
              diminished_risk_days_excluded: 0,
              ordinary_stock_rule_confirmed: true,
              eligible_issuer_and_no_disqualified_dividend_confirmed: true,
              no_related_payment_obligation_confirmed: true,
              review_reference:
                "Owned ordinary-stock purchase/holding and eligible fund distribution records DIV-OWNED-2025",
              reviewed_on: "2025-09-01",
            },
          }],
        }
        : {}),
    };
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      publicInputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    const claim = (smallGrouped ? 2000 : 6000) * count +
      100 * count * (count + 1) / 2 + (withSectionA ? 12000 : 0);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      Math.min(claim, 50000),
    );
    assertEquals(
      result.pending.f1040.line12e_itemized_deductions,
      Math.min(claim, 50000) + 24000,
    );
    if (withDividendIncome) {
      assertEquals(result.pending.f1040.line11_agi, 103000);
      assertEquals(result.pending.f1040.line15_taxable_income, 60400);
      // QDCGTW ordinary58400 usesTaxTable58425→7768;2000 preference*.15=300;tax8068.
      assertEquals(result.pending.f1040.line16_income_tax, 8068);
    }
    const pending = buildPending(result.pending);
    if (withDividendIncome) {
      for (const key of ["box1a", "box1b", "box2a"] as const) {
        const changed = structuredClone(pending);
        changed.f1099div!.f1099divs[0][key]! += 1;
        assertThrows(
          () =>
            form8283Pdf.instances!(
              changed.f8283!,
              source.filer,
              changed as unknown as Record<string, Record<string, unknown>>,
            ),
          Error,
          "Reviewed",
          key,
        );
        await assertRejects(
          () =>
            buildMefBundle(changed, {
              filer: source.filer,
              attachments: source.attachments,
            }),
          Error,
          undefined,
          key,
        );
      }
    }

    const bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments: source.attachments,
    });
    assertEquals(
      (bundle.xml.match(/<IRS8283\b/g) ?? []).length,
      count + (withSectionA ? 1 : 0),
    );
    assertEquals(
      bundle.attachments.length,
      6 * count - (sharedAppraisal ? count - 1 : 0),
    );
    const copies = form8283Pdf.instances!(
      pending.f8283!,
      source.filer,
      pending as unknown as Record<string, Record<string, unknown>>,
    );
    assertEquals(
      copies.filter((p) => p.section_b_claim !== undefined).map((p) =>
        p.section_b_claim
      ),
      source.items.map((i) => i.deduction_claimed),
    );
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      source.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const parsed = await PDFDocument.load(pdf);
    assertEquals(parsed.getForm().getFields().length, 0);
    assertEquals(parsed.getPageCount(), origins.length);
    assertEquals(
      new Set(
        origins.filter((p) => p.formKey === "f8283").map((p) => p.formCopy),
      ).size,
      count + (withSectionA ? 1 : 0),
    );
    await retainPacket(
      `b${count}-same${sameDonee}-mixed${mixed}-small${smallGrouped}-a${withSectionA}-joint${jointOwners}-shared${sharedAppraisal}-div${withDividendIncome}`,
      publicInputs,
      pending,
      source.filer,
      source.attachments,
      bundle.xml,
      pdf,
      origins,
    );
    if (
      count === 3 && !sameDonee && !mixed && !smallGrouped &&
      !sharedAppraisal && !withDividendIncome
    ) {
      for (
        const mutation of [
          "final-tax",
          "total-income",
          "w2-income",
          "w2-withholding-up",
          "w2-withholding-down",
          "tax-worksheet",
          "detached-agi",
        ] as const
      ) {
        const changed = structuredClone(pending);
        if (mutation === "final-tax") {
          for (
            const key of [
              "line16_income_tax",
              "line18_total_tax_before_credits",
              "line22_tax_after_credits",
              "line24_total_tax",
            ] as const
          ) changed.f1040![key]! += 1;
          changed.f1040!.line34_overpayment! -= 1;
          changed.f1040!.line35a_refund! -= 1;
        }
        if (mutation === "total-income") {
          changed.f1040!.line9_total_income! += 1;
        }
        if (mutation === "w2-income") changed.w2!.w2s![0].box1_wages += 1;
        if (mutation === "w2-withholding-up") {
          changed.w2!.w2s![0].box2_fed_withheld! += 1;
        }
        if (mutation === "w2-withholding-down") {
          changed.w2!.w2s![0].box2_fed_withheld! -= 1;
        }
        if (mutation === "tax-worksheet") {
          (changed as unknown as Record<string, Record<string, number>>)
            .income_tax_calculation.taxable_income += 1;
        }
        if (mutation === "detached-agi") delete changed.agi_aggregator;
        assertThrows(
          () =>
            form8283Pdf.instances!(
              changed.f8283!,
              source.filer,
              changed as unknown as Record<string, Record<string, unknown>>,
            ),
          Error,
          "Reviewed",
          mutation,
        );
        await assertRejects(
          () =>
            buildMefBundle(changed, {
              filer: source.filer,
              attachments: source.attachments,
            }),
          Error,
          undefined,
          mutation,
        );
        await assertRejects(
          () => buildPdfBytes(changed, source.filer, ".pdf-cache", bundle),
          Error,
          undefined,
          mutation,
        );
      }
      for (const key of ["qualified_dividends", "net_capital_gain"] as const) {
        const changed = structuredClone(pending);
        const taxSource =
          (changed as unknown as Record<string, Record<string, unknown>>)
            .income_tax_calculation;
        taxSource[key] = 1000;
        const tax = income_tax_calculation.compute({
          taxYear: 2025,
          formType: "f1040",
        }, income_tax_calculation.inputSchema.parse(taxSource)).outputs.find(
          (row) => row.nodeType === "f1040",
        )!.fields.line16_income_tax as number;
        const delta = tax - changed.f1040!.line16_income_tax!;
        for (
          const key of [
            "line16_income_tax",
            "line18_total_tax_before_credits",
            "line22_tax_after_credits",
            "line24_total_tax",
          ] as const
        ) changed.f1040![key]! += delta;
        changed.f1040!.line34_overpayment! -= delta;
        changed.f1040!.line35a_refund! -= delta;
        assertThrows(
          () =>
            form8283Pdf.instances!(
              changed.f8283!,
              source.filer,
              changed as unknown as Record<string, Record<string, unknown>>,
            ),
          Error,
          "Reviewed",
          key,
        );
        await assertRejects(
          () =>
            buildMefBundle(changed, {
              filer: source.filer,
              attachments: source.attachments,
            }),
          Error,
          "Reviewed",
          key,
        );
        await assertRejects(
          () => buildPdfBytes(changed, source.filer, ".pdf-cache", bundle),
          Error,
          undefined,
          key,
        );
      }
      // A consistent source/snapshot change must still disagree with retained official fields.
      const changed = structuredClone(pending);
      const row = changed.f8283!.section_b_items![0];
      row.donee_acknowledgment!.organization_name = "Different Named Charity";
      row.signed_form_source_review!.reviewed_form_fields!.donee_name =
        "Different Named Charity";
      await assertRejects(
        () =>
          buildMefBundle(changed, {
            filer: source.filer,
            attachments: source.attachments,
          }),
        Error,
        "logical field",
      );
      await assertRejects(
        () => buildPdfBytes(changed, source.filer, ".pdf-cache", bundle),
        Error,
        "PDF source differs",
      );
    }
    if (
      count === 3 && !sameDonee && !mixed && !smallGrouped &&
      !sharedAppraisal && !withDividendIncome
    ) {
      const changed = structuredClone(pending);
      const altered = source.attachments.map((a) => ({ ...a }));
      const named = changed.f8283!.section_b_items![0]
        .signed_form_attachment_file_name!;
      const document = await PDFDocument.load(
        altered.find((a) => a.fileName === named)!.bytes,
      );
      document.getForm().getTextField("Form8283[0].Page2[0].f2_19[0]").setText(
        "Rehashed different donee",
      );
      const bytes = await document.save();
      altered.find((a) => a.fileName === named)!.bytes = bytes;
      const digest = new Uint8Array(
        await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
      );
      changed.f8283!.section_b_items![0].signed_form_source_review!.pdf_sha256 =
        Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
      await assertRejects(
        () =>
          buildMefBundle(changed, {
            filer: source.filer,
            attachments: altered,
          }),
        Error,
        "logical field",
      );
      await assertRejects(
        () => buildPdfBytes(changed, source.filer, ".pdf-cache", bundle),
        Error,
        "PDF source differs",
      );
    }
    for (const index of [0, count - 1]) {
      const changed = structuredClone(pending);
      changed.f8283!.section_b_items![index].deduction_claimed -= 1;
      await assertRejects(() =>
        buildMefBundle(changed, {
          filer: source.filer,
          attachments: source.attachments,
        })
      );
      await assertRejects(() => buildPdfBytes(changed, source.filer));
      const changedDonee = structuredClone(pending);
      changedDonee.f8283!.section_b_items![index].donee_acknowledgment!.ein =
        "111223333";
      await assertRejects(() =>
        buildMefBundle(changedDonee, {
          filer: source.filer,
          attachments: source.attachments,
        })
      );
      await assertRejects(() => buildPdfBytes(changedDonee, source.filer));
      const altered = source.attachments.map((a) => ({ ...a }));
      const purchaseIndex = altered.findIndex((a) =>
        a.fileName === `Purchase-${index + 1}.pdf`
      );
      altered[purchaseIndex].bytes = altered.find((a) =>
        a.fileName === `Signed8283-${index + 1}.pdf`
      )!.bytes;
      await assertRejects(() =>
        buildMefBundle(pending, { filer: source.filer, attachments: altered })
      );
    }
  });
}

Deno.test("complete Section A eight-reason reduction inventory preserves source FMV before AGI limits", async () => {
  const { sectionAReductionInventory } = await import(
    "./form8283-section-a-reduction-inventory.fixture.ts"
  );
  const source = await reviewedGiftInventory(0);
  const inputs = {
    ...source.inputs,
    f8283: { section_a_items: sectionAReductionInventory },
  };
  const result = execute(buildExecutionPlan(registry), registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  // Independent claims: print700 + inventory12000 + creator1200 + manuscript600
  // + unrelated use3000 + private foundation3000 + preparation costs3000 + patent3000.
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 26500);
  assertEquals(result.pending.f1040.line12e_itemized_deductions, 50500);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: source.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<FairMarketValueStatement\b/g) ?? []).length,
    8,
  );
  const checked = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      "-",
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = checked.stdin.getWriter();
  await writer.write(new TextEncoder().encode(bundle.xml));
  await writer.close();
  const checkResult = await checked.output();
  assertEquals(
    checkResult.code,
    0,
    new TextDecoder().decode(checkResult.stderr),
  );
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    source.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  const copies = form8283Pdf.instances!(
    pending.f8283!,
    source.filer,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals(copies.length, 2);
  assertEquals(
    copies.map((p) => [p.row1_claim, p.row2_claim, p.row3_claim, p.row4_claim]),
    [[700, 12000, 1200, 600], [3000, 3000, 3000, 3000]],
  );
  for (let index = 0; index < 8; index++) {
    const changed = structuredClone(pending);
    changed.f8283!.section_a_items![index].deduction_claimed! -= 1;
    await assertRejects(() =>
      buildMefBundle(changed, { filer: source.filer, attachments: [] })
    );
    await assertRejects(() => buildPdfBytes(changed, source.filer));
  }
  await retainPacket(
    "section-a-eight-reasons",
    inputs,
    pending,
    source.filer,
    [],
    bundle.xml,
    pdf,
    origins,
  );
});

async function retainPacket(
  id: string,
  inputs: unknown,
  pending: unknown,
  filer: unknown,
  attachments: readonly {
    fileName: string;
    description: string;
    bytes: Uint8Array;
  }[],
  xml: string,
  pdf: Uint8Array,
  origins: PdfPageOrigin[],
) {
  const root = Deno.env.get("FORM8283_EVIDENCE_DIR");
  if (!root) return;
  const directory = `${root}/${id}`;
  await Deno.mkdir(`${directory}/attachments`, { recursive: true });
  await Deno.writeTextFile(
    `${directory}/source.json`,
    JSON.stringify({ inputs, filer }, null, 2),
  );
  await Deno.writeTextFile(
    `${directory}/pending.json`,
    JSON.stringify(pending, null, 2),
  );
  await Deno.writeTextFile(`${directory}/return.xml`, xml);
  await Deno.writeFile(`${directory}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${directory}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const records = [];
  for (const attachment of attachments) {
    await Deno.writeFile(
      `${directory}/attachments/${attachment.fileName}`,
      attachment.bytes,
    );
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(attachment.bytes)),
    );
    records.push({
      fileName: attachment.fileName,
      description: attachment.description,
      sha256: Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join(
        "",
      ),
      pages: (await PDFDocument.load(attachment.bytes)).getPageCount(),
    });
  }
  await Deno.writeTextFile(
    `${directory}/attachments.json`,
    JSON.stringify(records, null, 2),
  );
}

for (
  const [highFmvFoundationArt, highValueCreator] of [[false, false], [
    true,
    false,
  ], [false, true]]
) {
  Deno.test(`source reviewed creator manuscript foundation and taxidermy Section B reductions reach complete return highFmvArt${highFmvFoundationArt} highValue${highValueCreator}`, async () => {
    const { reviewedSpecialSectionBInventory } = await import(
      "./form8283-special-section-b.fixture.ts"
    );
    const source = await reviewedSpecialSectionBInventory(
      highFmvFoundationArt,
      highValueCreator,
    );
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      source.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      highValueCreator ? 50000 : 24000,
    );
    assertEquals(result.pending.f1040.line11_agi, 100000);
    assertEquals(
      result.pending.f1040.line12e_itemized_deductions,
      highValueCreator ? 74000 : 48000,
    );
    // TY2025 single tax-table row52,000–52,050 uses midpoint52,025:
    // 11925*.10 +36550*.12 +3550*.22 =6359.50, rounded6360.
    // Large creator case26000–26050 midpoint26025:11925*.10+14100*.12=2884.50→2885.
    assertEquals(
      result.pending.f1040.line16_income_tax,
      highValueCreator ? 2885 : 6360,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments: source.attachments,
    });
    assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 4);
    assertEquals(bundle.attachments.length, 28);
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      source.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const copies = form8283Pdf.instances!(
      pending.f8283!,
      source.filer,
      pending as unknown as Record<string, Record<string, unknown>>,
    );
    assertEquals(copies.map((row) => row.section_b_claim), [
      highValueCreator ? 600000 : 6000,
      6000,
      6000,
      6000,
    ]);
    assertEquals(copies.map((row) => row.section_b_other === true), [
      false,
      true,
      false,
      true,
    ]);
    if (highValueCreator) {
      assertEquals(source.items[0].fmv, 900000);
      assertEquals(copies[0].section_b_art_at_least_20000, true);
      assertEquals(
        bundle.xml.includes(
          "<DeductionClaimedAmt>600000</DeductionClaimedAmt>",
        ),
        true,
      );
      // Source claim600000 survives Form8283; current ScheduleA allowance is50000.
      const alteredInputs = structuredClone(source.inputs);
      const alteredRow = alteredInputs.f8283.section_b_items![0];
      alteredRow.deduction_claimed += 1;
      alteredRow.cost_or_adjusted_basis! += 1;
      alteredRow.signed_form_source_review!.reviewed_form_fields!
        .deduction_claimed += 1;
      alteredRow.signed_form_source_review!.reviewed_form_fields!
        .cost_or_adjusted_basis += 1;
      const alteredResult = execute(
        buildExecutionPlan(registry),
        registry,
        alteredInputs,
        { taxYear: 2025, formType: "f1040" },
      );
      assertEquals(alteredResult.diagnostics, []);
      assertEquals(
        alteredResult.pending.schedule_a.line_12_noncash_contributions,
        50000,
      );
      const alteredPending = buildPending(alteredResult.pending);
      await assertRejects(
        () =>
          buildMefBundle(alteredPending, {
            filer: source.filer,
            attachments: source.attachments,
          }),
        Error,
        "monetary field",
      );
      await assertRejects(() =>
        buildPdfBytes(alteredPending, source.filer, ".pdf-cache", bundle)
      );
      const changed = structuredClone(pending);
      delete changed.f8283!.section_b_items![0].qualified_appraisal!
        .full_appraisal_source_review;
      await assertRejects(() =>
        buildMefBundle(changed, {
          filer: source.filer,
          attachments: source.attachments,
        })
      );
      await assertRejects(() =>
        buildPdfBytes(changed, source.filer, ".pdf-cache", bundle)
      );
    }
    if (highFmvFoundationArt) {
      assertEquals(source.items[2].fmv, 25000);
      assertEquals(copies[2].section_b_art_under_20000, true);
      assertEquals(copies[2].section_b_art_at_least_20000, false);
    }
    for (let index = 0; index < 4; index++) {
      const changed = structuredClone(pending);
      changed.f8283!.section_b_items![index].deduction_claimed -= 1;
      await assertRejects(() =>
        buildMefBundle(changed, {
          filer: source.filer,
          attachments: source.attachments,
        })
      );
      await assertRejects(() => buildPdfBytes(changed, source.filer));
      const altered = source.attachments.map((a) => ({ ...a }));
      const named =
        source.items[index].special_fmv_reduction!.source_documents[0]
          .attachment_file_name;
      altered.find((a) => a.fileName === named)!.bytes =
        source.attachments.find((a) =>
          a.fileName === source.items[index].signed_form_attachment_file_name
        )!.bytes;
      await assertRejects(() =>
        buildMefBundle(pending, { filer: source.filer, attachments: altered })
      );
    }
    await retainPacket(
      highValueCreator
        ? "section-b-high-value-required-full-appraisal"
        : highFmvFoundationArt
        ? "section-b-special-high-fmv-low-claim-art"
        : "section-b-four-special-reasons",
      source.inputs,
      pending,
      source.filer,
      source.attachments,
      bundle.xml,
      pdf,
      origins,
    );
  });
}

for (const lowValueGrouped of [false, true]) {
  Deno.test(`actual same-donee signed ABC form and shared appraisal produce one source-bound Section B copy lowValue${lowValueGrouped}`, async () => {
    const source = await reviewedGiftInventory(
      3,
      true,
      false,
      false,
      false,
      false,
      true,
      true,
      lowValueGrouped,
    );
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      source.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      lowValueGrouped ? 12700 : 18600,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments: source.attachments,
    });
    assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 1);
    assertEquals((bundle.xml.match(/<PropertyInformation\b/g) ?? []).length, 3);
    assertEquals(bundle.attachments.length, 10);
    assertEquals(bundle.xml.match(/<PropertyId>[ABC]<\/PropertyId>/g) ?? [], [
      "<PropertyId>A</PropertyId>",
      "<PropertyId>B</PropertyId>",
      "<PropertyId>C</PropertyId>",
      ...(lowValueGrouped ? ["<PropertyId>A</PropertyId>"] : []),
    ]);
    assertEquals(
      bundle.xml.includes(
        "<PropertyIdLetterAndDescGrp><PropertyId>A</PropertyId></PropertyIdLetterAndDescGrp>",
      ),
      lowValueGrouped,
    );
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      source.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const copies = form8283Pdf.instances!(
      pending.f8283!,
      source.filer,
      pending as unknown as Record<string, Record<string, unknown>>,
    );
    assertEquals(copies.length, 1);
    assertEquals([
      copies[0].section_b_claim,
      copies[0].section_b_claim_b,
      copies[0].section_b_claim_c,
    ], [lowValueGrouped ? 200 : 6100, 6200, 6300]);
    assertEquals(
      new Set(
        origins.filter((p) => p.formKey === "f8283").map((p) => p.formCopy),
      )
        .size,
      1,
    );
    for (const index of [0, 1, 2]) {
      const changed = structuredClone(pending);
      changed.f8283!.section_b_items![index].signed_form_row_identifier = "A";
      if (index === 0) {
        changed.f8283!.section_b_items![index].donee_acknowledgment!.ein =
          "111223333";
      }
      await assertRejects(() =>
        buildMefBundle(changed, {
          filer: source.filer,
          attachments: source.attachments,
        })
      );
      await assertRejects(() => buildPdfBytes(changed, source.filer));
    }
    if (lowValueGrouped) {
      for (
        const mutation of ["missing", "owner", "row", "late-signature"] as const
      ) {
        const changed = structuredClone(pending);
        const row = changed.f8283!.section_b_items![0];
        if (mutation === "missing") delete row.donor_statement_source_review;
        if (mutation === "owner") {
          row.donor_statement_source_review!.donor_ssn = "444556666";
        }
        if (mutation === "row") {
          row.donor_statement_source_review!.property_id = "B";
        }
        if (mutation === "late-signature") {
          row.donor_statement_source_review!.signed_date = "2025-06-02";
        }
        await assertRejects(
          () =>
            buildMefBundle(changed, {
              filer: source.filer,
              attachments: source.attachments,
            }),
          Error,
          undefined,
          mutation,
        );
        await assertRejects(
          () => buildPdfBytes(changed, source.filer),
          Error,
          undefined,
          mutation,
        );
      }
    }
    await retainPacket(
      lowValueGrouped
        ? "same-donee-abc-partiii-low-value"
        : "same-donee-actual-abc-shared-signed-form",
      source.inputs,
      pending,
      source.filer,
      source.attachments,
      bundle.xml,
      pdf,
      origins,
    );
  });
}

for (const longHeld of [false, true]) {
  Deno.test(`owned unreduced similar books across three donees reach complete source graph and three required copies longHeld${longHeld}`, async () => {
    const { reviewedUnreducedBookGroup } = await import(
      "./form8283-unreduced-book-group.fixture.ts"
    );
    const source = await reviewedUnreducedBookGroup(longHeld);
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      source.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 5400);
    assertEquals(result.pending.f1040.line11_agi, 100000);
    assertEquals(result.pending.f1040.line12e_itemized_deductions, 29400);
    // Single tax-table midpoint70625:11925*.1+36550*.12+22150*.22=10451.5→10452.
    assertEquals(result.pending.f1040.line16_income_tax, 10452);
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments: source.attachments,
    });
    assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, 3);
    assertEquals(bundle.attachments.length, 15);
    for (const claim of [2000, 2500, 900]) {
      assertEquals(
        bundle.xml.includes(
          `<DeductionClaimedAmt>${claim}</DeductionClaimedAmt>`,
        ),
        true,
      );
    }
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      source.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const parsed = await PDFDocument.load(pdf);
    assertEquals(parsed.getForm().getFields().length, 0);
    assertEquals(origins.filter((p) => p.formKey === "f8283").length, 6);
    const copies = form8283Pdf.instances!(
      pending.f8283!,
      source.filer,
      pending as unknown as Record<string, Record<string, unknown>>,
    );
    assertEquals(copies.map((row) => row.section_b_claim), [2000, 2500, 900]);
    assertEquals(copies.map((row) => row.section_b_basis), [5000, 5100, 5200]);
    for (
      const mutation of ["owner", "basis", "group", "missing-source"] as const
    ) {
      const changed = structuredClone(pending);
      const row = changed.f8283!.section_b_items![0];
      if (mutation === "owner") {
        row.donor_ownership_review!.donor_ssn = "444556666";
      }
      if (mutation === "basis") row.cost_or_adjusted_basis = 1999;
      if (mutation === "group") {
        row.similar_item_group = "different property group";
      }
      if (mutation === "missing-source") {
        delete row.unreduced_purchased_property;
      }
      await assertRejects(
        () =>
          buildMefBundle(changed, {
            filer: source.filer,
            attachments: source.attachments,
          }),
        Error,
        undefined,
        mutation,
      );
      await assertRejects(
        () => buildPdfBytes(changed, source.filer, ".pdf-cache", bundle),
        Error,
        undefined,
        mutation,
      );
    }
    const altered = source.attachments.map((a) => ({ ...a }));
    altered.find((a) =>
      a.fileName ===
        source.items[0].unreduced_purchased_property!
          .purchase_record_attachment_file_name
    )!.bytes = altered.find((a) =>
      a.fileName === source.items[0].signed_form_attachment_file_name
    )!.bytes;
    await assertRejects(
      () =>
        buildMefBundle(pending, { filer: source.filer, attachments: altered }),
      Error,
      "unreduced purchase source",
    );
    await retainPacket(
      longHeld
        ? "unreduced-long-held-books-three-donees"
        : "unreduced-books-three-donees",
      source.inputs,
      pending,
      source.filer,
      source.attachments,
      bundle.xml,
      pdf,
      origins,
    );
  });
}
