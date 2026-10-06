import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { form8283 } from "../../../2025/mef/forms/f8283.ts";
import { form8283Pdf } from "../../../2025/pdf/forms/f8283.ts";
import {
  bindPriorMiningCharityHistory,
  calculateReviewedMiningCarryConsumption,
} from "./prior-mining-charity.ts";
import {
  calculateCharitableNaturalResource,
  calculatePriorProducingMining2024,
  charitableNaturalResourceSourceSchema,
} from "./natural-resource-source.ts";
import {
  currentMiningCarryFixture,
  digest,
  priorMiningCharityFixture,
} from "./prior-mining-charity.fixture.ts";

let retained: ReturnType<typeof priorMiningCharityFixture> | undefined;
const fixture = async () => {
  retained ??= priorMiningCharityFixture();
  const value = await retained;
  return {
    history: structuredClone(value.history),
    records: new Map<string, Uint8Array>(
      [...value.records].map(([k, bytes]) => [k, bytes.slice()]),
    ),
  };
};
Deno.test("Prior producing6172024 actual annual account derives distinct regular/AMT carry without filing authority", async () => {
  const { history, records } = await fixture();
  const r = await bindPriorMiningCharityHistory(history, records);
  assertEquals([
    r.calc.fmv,
    r.calc.adjusted_basis,
    r.calc.amt_adjusted_basis,
    r.calc.ordinary_gain,
    r.calc.amt_ordinary_gain,
    r.calc.deduction_claimed,
    r.calc.amt_deduction_claimed,
  ], [350000, 200000, 290000, 40000, 39000, 310000, 311000]);
  assertEquals([
    r.profit,
    r.se.line12,
    r.se.line13,
    r.agi,
    r.regularAllowed,
    r.amtAllowed,
    r.regularCarry,
    r.amtCarry,
  ], [40000, 5652, 2826, 137174, 41152.2, 41152.2, 268847.8, 269847.8]);
  assertEquals(r.filing_authority, "unverified_no_export");
  assertEquals(r.calc.rows.at(-1)?.tax_year, 2024);
  assertThrows(() =>
    charitableNaturalResourceSourceSchema.parse(history.prior_mining_source)
  );
  assertThrows(() =>
    calculateCharitableNaturalResource(history.prior_mining_source)
  );
  assertEquals(history.prior_mining_source.annual_records.length, 40);
  const unavailableFilingSource: any = {
    carryover_evidence: [{ ...history, property_kind: "producing_mining_617" }],
  };
  assertThrows(() => form8283.build(unavailableFilingSource, {}));
  assertThrows(() =>
    form8283Pdf.instances!(unavailableFilingSource, undefined, {})
  );
  const dir = Deno.env.get("FORM8283_PRIOR_MINING_EVIDENCE_DIR");
  if (dir) {
    await Deno.mkdir(dir, { recursive: false });
    await Deno.writeTextFile(
      `${dir}/history.json`,
      JSON.stringify(history, null, 2),
    );
    await Deno.writeTextFile(
      `${dir}/prior-calculation.json`,
      JSON.stringify(r, null, 2),
    );
    for (const [name, bytes] of records) {
      await Deno.writeFile(`${dir}/${name}`, bytes);
    }
  }
});
const cases = [
  {
    name: "both still limited",
    wages: 895536,
    cash: 0,
    stock: false,
    used: [268660.8, 268660.8],
    carry: [187, 1187],
    lines: [0, 0, 268661, 268661, 0],
  },
  {
    name: "regular exhausted but AMT partly consumed",
    wages: 897536,
    cash: 0,
    stock: false,
    used: [268847.8, 269260.8],
    carry: [0, 587],
    lines: [0, 0, 268848, 269261, -413],
  },
  {
    name: "both exhausted with actual negative line3",
    wages: 900000,
    cash: 0,
    stock: false,
    used: [268847.8, 269847.8],
    carry: [0, 0],
    lines: [0, 0, 268848, 269848, -1000],
  },
  {
    name: "current cash reserves actual50 percent capacity",
    wages: 500000,
    cash: 200000,
    stock: false,
    used: [50000, 50000],
    carry: [218847.8, 219847.8],
    lines: [200000, 0, 50000, 50000, 0],
  },
  {
    name: "current samecategory issued stock gift precedes carried gift",
    wages: 900000,
    cash: 0,
    stock: true,
    used: [170000, 170000],
    carry: [98847.8, 99847.8],
    lines: [0, 100000, 170000, 170000, 0],
  },
] as const;
for (const c of cases) {
  Deno.test(`Prior mining charity source consumption ${c.name}`, async () => {
    const { history, records } = await fixture();
    const current = currentMiningCarryFixture(
      c.wages,
      history.owner_ssn,
      c.cash,
      c.stock,
    );
    const r = await calculateReviewedMiningCarryConsumption(
      history,
      records,
      current,
    );
    assertEquals(r.agi, c.wages);
    assertEquals<readonly number[]>([
      r.regular.prior_noncash_allowed,
      r.amt.prior_noncash_allowed,
    ], c.used);
    assertEquals<readonly number[]>([
      r.regular.remaining_prior_carry,
      r.amt.remaining_prior_carry,
    ], c.carry);
    assertEquals<readonly number[]>([
      r.schedule_a_line11,
      r.schedule_a_line12,
      r.schedule_a_line13,
      r.amt_schedule_a_line13,
      r.line3_charitable_contribution_adjustment,
    ], c.lines);
    assertEquals(r.filing_authority, "unverified_no_export");
    const dir = Deno.env.get("FORM8283_PRIOR_MINING_EVIDENCE_DIR");
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/current-${c.wages}-${c.cash}-${c.stock}.json`,
        JSON.stringify({ current, calculation: r }, null, 2),
      );
    }
  });
}
Deno.test("Prior/current issued wage source cents retain raw evidence and settle filed AGI before limits", async () => {
  const { history, records } = await fixture();
  Object.assign(history.issued_2024_w2[0], {
    box1_wages: 100000.5,
    box3_ss_wages: 100000.5,
    box4_ss_withheld: 6200.03,
    box5_medicare_wages: 100000.5,
    box6_medicare_withheld: 1450.01,
  });
  Object.assign(history.regular_return_account, {
    form1040_line11_agi: 137175,
    schedule_a_line12_noncash: 41153,
    raw_current_allowed: 41152.5,
    raw_carry_to_2025: 268847.5,
  });
  Object.assign(history.amt_workpaper_account, {
    raw_current_allowed: 41152.5,
    raw_carry_to_2025: 269847.5,
  });
  for (
    const [r, account] of [[
      history.regular_return_account_record,
      history.regular_return_account,
    ], [
      history.amt_workpaper_account_record,
      history.amt_workpaper_account,
    ]] as const
  ) {
    const bytes = new TextEncoder().encode(JSON.stringify(account, null, 2));
    records.set(r.file_name, bytes);
    r.sha256 = await digest(bytes);
  }
  const result = await calculateReviewedMiningCarryConsumption(
    history,
    records,
    currentMiningCarryFixture(897535.5, history.owner_ssn),
  );
  assertEquals([
    result.prior.agi,
    result.agi,
    result.prior.regularCarry,
    result.prior.amtCarry,
  ], [137175, 897536, 268847.5, 269847.5]);
  assertEquals([
    result.schedule_a_line13,
    result.amt_schedule_a_line13,
    result.line3_charitable_contribution_adjustment,
  ], [268848, 269261, -413]);
  assertEquals(history.issued_2024_w2[0].box1_wages, 100000.5);
  assertEquals(result.prior.history.issued_2024_w2[0].box1_wages, 100000.5);
});

Deno.test("Prior mining history retains canonical source financial fields and rejects rehashed/source/current conflicts", async () => {
  const mutations: [string, (h: any) => void][] = [
    ["invented acceptance", (h) => h.accepted_status_reviewed = true],
    ["owner", (h) => h.owner_ssn = "222334444"],
    ["donor", (h) => h.prior_mining_source.donor_ssn = "222334444"],
    ["annual gap", (h) => h.prior_mining_source.annual_records.splice(3, 1)],
    [
      "future annual year",
      (h) => h.prior_mining_source.annual_records.at(-1).tax_year = 2025,
    ],
    [
      "current schema donation",
      (h) => h.prior_mining_source.date_contributed = "2025-06-01",
    ],
    [
      "expired gift",
      (h) => h.prior_mining_source.date_contributed = "2019-06-01",
    ],
    [
      "owned receipt",
      (h) => h.prior_mining_source.current_year_paid_receipts[0].amount += 1,
    ],
    [
      "unit rollforward",
      (h) =>
        h.prior_mining_source.annual_records.at(-1)
          .recoverable_units_before_sales += 1,
    ],
    [
      "deducted costs",
      (h) =>
        h.prior_mining_source.annual_records.at(-1).expenses[0].amount += 1,
    ],
    ["prior issued income", (h) => h.issued_2024_w2[0].box1_wages += 1],
    [
      "prior issued owner",
      (h) => h.issued_2024_w2[0].employee_ssn = "222334444",
    ],
    [
      "prior issued name",
      (h) => h.issued_2024_w2[0].employee_name = "Other Person",
    ],
    [
      "duplicate wage record",
      (h) => h.issued_2024_w2.push(h.issued_2024_w2[0]),
    ],
    ["prior SS withholding", (h) => h.issued_2024_w2[0].box4_ss_withheld += 1],
    [
      "unreviewed older gifts",
      (h) => h.sole_prior_charitable_gift_and_no_older_carryovers = false,
    ],
    [
      "manual regular carry",
      (h) => h.regular_return_account.raw_carry_to_2025 += 1,
    ],
    ["manual AMT carry", (h) => h.amt_workpaper_account.raw_carry_to_2025 += 1],
    ["prior AGI", (h) => h.regular_return_account.form1040_line11_agi += 1],
    [
      "prior filed deduction",
      (h) => h.regular_return_account.schedule_a_line12_noncash += 1,
    ],
    [
      "prior filed halfSE",
      (h) => h.regular_return_account.schedule_se_line13 += 1,
    ],
    [
      "prior AMT mining adjustment",
      (h) => h.amt_workpaper_account.form6251_line2q_mining_costs += 1,
    ],
    [
      "prior AMT depletion adjustment",
      (h) => h.amt_workpaper_account.form6251_line2d_depletion += 1,
    ],
    ["prior AMT basis", (h) => h.amt_workpaper_account.adjusted_basis += 1],
    [
      "prior AMT claim",
      (h) => h.amt_workpaper_account.original_charitable_claim += 1,
    ],
    [
      "prior source reference",
      (h) =>
        h.regular_return_account_record.source_reference = "detached source",
    ],
  ];
  for (const [name, mutate] of mutations) {
    const { history, records } = await fixture();
    mutate(history);
    // Rehash updated financial workpapers too: amounts still have to reconcile
    // independently to owned source and issued income, not merely hash equality.
    for (
      const [r, account] of [[
        history.regular_return_account_record,
        history.regular_return_account,
      ], [
        history.amt_workpaper_account_record,
        history.amt_workpaper_account,
      ]] as const
    ) {
      const bytes = new TextEncoder().encode(JSON.stringify(account, null, 2));
      records.set(r.file_name, bytes);
      r.sha256 = await digest(bytes);
    }
    await assertRejects(
      () => bindPriorMiningCharityHistory(history, records),
      Error,
      undefined,
      name,
    );
  }
  for (
    const mode of [
      "changed bytes",
      "rehashed canonical owner",
      "missing account",
    ] as const
  ) {
    const { history, records } = await fixture();
    const row = history.prior_mining_source.retained_source_documents[0];
    if (mode === "missing account") records.delete(row.attachment_file_name);
    else {
      const pdf = await PDFDocument.load(
        records.get(row.attachment_file_name)!,
      );
      pdf.getForm().getTextField("donor_ssn").setText("222334444");
      const bytes = await pdf.save();
      records.set(row.attachment_file_name, bytes);
      if (mode === "rehashed canonical owner") {
        row.pdf_sha256 = await digest(bytes);
      }
    }
    await assertRejects(
      () => bindPriorMiningCharityHistory(history, records),
      Error,
      undefined,
      mode,
    );
  }
  const currentMutations: [string, (c: any) => void][] = [
    ["current owner", (c) => c.owner_ssn = "222334444"],
    ["current issued owner", (c) => c.issued_w2[0].employee_ssn = "222334444"],
    ["current issued year", (c) => c.issued_w2[0].tax_year = 2024],
    ["current duplicate source", (c) => c.issued_w2.push(c.issued_w2[0])],
    ["current SS cap", (c) => c.issued_w2[0].box3_ss_wages = 176101],
    [
      "current Medicare withholding",
      (c) => c.issued_w2[0].box6_medicare_withheld += 1,
    ],
    ["cash owner", (c) => c.cash_receipts[0].donor_ssn = "222334444"],
    ["cash year", (c) => c.cash_receipts[0].paid_on = "2024-03-01"],
    [
      "stock owner",
      (c) => c.current_capital_gain_stock_gifts[0].donor_ssn = "222334444",
    ],
    [
      "stock short holding",
      (c) => c.current_capital_gain_stock_gifts[0].acquired_on = "2025-01-01",
    ],
    [
      "duplicate stock gift",
      (c) =>
        c.current_capital_gain_stock_gifts.push({
          ...c.current_capital_gain_stock_gifts[0],
          source_document_reference: "Other source",
          donation_transfer_record_reference: "Other transfer",
        }),
    ],
    ["invalid cash date", (c) => c.cash_receipts[0].paid_on = "2025-99-01"],
    [
      "duplicate stock source",
      (c) =>
        c.current_capital_gain_stock_gifts.push(
          c.current_capital_gain_stock_gifts[0],
        ),
    ],
    [
      "unreviewed other income",
      (c) => c.only_issued_wages_in_current_income = false,
    ],
    [
      "continued prior mine income",
      (c) => c.original_mine_owned_interest_terminated_in_2024 = false,
    ],
    ["fabricated scalar AGI", (c) => c.agi = 897536],
    ["fabricated acceptance", (c) => c.accepted_status_reviewed = true],
  ];
  for (const [name, mutate] of currentMutations) {
    const { history, records } = await fixture();
    const c = currentMiningCarryFixture(900000, history.owner_ssn, 1000, true);
    mutate(c);
    await assertRejects(
      () => calculateReviewedMiningCarryConsumption(history, records, c),
      Error,
      undefined,
      name,
    );
  }
  const { history } = await fixture();
  history.prior_mining_source.annual_records.at(-2)!.expenses.push({
    ...history.prior_mining_source.annual_records.at(-1)!.expenses[0],
    paid_on: "2023-03-01",
    invoice_reference: "Owned2023 development invoice",
    payment_reference: "Owned2023 bank payment",
    eligibility_record_reference: "Owned2023 mineral reserve development",
  });
  history.prior_mining_source.annual_records.at(-2)!.deduction_claimed = 100000;
  assertThrows(
    () => calculatePriorProducingMining2024(history.prior_mining_source),
    Error,
    "Prior post1986 mining AMT vintages",
  );
});
