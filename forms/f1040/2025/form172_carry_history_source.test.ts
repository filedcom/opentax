import { assertEquals, assertRejects } from "@std/assert";
import { stageForm172CarryHistorySource } from "./form172_carry_history_source.ts";

function origin() {
  const item = (id: string, amount: number, business: boolean) => ({
    item_id: id,
    reference: id,
    owner_ssn: "111223333",
    amount,
    business,
  });
  return {
    tax_year: 2019,
    taxpayer_ssn: "111223333",
    reference: "origin-2019",
    filing_status: "single",
    reviewed_form1040: {
      reference: "return-2019",
      tax_year: 2019,
      taxpayer_ssn: "111223333",
      filing_status: "single",
      line11_agi: -100000,
      line12_standard_or_itemized_deduction: 12200,
    },
    limitations_review: {
      reference: "loss-limit-review",
      at_risk_and_passive_limits_applied: true,
      excess_business_loss_limit_applied: true,
    },
    noncapital_income: [item("receipts", 10000, true)],
    noncapital_deductions: [{
      ...item("expenses", 110000, true),
      location: "agi",
    }, { ...item("standard", 12200, false), location: "line12" }],
    capital_gains: [],
    capital_losses: [],
    prior_nol_deductions: [],
  };
}

const standards: Record<number, number> = {
  2013: 6100,
  2014: 6200,
  2015: 6300,
  2016: 6300,
  2017: 6350,
  2018: 12000,
  2019: 12200,
  2020: 12400,
  2021: 12550,
  2022: 12950,
  2023: 13850,
  2024: 14600,
};
function annual(year: number, base = 0) {
  const exemption = year < 2018
    ? ({ 2013: 3900, 2014: 3950, 2015: 4000, 2016: 4050, 2017: 4050 } as Record<
      number,
      number
    >)[year]
    : 0;
  return {
    reference: `absorption-${year}`,
    tax_year: year,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    return_reference: `return-${year}`,
    before_current_and_later_nol: true,
    agi: base ? base + standards[year] + exemption : 0,
    deduction_method: "standard",
    standard_or_itemized_deduction: standards[year],
    qbi_deduction: 0,
    section250_deduction: 0,
    personal_exemptions: exemption,
    reported_taxable_income: base,
    return_nol_deduction: { reference: `nol-${year}`, amount: 0 },
    earlier_nols: [],
    capital_loss_deduction: { reference: `capital-${year}`, amount: 0 },
    section1202_exclusion: { reference: `qsbs-${year}`, amount: 0 },
    agi_refigures: [],
  };
}
function history() {
  return {
    reference: "history",
    opening_tax_year: 2025,
    carry_policy: {
      kind: "reviewed_waiver",
      reference: "waiver",
      waiver_timeliness_reviewed: true,
    },
    annual_reviews: [2020, 2021, 2022, 2023, 2024].map((y) =>
      annual(y, y === 2021 ? 50000 : y === 2022 ? 20000 : 0)
    ),
  };
}
function origin2024() {
  const o = origin();
  o.tax_year = 2024;
  o.reference = "origin-2024";
  o.reviewed_form1040.tax_year = 2024;
  o.reviewed_form1040.reference = "return-2024";
  o.reviewed_form1040.line12_standard_or_itemized_deduction = 14600;
  o.noncapital_deductions[1].amount = 14600;
  return o;
}

async function sha(bytes: Uint8Array) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
async function source() {
  const o = origin(), h = history();
  const documents = [{
    reference: o.reference,
    bytes: new TextEncoder().encode(JSON.stringify(o)),
  }, {
    reference: h.reference,
    bytes: new TextEncoder().encode(JSON.stringify(h)),
  }];
  const binding = {
    origin: { reference: o.reference, sha256: await sha(documents[0].bytes) },
    history: { reference: h.reference, sha256: await sha(documents[1].bytes) },
    origin_tax_year: 2019,
    opening_tax_year: 2025,
    taxpayer_ssn: "111223333",
  };
  return { binding, documents };
}
Deno.test("Form 172 retained origin and history bytes reproduce complete arithmetic", async () => {
  const { binding, documents } = await source();
  const r = await stageForm172CarryHistorySource(binding, documents);
  assertEquals(r.originLoss, 100000);
  assertEquals(r.openingLoss, 44000);
  assertEquals(r.annualResults.map((a) => a.absorbed), [0, 40000, 16000, 0, 0]);
  assertEquals(r.review_package_manifest, [binding.origin, binding.history]);
  assertEquals(r.reviewPackageBytesVerified, true);
  for (
    const v of [
      r.sourceAuthenticityVerified,
      r.priorAcceptanceVerified,
      r.acceptedCarryImportVerified,
      r.issuerAuthenticityVerified,
      r.packetAdmissionVerified,
      r.filingReady,
    ]
  ) assertEquals(v, false);
});
Deno.test("Form 172 retained history rejects altered missing duplicate or extra documents", async () => {
  const { binding, documents } = await source();
  const altered = documents.map((d) => ({
    ...d,
    bytes: new Uint8Array(d.bytes),
  }));
  altered[1].bytes[0] = 32;
  for (
    const docs of [
      altered,
      documents.slice(0, 1),
      [documents[0], documents[0]],
      [...documents, { reference: "extra", bytes: documents[0].bytes }],
    ]
  ) {
    await assertRejects(async () =>
      stageForm172CarryHistorySource(binding, docs)
    );
  }
  await assertRejects(async () =>
    stageForm172CarryHistorySource({
      ...binding,
      history: { ...binding.origin },
    }, documents)
  );
});
Deno.test("Form 172 retained history rejects source identity and envelope mismatches", async () => {
  const { binding, documents } = await source();
  for (
    const patch of [
      { origin_tax_year: 2020 },
      { opening_tax_year: 2024 },
      { taxpayer_ssn: "999887777" },
      { spouse_ssn: "999887777" },
      { opening_loss: 44000 },
    ]
  ) {
    await assertRejects(async () =>
      stageForm172CarryHistorySource({ ...binding, ...patch }, documents)
    );
  }
  const bytes = new TextEncoder().encode(
    JSON.stringify({ ...history(), reference: "unbound" }),
  );
  await assertRejects(async () =>
    stageForm172CarryHistorySource({
      ...binding,
      history: { ...binding.history, sha256: await sha(bytes) },
    }, [documents[0], { reference: "history", bytes }])
  );
});
Deno.test("Form 172 retained history rejects noncanonical JSON with a matching digest", async () => {
  const { binding, documents } = await source();
  const text = new TextDecoder().decode(documents[1].bytes);
  for (
    const invalid of [
      " " + text,
      "\ufeff" + text,
      text.replace(
        '"opening_tax_year":2025',
        '"opening_tax_year":2025,"opening_tax_year":2025',
      ),
    ]
  ) {
    const bytes = new TextEncoder().encode(invalid);
    await assertRejects(async () =>
      stageForm172CarryHistorySource({
        ...binding,
        history: { ...binding.history, sha256: await sha(bytes) },
      }, [documents[0], { reference: "history", bytes }])
    );
  }
});
Deno.test("Form 172 retained history recomputes conflicting arithmetic rather than trusting digest", async () => {
  const { binding, documents } = await source();
  const h = history();
  h.annual_reviews[0].reported_taxable_income = 1;
  const bytes = new TextEncoder().encode(JSON.stringify(h));
  await assertRejects(async () =>
    stageForm172CarryHistorySource({
      ...binding,
      history: { ...binding.history, sha256: await sha(bytes) },
    }, [documents[0], { reference: "history", bytes }])
  );
  const o = origin();
  o.reviewed_form1040.line11_agi = -1;
  const originBytes = new TextEncoder().encode(JSON.stringify(o));
  await assertRejects(async () =>
    stageForm172CarryHistorySource({
      ...binding,
      origin: { ...binding.origin, sha256: await sha(originBytes) },
    }, [{ reference: o.reference, bytes: originBytes }, documents[1]])
  );
});
Deno.test("Form 172 retained history owns binding and all documents before first await", async () => {
  const { binding, documents } = await source();
  const pending = stageForm172CarryHistorySource(binding, documents);
  binding.taxpayer_ssn = "999887777";
  binding.history.sha256 = "0".repeat(64);
  documents[0].bytes.fill(32);
  documents[1].bytes.fill(32);
  documents[1].reference = "changed";
  const r = await pending;
  assertEquals(r.openingLoss, 44000);
  assertEquals(r.taxpayerSsn, "111223333");
});
Deno.test("Form 172 retained history rejects invalid UTF-8 despite matching digest", async () => {
  const { binding, documents } = await source();
  const bytes = new Uint8Array([0xff, 0xfe, 0xfd]);
  await assertRejects(async () =>
    stageForm172CarryHistorySource({
      ...binding,
      history: { ...binding.history, sha256: await sha(bytes) },
    }, [documents[0], { reference: "history", bytes }])
  );
});
