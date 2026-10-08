import { assertEquals, assertRejects } from "@std/assert";
import {
  assertDocumentationPatch,
  assertMigrationDocuments,
  type DocumentationPatch,
  reviewedDocumentationPaths,
} from "./migration-documents.ts";

function patch(): DocumentationPatch {
  return {
    path: "docs/mef/ty2025/domains/adjustments/README.md",
    operation: "create",
    beforeSource: "",
    beforeSha256:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    afterSource:
      "# Adjustments\n\nAdjustments to income before adjusted gross income.\n\n| Area | Contents |\n| --- | --- |\n| [employment](employment) | 1 files |\n| [health](health) | 15 files |\n| [retirement](retirement) | 1 files |\n\nCanonical [Form 8889](../../../../../forms/f1040/2025/mef/forms/adjustments/health/f8889.ts) and [Form 8853](../../../../../forms/f1040/2025/mef/forms/adjustments/health/f8853.ts) families also produce [Income](../income/README.md) and additional [Taxes](../taxes/README.md) entries.\n",
    afterSha256:
      "48d096cd02afa373f3a74f84cdf39b5c8f4feefe0a20ddba46717bdd311637e7",
    reason: "Reviewed category navigation",
  };
}

Deno.test("finite documentation accepts exact reviewed category bytes", async () => {
  assertEquals(await assertDocumentationPatch(patch()), patch());
});

Deno.test("finite documentation rejects production, board, unknown and escaped paths", async () => {
  for (
    const path of [
      "forms/f1040/2025/tax.ts",
      "product_board.md",
      "docs/unreviewed.md",
      "../README.md",
    ]
  ) {
    await assertRejects(
      () => assertDocumentationPatch({ ...patch(), path }),
      Error,
      "outside exact reviewed boundary",
    );
  }
});

Deno.test("finite documentation rejects forged baseline, changed prose and hashes", async () => {
  for (
    const change of [
      { beforeSource: "unreviewed original" },
      { beforeSha256: "0".repeat(64) },
      { afterSource: patch().afterSource.replace("15 files", "16 files") },
      { afterSha256: "0".repeat(64) },
    ]
  ) {
    await assertRejects(
      () => assertDocumentationPatch({ ...patch(), ...change }),
      Error,
      "bytes differ",
    );
  }
});

Deno.test("finite documentation rejects missing addition, duplicate and incomplete inventory", async () => {
  const p = patch();
  const context = {
    files: [],
    inventory: { before: [], after: [p.path] },
    additions: [{ path: p.path }],
  };
  const actual = new Map([[p.path, p.afterSource]]);
  await assertRejects(
    () => assertMigrationDocuments([p], { ...context, additions: [] }, actual),
    Error,
    "Invalid reviewed documentation addition",
  );
  await assertRejects(
    () => assertMigrationDocuments([p, p], context, actual),
    Error,
    "Duplicate documentation patch",
  );
  await assertRejects(
    () => assertMigrationDocuments([p], context, actual),
    Error,
    "inventory is incomplete",
  );
});

Deno.test("finite documentation rejects stale disk and falsely declared creation", async () => {
  const p = patch();
  const context = {
    files: [],
    inventory: { before: [], after: [p.path] },
    additions: [{ path: p.path }],
  };
  await assertRejects(
    () =>
      assertMigrationDocuments(
        [p],
        context,
        new Map([[p.path, "stale actual file"]]),
      ),
    Error,
    "Actual documentation differs",
  );
  await assertRejects(
    () =>
      assertMigrationDocuments([p], {
        ...context,
        inventory: { before: [p.path], after: [p.path] },
      }, new Map([[p.path, p.afterSource]])),
    Error,
    "Invalid reviewed documentation addition",
  );
});

Deno.test("finite documentation rejects omission of every patch from the reviewed final layout", async () => {
  await assertRejects(
    () =>
      assertMigrationDocuments([], {
        files: [],
        inventory: { before: [], after: [...reviewedDocumentationPaths] },
        additions: [],
      }, new Map()),
    Error,
    "inventory is incomplete",
  );
});

Deno.test("unchanged original STRUCTURE requires its exact reviewed baseline and original inventory membership", async () => {
  const document: DocumentationPatch = {
    "path": "docs/architecture/STRUCTURE.md",
    "beforeSource":
      '# Repository Structure\n\nPublic entrypoints are `mod.ts`, `catalog.ts`, `cli/main.ts`, and `forms/f1040/2025/index.ts`. See [repository organization](./repository-organization.md) for the responsibilities of each boundary.\n\n```text\n/\n\u251c\u2500\u2500 CLAUDE.md                      # Coding conventions\n\u251c\u2500\u2500 mod.ts / catalog.ts            # Public API and supported form catalog\n\u251c\u2500\u2500 deno.json / deno.lock           # Typed tasks and locked dependencies\n\u251c\u2500\u2500 cli/\n\u2502   \u251c\u2500\u2500 commands/                  # Return, form, node and export operations\n\u2502   \u251c\u2500\u2500 store/                     # Return persistence and guarded carry archives\n\u2502   \u2514\u2500\u2500 utils/\n\u251c\u2500\u2500 core/\n\u2502   \u251c\u2500\u2500 runtime/                   # Execution, graph and source-document contracts\n\u2502   \u251c\u2500\u2500 types/                     # Shared node and form types\n\u2502   \u251c\u2500\u2500 validation/                # Business-rule engine\n\u2502   \u2514\u2500\u2500 test-utils/\n\u251c\u2500\u2500 forms/f1040/\n\u2502   \u251c\u2500\u2500 2025/\n\u2502   \u2502   \u251c\u2500\u2500 index.ts / config.ts    # Public year entrypoint and year constants\n\u2502   \u2502   \u251c\u2500\u2500 inputs.ts / registry.ts # Stable input and node registration\n\u2502   \u2502   \u251c\u2500\u2500 domains/               # Source reconciliation, fixtures and tests by tax concern\n\u2502   \u2502   \u251c\u2500\u2500 mef/forms/             # Native projections by the same tax domains\n\u2502   \u2502   \u2514\u2500\u2500 pdf/\n\u2502   \u2502       \u251c\u2500\u2500 forms/             # Printed form projections by tax domain\n\u2502   \u2502       \u2514\u2500\u2500 reviews/           # Retained review fixtures and contracts\n\u2502   \u251c\u2500\u2500 nodes/\n\u2502   \u2502   \u251c\u2500\u2500 config/                # Tax-year routing\n\u2502   \u2502   \u251c\u2500\u2500 inputs/<form>/         # Validated source nodes\n\u2502   \u2502   \u251c\u2500\u2500 intermediate/          # Aggregations, computed forms and worksheets\n\u2502   \u2502   \u2514\u2500\u2500 outputs/<form>/        # Final line assembly\n\u2502   \u251c\u2500\u2500 mef/                       # Shared headers and transport contracts\n\u2502   \u251c\u2500\u2500 validation/rules/          # Domain groups; stable index and rule IDs\n\u2502   \u2514\u2500\u2500 e2e/                       # Return contracts by domain; ATS scenarios together\n\u251c\u2500\u2500 docs/\n\u2502   \u251c\u2500\u2500 architecture/              # Internal design and repository navigation\n\u2502   \u251c\u2500\u2500 mef/ty2025/                # Readiness, inventory and source evidence by topic\n\u2502   \u251c\u2500\u2500 ty2026/                    # Source research by topic\n\u2502   \u251c\u2500\u2500 ats/ / releases/           # ATS correspondence drafts and release documents\n\u2502   \u2514\u2500\u2500 index.html / build/        # Existing static documentation site\n\u251c\u2500\u2500 scripts/\n\u2502   \u251c\u2500\u2500 testing/                   # Typed validation harness and negative contracts\n\u2502   \u251c\u2500\u2500 research/                  # PDF review generation and source checks\n\u2502   \u251c\u2500\u2500 verification/              # Inventory verification\n\u2502   \u251c\u2500\u2500 maintenance/               # Rule generation and independent source oracles\n\u2502   \u251c\u2500\u2500 release/                   # Compiled binary checks\n\u2502   \u2514\u2500\u2500 site/                      # Static site statistics\n\u251c\u2500\u2500 benchmark/\n\u2502   \u251c\u2500\u2500 run_benchmark.ts           # Independent expected-output comparison\n\u2502   \u251c\u2500\u2500 run_case.ts / run_all.ts   # Individual and bulk case execution\n\u2502   \u2514\u2500\u2500 cases/<form>/<year>/<case>/ # Paired input, expected and retained output files\n\u251c\u2500\u2500 .state/                        # Existing state and retained private evidence\n\u2514\u2500\u2500 .pdf-cache/                    # Existing downloaded form cache\n```\n\nYear, native and PDF domain groups use identity, income, investments, business, retirement, deductions, credits, health, taxes, international, payments and execution. Larger families have a second folder named for the form. Tests and fixtures remain beside the contracts they verify. Existing node, engine, CLI and benchmark case folders already provide semantic boundaries.\n\n## Benchmark case formats\n\n### input.json\n\n```json\n{\n  "year": 2025,\n  "scenario": "Human-readable description",\n  "source": "IRS VITA Pub 4491 TY2025, Exercise 2, p. 34",\n  "forms": [\n    { "node_type": "start", "data": { "general": { "filing_status": "single" } } },\n    { "node_type": "w2",    "data": { "box1_wages": 50000, "box2_fed_withheld": 6000 } }\n  ]\n}\n```\n\n### correct.json\n\n```json\n{\n  "case": "NN-description",\n  "scenario": "Human-readable description",\n  "year": 2025,\n  "source": "IRS VITA Pub 4491 TY2025, Exercise 2, p. 34",\n  "correct": {\n    "line11_agi": 50000,\n    "line15_taxable_income": 35000,\n    "line24_total_tax": 3962,\n    "line33_total_payments": 5001,\n    "line35a_refund": 1039,\n    "line37_amount_owed": 0\n  }\n}\n```\n\n**Required** (benchmark pass/fail): `line24_total_tax`, `line35a_refund`, `line37_amount_owed`\n\n**Optional** (shown for debugging): `line11_agi`, `line15_taxable_income`, `line33_total_payments`\n\nValues must come directly from an IRS publication. The `source` field must cite the specific pub, exercise, and page. Never compute values.\n',
    "beforeSha256":
      "d470a849d4e3c418996c44dd1fe8684471612f9fa78accb0fa94529061671ad5",
    "afterSource":
      '# Repository Structure\n\nPublic entrypoints are `mod.ts`, `catalog.ts`, `cli/main.ts`, and `forms/f1040/2025/index.ts`. See [repository organization](./repository-organization.md) for the responsibilities of each boundary.\n\n```text\n/\n\u251c\u2500\u2500 CLAUDE.md                      # Coding conventions\n\u251c\u2500\u2500 mod.ts / catalog.ts            # Public API and supported form catalog\n\u251c\u2500\u2500 deno.json / deno.lock           # Typed tasks and locked dependencies\n\u251c\u2500\u2500 cli/\n\u2502   \u251c\u2500\u2500 commands/                  # Return, form, node and export operations\n\u2502   \u251c\u2500\u2500 store/                     # Return persistence and guarded carry archives\n\u2502   \u2514\u2500\u2500 utils/\n\u251c\u2500\u2500 core/\n\u2502   \u251c\u2500\u2500 runtime/                   # Execution, graph and source-document contracts\n\u2502   \u251c\u2500\u2500 types/                     # Shared node and form types\n\u2502   \u251c\u2500\u2500 validation/                # Business-rule engine\n\u2502   \u2514\u2500\u2500 test-utils/\n\u251c\u2500\u2500 forms/f1040/\n\u2502   \u251c\u2500\u2500 2025/\n\u2502   \u2502   \u251c\u2500\u2500 index.ts / config.ts    # Public year entrypoint and year constants\n\u2502   \u2502   \u251c\u2500\u2500 inputs.ts / registry.ts # Stable input and node registration\n\u2502   \u2502   \u251c\u2500\u2500 domains/               # Source reconciliation, fixtures and tests by tax concern\n\u2502   \u2502   \u251c\u2500\u2500 mef/forms/             # Native projections by the same tax domains\n\u2502   \u2502   \u2514\u2500\u2500 pdf/\n\u2502   \u2502       \u251c\u2500\u2500 forms/             # Printed form projections by tax domain\n\u2502   \u2502       \u2514\u2500\u2500 reviews/           # Retained review fixtures and contracts\n\u2502   \u251c\u2500\u2500 nodes/\n\u2502   \u2502   \u251c\u2500\u2500 config/                # Tax-year routing\n\u2502   \u2502   \u251c\u2500\u2500 inputs/<section>/<group>/<form>/         # Validated source nodes\n\u2502   \u2502   \u251c\u2500\u2500 intermediate/          # Aggregations, computed forms and worksheets\n\u2502   \u2502   \u2514\u2500\u2500 outputs/<section>/<group>/<form>/        # Final line assembly\n\u2502   \u251c\u2500\u2500 mef/                       # Shared headers and transport contracts\n\u2502   \u251c\u2500\u2500 validation/rules/          # Domain groups; stable index and rule IDs\n\u2502   \u2514\u2500\u2500 e2e/                       # Return contracts by domain; ATS scenarios together\n\u251c\u2500\u2500 docs/\n\u2502   \u251c\u2500\u2500 architecture/              # Internal design and repository navigation\n\u2502   \u251c\u2500\u2500 mef/ty2025/                # Readiness, inventory and source evidence by topic\n\u2502   \u251c\u2500\u2500 ty2026/                    # Source research by topic\n\u2502   \u251c\u2500\u2500 ats/ / releases/           # ATS correspondence drafts and release documents\n\u2502   \u2514\u2500\u2500 index.html / build/        # Existing static documentation site\n\u251c\u2500\u2500 scripts/\n\u2502   \u251c\u2500\u2500 testing/                   # Typed validation harness and negative contracts\n\u2502   \u251c\u2500\u2500 research/                  # PDF review generation and source checks\n\u2502   \u251c\u2500\u2500 verification/              # Inventory verification\n\u2502   \u251c\u2500\u2500 maintenance/               # Rule generation and independent source oracles\n\u2502   \u251c\u2500\u2500 release/                   # Compiled binary checks\n\u2502   \u2514\u2500\u2500 site/                      # Static site statistics\n\u251c\u2500\u2500 benchmark/\n\u2502   \u251c\u2500\u2500 run_benchmark.ts           # Archived expected-output comparison\n\u2502   \u251c\u2500\u2500 run_case.ts / run_all.ts   # Individual and bulk case execution\n\u2502   \u2514\u2500\u2500 cases/<form>/<year>/<case>/ # Paired input, expected and retained output files\n\u251c\u2500\u2500 .state/                        # Existing state and retained private evidence\n\u2514\u2500\u2500 .pdf-cache/                    # Existing downloaded form cache\n```\n\nTax-facing boundaries use General, Income, Adjustments, Deductions, Credits, Taxes, and Payments. Business, retirement, investments, foreign and health are subgroups inside the relevant return section. Node inputs, intermediate forms/worksheets/aggregations and outputs retain their roles, with the same physical tax-section subfolders inside each role. Tests, fixtures and family research travel with their contracts. Runtime and tooling remain under separate role boundaries.\n\n## Benchmark case formats\n\n### input.json\n\n```json\n{\n  "year": 2025,\n  "scenario": "Human-readable description",\n  "source": "IRS VITA Pub 4491 TY2025, Exercise 2, p. 34",\n  "forms": [\n    { "node_type": "start", "data": { "general": { "filing_status": "single" } } },\n    { "node_type": "w2",    "data": { "box1_wages": 50000, "box2_fed_withheld": 6000 } }\n  ]\n}\n```\n\n### correct.json\n\n```json\n{\n  "case": "NN-description",\n  "scenario": "Human-readable description",\n  "year": 2025,\n  "source": "IRS VITA Pub 4491 TY2025, Exercise 2, p. 34",\n  "correct": {\n    "line11_agi": 50000,\n    "line15_taxable_income": 35000,\n    "line24_total_tax": 3962,\n    "line33_total_payments": 5001,\n    "line35a_refund": 1039,\n    "line37_amount_owed": 0\n  }\n}\n```\n\n**Required** (benchmark pass/fail): `line24_total_tax`, `line35a_refund`, `line37_amount_owed`\n\n**Optional** (shown for debugging): `line11_agi`, `line15_taxable_income`, `line33_total_payments`\n\nValues must come directly from an IRS publication. The `source` field must cite the specific pub, exercise, and page. Never compute values.\n',
    "afterSha256":
      "eb81671cce277acf249105944d3d69a646edad83f4fb163154b811d4e6f194ea",
    "reason":
      "Exact reviewed v11 category navigation/architecture replacement; finite path allowlist",
    "operation": "replace",
  };
  const actual = new Map([[document.path, document.afterSource]]);
  const context = {
    files: [],
    inventory: { before: [document.path], after: [document.path] },
    additions: [],
  };
  // The single-document fixture passes baseline checks, then fails full135 coverage.
  await assertRejects(
    () => assertMigrationDocuments([document], context, actual),
    Error,
    "inventory is incomplete",
  );
  await assertRejects(
    () =>
      assertMigrationDocuments([document], {
        ...context,
        inventory: { before: [], after: [document.path] },
      }, actual),
    Error,
    "Documentation baseline absent",
  );
  await assertRejects(
    () =>
      assertMigrationDocuments(
        [{ ...document, beforeSource: document.beforeSource + "forged" }],
        context,
        actual,
      ),
    Error,
    "bytes differ",
  );
});
