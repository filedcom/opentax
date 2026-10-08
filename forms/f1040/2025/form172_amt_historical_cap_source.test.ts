import { assertEquals, assertRejects } from "@std/assert";
import { form172AmtLegacyTentativeLines } from "./form172_amt_annual_limit.ts";
import {
  stageForm172HistoricalAmtCapSource,
  stageForm172HistoricalAmtDeductionAllocationSource,
} from "./form172_amt_historical_cap_source.ts";
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
function historicalSources(year = 2017) {
  const regular = origin();
  const {
    noncapital_income,
    noncapital_deductions,
    capital_gains,
    capital_losses,
    prior_nol_deductions,
  } = regular;
  noncapital_deductions[1].amount = 6350;
  const old = {
    source_format: "reviewed_legacy_loss_year",
    reference: `legacy-${year}`,
    tax_year: year,
    taxpayer_ssn: "111223333",
    filing_status: "single",
    inventory: {
      noncapital_income,
      noncapital_deductions,
      capital_gains,
      capital_losses,
      prior_nol_deductions,
    },
    reviewed_form1040: {
      reference: `regular-return-${year}`,
      tax_year: year,
      taxpayer_ssn: "111223333",
      filing_status: "single",
      agi: -103000,
      standard_or_itemized_deduction: 6350,
      personal_exemptions: 4050,
      reported_taxable_income: 0,
    },
    section199_deduction: { reference: "regular-dpad", amount: 3000 },
    limitations_review: {
      reference: "historical-limitations",
      at_risk_and_passive_limits_applied: true,
      itemized_phaseout_applied: true,
    },
  };
  const modern = amt();
  const alternative = {
    ...modern,
    regular_origin_reference: old.reference,
    amt_inventory: {
      ...modern.amt_inventory,
      tax_year: year,
      limitations_review: {
        reference: "amt-historical-limitations",
        at_risk_and_passive_limits_applied: true,
        itemized_phaseout_applied: true,
      },
    },
    reviewed_amt: {
      ...modern.reviewed_amt,
      tax_year: year,
      amti_before_atnold: -83000,
      section199_deduction: { reference: "amt-dpad", amount: 3000 },
    },
  };
  return { old, alternative };
}

function fixture() {
  const loss = (
    year: number,
    opening: number,
    category: "ordinary" | "whbaa",
  ) => {
    const { old, alternative } = historicalSources(year);
    alternative.reference = `amt-origin-${year}`;
    alternative.amt_inventory.reference = `amt-items-${year}`;
    alternative.reviewed_amt.reference = `amt-return-${year}`;
    return {
      reference: `loss-review-${year}`,
      regular_origin: old,
      amt_origin: alternative,
      reviewed_opening_amt_nol: opening,
      category,
      ...(category === "whbaa"
        ? { whbaa_election_reference: `election-${year}` }
        : {}),
    };
  };
  return {
    reference: "cap-workpaper",
    all_application_year_amt_vintages_included: true,
    annual_review: {
      reference: "annual-2014",
      tax_year: 2014,
      taxpayer_ssn: "111223333",
      form6251_reference: "return-2014",
      before_all_atnold: true,
      tentative_depletion_refigured_with_zero_atnold: true,
      section199_deduction: { reference: "annual-dpad", amount: 0 },
      components: form172AmtLegacyTentativeLines.map((line) => ({
        line,
        reference: `line-${line}`,
        amount: line === "1" ? 100 : 0,
      })),
    },
    losses: [loss(2008, 200, "ordinary"), loss(2009, 100, "whbaa")],
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
  const workpaper = fixture();
  const bytes = new TextEncoder().encode(JSON.stringify(workpaper));
  const binding = {
    workpaper: { reference: workpaper.reference, sha256: await sha(bytes) },
    application_tax_year: 2014,
    taxpayer_ssn: "111223333",
  };
  const documents = [{ reference: workpaper.reference, bytes }];
  return { workpaper, binding, documents };
}
Deno.test("Historical AMT source recomputes retained cap without promoting carry or election proof", async () => {
  const f = await source();
  const r = await stageForm172HistoricalAmtCapSource(f.binding, f.documents);
  assertEquals(r.aggregateHistoricalCap, 100);
  assertEquals(r.ordinaryCapComponent, 90);
  assertEquals(r.whbaaCapComponent, 10);
  assertEquals(r.review_package_manifest, [f.binding.workpaper]);
  assertEquals(r.reviewPackageBytesVerified, true);
  for (
    const flag of [
      r.whbaaElectionEligibilityVerified,
      r.openingAmtCarryAvailabilityVerified,
      r.chronologicalAbsorptionReconciled,
      r.finalAtnoldReconciled,
      r.electionDocumentAuthenticityVerified,
      r.acceptedCarryImportVerified,
      r.packetAdmissionVerified,
      r.filingReady,
    ]
  ) assertEquals(flag, false);
});
Deno.test("Historical AMT source rejects changed bytes and missing duplicate extra packages", async () => {
  const f = await source();
  const changed = new Uint8Array(f.documents[0].bytes);
  changed[10] ^= 1;
  for (
    const docs of [[], [...f.documents, ...f.documents], [...f.documents, {
      reference: "extra",
      bytes: new Uint8Array(),
    }], [{ ...f.documents[0], bytes: changed }]]
  ) {
    await assertRejects(() =>
      stageForm172HistoricalAmtCapSource(f.binding, docs)
    );
  }
});
Deno.test("Historical AMT source rejects bound owner spouse year reference and asserted results", async () => {
  const f = await source();
  for (
    const patch of [
      { taxpayer_ssn: "999887777" },
      { spouse_ssn: "999887777" },
      { application_tax_year: 2015 },
      { finalAtnold: 100 },
      { workpaper: { ...f.binding.workpaper, reference: "other" } },
    ]
  ) {
    await assertRejects(() =>
      stageForm172HistoricalAmtCapSource(
        { ...f.binding, ...patch },
        f.documents,
      )
    );
  }
});
Deno.test("Historical AMT source recomputes origin and category after replacement digest", async () => {
  const f = await source();
  f.workpaper.losses[0].amt_origin.reviewed_amt.amti_before_atnold = -83001;
  let bytes = new TextEncoder().encode(JSON.stringify(f.workpaper));
  f.documents[0].bytes = bytes;
  f.binding.workpaper.sha256 = await sha(bytes);
  await assertRejects(() =>
    stageForm172HistoricalAmtCapSource(f.binding, f.documents)
  );
  const g = await source();
  delete g.workpaper.losses[1].whbaa_election_reference;
  bytes = new TextEncoder().encode(JSON.stringify(g.workpaper));
  g.documents[0].bytes = bytes;
  g.binding.workpaper.sha256 = await sha(bytes);
  await assertRejects(() =>
    stageForm172HistoricalAmtCapSource(g.binding, g.documents)
  );
});
Deno.test("Historical AMT source rejects noncanonical duplicate keys BOM and invalid UTF8", async () => {
  const f = await source();
  const text = new TextDecoder().decode(f.documents[0].bytes);
  for (
    const bytes of [
      new TextEncoder().encode(" " + text),
      new TextEncoder().encode(
        text.replace(
          '"reference":"cap-workpaper"',
          '"reference":"other","reference":"cap-workpaper"',
        ),
      ),
      new Uint8Array([0xef, 0xbb, 0xbf, ...f.documents[0].bytes]),
      new Uint8Array([0xff]),
    ]
  ) {
    const binding = {
      ...f.binding,
      workpaper: { ...f.binding.workpaper, sha256: await sha(bytes) },
    };
    await assertRejects(() =>
      stageForm172HistoricalAmtCapSource(binding, [{
        reference: f.documents[0].reference,
        bytes,
      }])
    );
  }
});
Deno.test("Historical AMT source owns binding and source arrays before first digest await", async () => {
  const f = await source();
  const originalSha = f.binding.workpaper.sha256;
  const promise = stageForm172HistoricalAmtCapSource(f.binding, f.documents);
  f.binding.workpaper.sha256 = "0".repeat(64);
  f.binding.application_tax_year = 2015;
  f.binding.taxpayer_ssn = "999887777";
  f.documents[0].bytes.fill(0);
  f.documents[0].reference = "other";
  f.documents.length = 0;
  const r = await promise;
  assertEquals(r.aggregateHistoricalCap, 100);
  assertEquals(r.applicationYear, 2014);
  assertEquals(r.review_package_manifest[0].sha256, originalSha);
  assertEquals(r.taxpayerSsn, "111223333");
});

Deno.test("Historical AMT byte-bound allocation recomputes chronology without promoting legal availability", async () => {
  const f = await source();
  const r = await stageForm172HistoricalAmtDeductionAllocationSource(
    f.binding,
    f.documents,
  );
  assertEquals(
    r.chronologicalDeductionAllocations.map(
      (v) => [v.originYear, v.allocatedDeduction],
    ),
    [[2008, 90], [2009, 10]],
  );
  assertEquals(r.review_package_manifest, [f.binding.workpaper]);
  assertEquals(r.reviewPackageBytesVerified, true);
  assertEquals(r.historicalDeductionAllocationArithmeticReconciled, true);
  for (
    const flag of [
      r.chronologicalAbsorptionReconciled,
      r.finalAtnoldReconciled,
      r.acceptedCarryImportVerified,
      r.electionDocumentAuthenticityVerified,
      r.packetAdmissionVerified,
      r.filingReady,
    ]
  ) assertEquals(flag, false);
  f.workpaper.losses[0].category = "whbaa";
  f.workpaper.losses[0].whbaa_election_reference = "election-2008";
  f.workpaper.losses[1].category = "ordinary";
  delete f.workpaper.losses[1].whbaa_election_reference;
  f.workpaper.losses.reverse();
  f.documents[0].bytes = new TextEncoder().encode(JSON.stringify(f.workpaper));
  f.binding.workpaper.sha256 = await sha(f.documents[0].bytes);
  const earlier = await stageForm172HistoricalAmtDeductionAllocationSource(
    f.binding,
    f.documents,
  );
  assertEquals(earlier.whbaaCapComponent, 10);
  assertEquals(
    earlier.chronologicalDeductionAllocations.map(
      (v) => [v.originYear, v.allocatedDeduction],
    ),
    [[2008, 100], [2009, 0]],
  );
});
Deno.test("Historical AMT allocation source rejects altered bytes inventory and owner year joins", async () => {
  const f = await source();
  const altered = new Uint8Array(f.documents[0].bytes);
  altered[10] ^= 1;
  for (
    const docs of [[], [...f.documents, ...f.documents], [...f.documents, {
      reference: "extra",
      bytes: new Uint8Array(),
    }], [{ ...f.documents[0], bytes: altered }]]
  ) {
    await assertRejects(() =>
      stageForm172HistoricalAmtDeductionAllocationSource(f.binding, docs)
    );
  }
  for (
    const patch of [
      { taxpayer_ssn: "999887777" },
      { application_tax_year: 2015 },
      { spouse_ssn: "999887777" },
      { finalAtnold: 100 },
    ]
  ) {
    await assertRejects(() =>
      stageForm172HistoricalAmtDeductionAllocationSource({
        ...f.binding,
        ...patch,
      }, f.documents)
    );
  }
  const changed = {
    ...f.workpaper,
    chronologicalDeductionAllocations: [{
      originYear: 2008,
      allocatedDeduction: 100,
    }],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(changed));
  const digest = await sha(bytes);
  await assertRejects(() =>
    stageForm172HistoricalAmtDeductionAllocationSource({
      ...f.binding,
      workpaper: { ...f.binding.workpaper, sha256: digest },
    }, [{ reference: f.workpaper.reference, bytes }])
  );
});
Deno.test("Historical AMT allocation source recomputes origins even after a matching replacement hash", async () => {
  const f = await source();
  f.workpaper.losses[0].amt_origin.reviewed_amt.amti_before_atnold = -83001;
  let bytes = new TextEncoder().encode(JSON.stringify(f.workpaper));
  const digestF = await sha(bytes);
  await assertRejects(() =>
    stageForm172HistoricalAmtDeductionAllocationSource({
      ...f.binding,
      workpaper: { ...f.binding.workpaper, sha256: digestF },
    }, [{ reference: f.workpaper.reference, bytes }])
  );
  const g = await source();
  delete g.workpaper.losses[1].whbaa_election_reference;
  bytes = new TextEncoder().encode(JSON.stringify(g.workpaper));
  const digest = await sha(bytes);
  await assertRejects(() =>
    stageForm172HistoricalAmtDeductionAllocationSource({
      ...g.binding,
      workpaper: { ...g.binding.workpaper, sha256: digest },
    }, [{ reference: g.workpaper.reference, bytes }])
  );
});
Deno.test("Historical AMT allocation owns caller binding and bytes before awaiting the digest", async () => {
  const f = await source();
  const originalSha = f.binding.workpaper.sha256;
  const promise = stageForm172HistoricalAmtDeductionAllocationSource(
    f.binding,
    f.documents,
  );
  f.binding.workpaper.sha256 = "0".repeat(64);
  f.binding.application_tax_year = 2015;
  f.binding.taxpayer_ssn = "999887777";
  f.documents[0].bytes.fill(0);
  f.documents[0].reference = "other";
  f.documents.length = 0;
  const r = await promise;
  assertEquals(
    r.chronologicalDeductionAllocations.map((v) => v.allocatedDeduction),
    [90, 10],
  );
  assertEquals(r.review_package_manifest[0].sha256, originalSha);
  assertEquals(r.applicationYear, 2014);
  assertEquals(r.taxpayerSsn, "111223333");
});
