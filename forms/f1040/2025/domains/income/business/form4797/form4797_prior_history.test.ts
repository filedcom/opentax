import {
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  calculateSection1231History,
  type Section1231PriorHistory,
} from "../../../../../nodes/intermediate/forms/income/business/form4797/prior_history.ts";
import { irsSection1231History } from "../../../../../nodes/intermediate/forms/income/business/form4797/prior_history.fixture.ts";
import { paymentPackets } from "../../investments/form6252/form6252_payments.fixture.ts";

const base = paymentPackets[0].inputs;
const business = paymentPackets[5].inputs.form6252[2];
const blankHistory = {
  ...irsSection1231History,
  filed_years: irsSection1231History.filed_years.map((year) => ({
    ...year,
    filed_line7_net_gain_loss: 0,
    section1231_loss_taken_into_account: 0,
    filed_line8_nonrecaptured_loss: undefined,
    filed_line12_recaptured_gain: undefined,
  })),
};

function sourceInputs(
  history: Section1231PriorHistory,
  net: number,
  mixed = false,
) {
  return {
    general: history.owner.spouse_ssn
      ? {
        ...base.general,
        filing_status: FilingStatus.MFJ,
        spouse_first_name: "Bea",
        spouse_last_name: "Taxpayer",
        spouse_ssn: history.owner.spouse_ssn,
        spouse_dob: "1985-05-15",
      }
      : base.general,
    w2: base.w2,
    form4797_prior_history: { section_1231_prior_history: history },
    ...(net >= 0
      ? {
        form6252: [{ ...business, payments_received: mixed ? 10000 : net * 2 }],
      }
      : {}),
    ...(net < 0 || mixed
      ? {
        k1_partnership: [{
          partnership_name: "Reviewed Land Partnership",
          partnership_ein: "120000001",
          source_document_reference: "2025 partnership section 1231 source",
          recipient_tin: history.owner.spouse_ssn ?? history.owner.taxpayer_ssn,
          box10_net_1231: mixed ? net - 5000 : net,
        }],
      }
      : {}),
  };
}

const cases = [
  {
    id: "irs-example",
    history: irsSection1231History,
    net: 2000,
    ordinary: 2000,
    capital: 0,
    next: 5000,
  },
  {
    id: "partial-recapture",
    history: irsSection1231History,
    net: 10000,
    ordinary: 7000,
    capital: 3000,
    next: 0,
  },
  {
    id: "no-current-gain",
    history: irsSection1231History,
    net: 0,
    ordinary: 0,
    capital: 0,
    next: 6000,
  },
  {
    id: "new-current-loss",
    history: {
      ...irsSection1231History,
      current_year_loss_taken_into_account: 3000,
      current_year_loss_source_reference: "synthetic current deduction review",
    },
    net: -3000,
    ordinary: -3000,
    capital: 0,
    next: 9000,
  },
  {
    id: "mixed-current-sources",
    history: irsSection1231History,
    net: 2000,
    ordinary: 2000,
    capital: 0,
    next: 5000,
    mixed: true,
  },
  {
    id: "no-prior-losses",
    history: blankHistory,
    net: 10000,
    ordinary: 0,
    capital: 10000,
    next: 0,
  },
  {
    id: "expired-prior-loss",
    history: {
      ...blankHistory,
      opening_2020_losses: [{ loss_year: 2019, remaining_loss: 9000 }],
    },
    net: 10000,
    ordinary: 0,
    capital: 10000,
    next: 0,
  },
  {
    id: "joint-unchanged-owners",
    history: {
      ...irsSection1231History,
      owner: { taxpayer_ssn: "123456789", spouse_ssn: "987654321" },
      filed_years: irsSection1231History.filed_years.map((year) => ({
        ...year,
        owner: { taxpayer_ssn: "123456789", spouse_ssn: "987654321" },
      })),
    },
    net: 2000,
    ordinary: 2000,
    capital: 0,
    next: 5000,
    mixed: true,
  },
];

function evidenceRoot() {
  try {
    return Deno.env.get("FORM4797_PRIOR_HISTORY_DIR");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}

for (const entry of cases) {
  Deno.test(`Form 4797 reviewed history public calculation and export boundary: ${entry.id}`, async () => {
    const inputs = sourceInputs(entry.history, entry.net, entry.mixed);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.form4797.section_1231_gain ?? 0, entry.net);
    assertEquals(pending.schedule1?.line4_other_gains ?? 0, entry.ordinary);
    assertEquals(pending.f1040.line7_capital_gain ?? 0, entry.capital);
    assertEquals(pending.f1040.line8_additional_income ?? 0, entry.ordinary);
    assertEquals(pending.f1040.line11_agi, 150000 + entry.net);
    assertEquals(
      result.carryforwards.section_1231_nonrecaptured_loss_2026,
      entry.next,
    );
    const ledger = calculateSection1231History(entry.history, entry.net);
    assertEquals(
      pending.form4797.nonrecaptured_1231_loss,
      ledger.current.opening_nonrecaptured_loss,
    );
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const message =
      "prior-loss history needs authenticated filed returns and acceptance evidence";
    const nativeError = await assertRejects(
      () => f1040_2025.prepareReturn(result.pending, filer),
      Error,
      message,
    );
    const pdfError = await assertRejects(
      () => buildPdfBytes(pending, filer),
      Error,
      message,
    );
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            carryforwards: result.carryforwards,
            ledger,
            expected: {
              ordinary: entry.ordinary,
              capital: entry.capital,
              next: entry.next,
            },
            nativeError: nativeError.message,
            pdfError: pdfError.message,
            completeFilingPacket: false,
            authenticityVerified: false,
            irsAcceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
  });
}

Deno.test("Form 4797 public prior history rejects another taxpayer and mismatched joint owners", () => {
  const inputs = sourceInputs(irsSection1231History, 2000);
  assertThrows(
    () =>
      f1040_2025.executeReturn({
        ...inputs,
        general: { ...inputs.general, taxpayer_ssn: "999887777" },
      }),
    Error,
    "current taxpayer",
  );
  assertThrows(
    () =>
      f1040_2025.executeReturn({
        ...inputs,
        general: {
          ...inputs.general,
          filing_status: FilingStatus.MFJ,
          spouse_ssn: "987654321",
        },
      }),
    Error,
    "joint-filing spouse",
  );
});

Deno.test("Form 4797 public history cannot inject a prior-loss balance or stale year source", () => {
  const inputs = sourceInputs(irsSection1231History, 2000);
  assertThrows(() =>
    f1040_2025.executeReturn({
      ...inputs,
      form4797_prior_history: {
        ...inputs.form4797_prior_history,
        nonrecaptured_1231_loss: 1,
      },
    })
  );
  const changed = structuredClone(irsSection1231History);
  changed.filed_years[4].filed_line12_recaptured_gain = 2999;
  const rejected = f1040_2025.executeReturn(sourceInputs(changed, 2000));
  assertEquals(
    rejected.diagnostics.some((diagnostic) =>
      diagnostic.message.includes("oldest-first")
    ),
    true,
  );
});

Deno.test("Form 4797 public history rejects a current loss limited outside the calculation", () => {
  const result = f1040_2025.executeReturn(sourceInputs({
    ...irsSection1231History,
    current_year_loss_taken_into_account: 1000,
    current_year_loss_source_reference: "synthetic current deduction review",
  }, -3000));
  assertEquals(
    result.diagnostics.some((diagnostic) =>
      diagnostic.message.includes("limited current loss needs its finalized")
    ),
    true,
  );
  assertEquals(
    result.carryforwards.section_1231_nonrecaptured_loss_2026,
    undefined,
  );
});
