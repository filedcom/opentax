import { assertEquals, assertRejects } from "@std/assert";
import { form172AmtTentativeLines } from "./form172_amt_annual_limit.ts";
import { stageForm172AmtReviewSource } from "./form172_amt_review_source.ts";
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

function amt() {
  const { reviewed_form1040: _, ...a } = origin();
  a.reference = "amt-items";
  a.noncapital_deductions[0].amount = 90000;
  a.noncapital_deductions[1].amount = 0;
  return {
    reference: "amt-origin",
    regular_origin_reference: "origin-2019",
    amt_inventory: a,
    reviewed_amt: {
      reference: "amt-return-review",
      tax_year: 2019,
      taxpayer_ssn: "111223333",
      amti_before_atnold: -80000,
      qbi_deduction: 0,
      section250_deduction: 0,
      all_amt_adjustments_and_preferences_applied: true,
    },
  };
}

function annual() {
  return {
    reference: "annual-AMT-review",
    tax_year: 2024,
    taxpayer_ssn: "111223333",
    form6251_reference: "return-6251",
    before_all_atnold: true,
    tentative_depletion_refigured_with_zero_atnold: true,
    components: form172AmtTentativeLines.map((line) => ({
      line,
      reference: `review-${line}`,
      amount: line === "1"
        ? 50000
        : line === "2e"
        ? 40000
        : line === "2l"
        ? 10000
        : 0,
    })),
  };
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
  const values = [origin(), amt(), annual()];
  const documents = values.map((v) => ({
    reference: v.reference,
    bytes: new TextEncoder().encode(JSON.stringify(v)),
  }));
  const claims = await Promise.all(
    documents.map(async (d) => ({
      reference: d.reference,
      sha256: await sha(d.bytes),
    })),
  );
  const binding = {
    regular_origin: claims[0],
    amt_origin: claims[1],
    annual: claims[2],
    origin_tax_year: 2019,
    application_tax_year: 2024,
    taxpayer_ssn: "111223333",
  };
  return { binding, documents };
}
Deno.test("Form 172 three retained review packages reproduce AMT origin and tentative annual cap", async () => {
  const { binding, documents } = await source();
  const r = await stageForm172AmtReviewSource(binding, documents);
  assertEquals(r.originAmtNol, 80000);
  assertEquals(r.tentativeAmtiBeforeAtnold, 100000);
  assertEquals(r.ordinary90PercentLimit, 90000);
  assertEquals(r.review_package_manifest, [
    binding.regular_origin,
    binding.amt_origin,
    binding.annual,
  ]);
  assertEquals(r.reviewPackageBytesVerified, true);
  for (
    const flag of [
      r.amtCarryAbsorptionReconciled,
      r.amtCarryAvailabilityVerified,
      r.acceptedCarryImportVerified,
      r.sourceAuthenticityVerified,
      r.issuerAuthenticityVerified,
      r.priorAcceptanceVerified,
      r.packetAdmissionVerified,
      r.filingReady,
    ]
  ) assertEquals(flag, false);
});
Deno.test("Form 172 AMT retained review rejects tampering missing extra and duplicate documents", async () => {
  const { binding, documents } = await source();
  for (const i of [0, 1, 2]) {
    const changed = documents.map((d) => ({
      ...d,
      bytes: new Uint8Array(d.bytes),
    }));
    changed[i].bytes[0] = 32;
    await assertRejects(() => stageForm172AmtReviewSource(binding, changed));
  }
  for (
    const docs of [documents.slice(1), [
      documents[0],
      documents[0],
      documents[2],
    ], [...documents, { reference: "extra", bytes: documents[0].bytes }]]
  ) await assertRejects(() => stageForm172AmtReviewSource(binding, docs));
});
Deno.test("Form 172 AMT retained review rejects binding owner year and reference conflicts", async () => {
  const { binding, documents } = await source();
  for (
    const patch of [
      { origin_tax_year: 2020 },
      { application_tax_year: 2023 },
      { taxpayer_ssn: "999887777" },
      { spouse_ssn: "999887777" },
      { annual: { ...binding.annual, reference: "wrong" } },
      { atnold: 90000 },
    ]
  ) {
    await assertRejects(() =>
      stageForm172AmtReviewSource({ ...binding, ...patch }, documents)
    );
  }
});
Deno.test("Form 172 AMT retained review recomputes totals despite matching replacement digests", async () => {
  const { binding, documents } = await source();
  const changed = amt();
  changed.reviewed_amt.amti_before_atnold = -1;
  const bytes = new TextEncoder().encode(JSON.stringify(changed));
  await assertRejects(async () =>
    stageForm172AmtReviewSource({
      ...binding,
      amt_origin: { ...binding.amt_origin, sha256: await sha(bytes) },
    }, [documents[0], { reference: changed.reference, bytes }, documents[2]])
  );
  const a = annual();
  a.components.pop();
  const annualBytes = new TextEncoder().encode(JSON.stringify(a));
  await assertRejects(async () =>
    stageForm172AmtReviewSource({
      ...binding,
      annual: { ...binding.annual, sha256: await sha(annualBytes) },
    }, [documents[0], documents[1], {
      reference: a.reference,
      bytes: annualBytes,
    }])
  );
});
Deno.test("Form 172 AMT retained review rejects BOM duplicate keys whitespace and invalid UTF8", async () => {
  const { binding, documents } = await source();
  const text = new TextDecoder().decode(documents[2].bytes);
  const inputs = [
    new TextEncoder().encode("\ufeff" + text),
    new TextEncoder().encode(text + " "),
    new TextEncoder().encode(
      text.replace('"tax_year":2024', '"tax_year":2024,"tax_year":2024'),
    ),
    new Uint8Array([0xff]),
  ];
  for (const bytes of inputs) {
    await assertRejects(async () =>
      stageForm172AmtReviewSource({
        ...binding,
        annual: { ...binding.annual, sha256: await sha(bytes) },
      }, [documents[0], documents[1], {
        reference: binding.annual.reference,
        bytes,
      }])
    );
  }
});
Deno.test("Form 172 AMT retained review owns all source bytes and bindings before hashing", async () => {
  const { binding, documents } = await source();
  const pending = stageForm172AmtReviewSource(binding, documents);
  binding.taxpayer_ssn = "999887777";
  binding.amt_origin.sha256 = "0".repeat(64);
  binding.annual.reference = "changed";
  for (const d of documents) {
    d.bytes.fill(32);
    d.reference = "changed";
  }
  const r = await pending;
  assertEquals(r.originAmtNol, 80000);
  assertEquals(r.ordinary90PercentLimit, 90000);
  assertEquals(r.taxpayerSsn, "111223333");
});
