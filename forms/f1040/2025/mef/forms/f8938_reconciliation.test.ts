import { assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import type { MefBuildContext } from "../form-descriptor.ts";
import { form8938Fixture } from "./f8938.fixture.ts";
import { form8938 } from "./f8938.ts";
import { assertForm8938ReturnReconciliation } from "./f8938_reconciliation.ts";

function prepared(): MefBuildContext {
  return {
    phase: "final",
    filer: { filingStatus: FilingStatus.Single } as FilerIdentity,
    pending: {
      f1040: {
        filing_status: "single",
        line2b_taxable_interest: 200,
        line3b_ordinary_dividends: 100,
      },
      schedule_b: {
        interest_rows: [{ payerName: "Example Swiss Bank", amount: 200 }],
        dividend_rows: [{ payerName: "Example Foreign Corp.", amount: 100 }],
      },
      form8621: {
        items: [{
          item: { company_name: "Example PFIC", company_ein_or_ref: "PFIC1" },
        }],
      },
    },
    documentIdsByTag: {
      IRS1040: ["IRS10400"],
      IRS1040ScheduleB: ["IRS1040ScheduleB1"],
      IRS8621: ["IRS862117"],
    },
    documentIdsByPendingKey: { form8621: ["IRS862117"] },
  };
}

Deno.test("staged Form 8938 matches finalized interest/dividend rows and prepared PFIC document", () => {
  const source = form8938Fixture();
  const context = prepared();
  assertForm8938ReturnReconciliation(source, context);
  assertStringIncludes(form8938.build(source, context), "<IRS8938>");
});

Deno.test("staged Form 8938 rejects changed finalized line, payer, and return status", () => {
  const source = form8938Fixture();
  const base = prepared();
  assertThrows(() =>
    assertForm8938ReturnReconciliation(source, {
      ...base,
      pending: {
        ...base.pending,
        f1040: {
          filing_status: "single",
          line2b_taxable_interest: 201,
          line3b_ordinary_dividends: 100,
        },
      },
    })
  );
  assertThrows(() =>
    assertForm8938ReturnReconciliation(source, {
      ...base,
      pending: {
        ...base.pending,
        schedule_b: {
          interest_rows: [{ payerName: "Other Bank", amount: 200 }],
          dividend_rows: [{ payerName: "Example Foreign Corp.", amount: 100 }],
        },
      },
    })
  );
  assertThrows(() =>
    assertForm8938ReturnReconciliation(source, {
      ...base,
      filer: {
        filingStatus: FilingStatus.MarriedFilingJointly,
      } as FilerIdentity,
    })
  );
});

Deno.test("staged Form 8938 rejects missing or mismatched Part IV prepared document", () => {
  const source = form8938Fixture();
  const base = prepared();
  assertThrows(() =>
    assertForm8938ReturnReconciliation(source, {
      ...base,
      documentIdsByTag: {
        IRS1040: ["IRS10400"],
        IRS1040ScheduleB: ["IRS1040ScheduleB1"],
      },
    })
  );
  assertThrows(() =>
    assertForm8938ReturnReconciliation(source, {
      ...base,
      pending: {
        ...base.pending,
        form8621: {
          items: [{
            item: {
              company_name: "Different PFIC",
              company_ein_or_ref: "PFIC1",
            },
          }],
        },
      },
    })
  );
  assertThrows(() =>
    assertForm8938ReturnReconciliation({
      ...source,
      assets: source.assets.map((asset, index) =>
        index === 2
          ? { ...asset, filed_exception_form_reference: "IRS862199" }
          : asset
      ),
    }, base)
  );
});

Deno.test("staged Form 8938 fails closed on unsupported Part III and Part IV joins", () => {
  const source = form8938Fixture();
  const base = prepared();
  assertThrows(() =>
    assertForm8938ReturnReconciliation({
      ...source,
      assets: source.assets.map((asset, index) =>
        index === 1
          ? {
            ...asset,
            tax_items: [{
              kind: "gain_loss",
              amount_usd: 100,
              filed_form_and_line: "Schedule D line 1",
            }],
          }
          : asset
      ),
    }, base)
  );
  assertThrows(() =>
    assertForm8938ReturnReconciliation({
      ...source,
      assets: source.assets.map((asset, index) =>
        index === 2 ? { ...asset, excepted_on_form: "5471" } : asset
      ),
    }, base)
  );
});
