import { assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../form8992.fixture.ts";
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

function with5471() {
  const source = form8938Fixture();
  return {
    ...source,
    assets: source.assets.map((asset, index) =>
      index === 1
        ? {
          ...asset,
          asset_identifier: "FC001",
          country: "EI",
          institution_or_issuer_name: "Example Foreign Corp",
          institution_or_issuer_address: {
            line1: "1 River Street",
            city: "Dublin",
            country: "EI",
            postal_code: "D02 ABC1",
          },
          excepted_on_form: "5471",
          filed_exception_form_reference: "IRS547113",
          tax_items: [],
        }
        : asset
    ),
  };
}

function prepared5471(): MefBuildContext {
  const base = prepared();
  return {
    ...base,
    filer: form8992Filer,
    pending: { ...base.pending, ...form8992Pending },
    documentIdsByTag: {
      ...base.documentIdsByTag,
      IRS5471: ["IRS547113"],
    },
    documentIdsByPendingKey: {
      ...base.documentIdsByPendingKey,
      f5471_parent: ["IRS547113"],
    },
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

Deno.test("staged Form 8938 joins a Part IV CFC to prepared Form 5471 and its shareholder", () => {
  const source = with5471();
  const context = prepared5471();
  assertForm8938ReturnReconciliation(source, context);
  assertStringIncludes(
    form8938.build(source, context),
    "<Form5471Cnt>1</Form5471Cnt>",
  );
});

Deno.test("staged Form 8938 rejects changed CFC owner, issuer, address, or document ID", () => {
  const source = with5471();
  const context = prepared5471();
  for (
    const change of [
      { owner: "spouse" },
      { asset_identifier: "FC002" },
      {
        institution_or_issuer_address: {
          line1: "2 River Street",
          city: "Dublin",
          country: "EI",
          postal_code: "D02 ABC1",
        },
      },
      { filed_exception_form_reference: "IRS547199" },
    ]
  ) {
    assertThrows(() =>
      assertForm8938ReturnReconciliation({
        ...source,
        assets: source.assets.map((asset, index) =>
          index === 1 ? { ...asset, ...change } : asset
        ),
      }, context)
    );
  }
  assertThrows(() =>
    assertForm8938ReturnReconciliation(source, {
      ...context,
      pending: {
        ...context.pending,
        f5471: { f5471s: [{ ...form8992Cfc, shareholder_tin: "999999999" }] },
      },
    })
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
        index === 2 ? { ...asset, excepted_on_form: "8865" } : asset
      ),
    }, base)
  );
});
