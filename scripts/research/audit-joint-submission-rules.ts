import * as fs from "node:fs/promises";
import { createReturnContext } from "../../core/validation/context.ts";
import { evaluateRules } from "../../core/validation/engine.ts";
import { ruleFormPrefix } from "../../core/validation/rule-builder.ts";
import { FIELD_REGISTRY } from "../../forms/f1040/validation/field-registry.ts";
import { ALL_RULES } from "../../forms/f1040/validation/rules/index.ts";
import {
  emittedValidationScope,
  isTransmissionOnlyRule,
  validateBusinessRules,
} from "../../cli/commands/export.ts";
import { returnHeaderNameLine1 } from "../../forms/f1040/mef/header.ts";
import { normalizeAllPending } from "../../forms/f1040/2025/return-processing/pending.ts";
const evidenceDir = process.argv.slice(2)[0];
if (!evidenceDir) {
  throw new Error(
    "Usage: audit-joint-submission-rules.ts <archive-evidence-directory>",
  );
}
const evidencePath = (name: string) => `${evidenceDir}/${name}`;
const results = [];
for (let i = 0; i < 5; i++) {
  const { pending: rawPending, filer } = JSON.parse(
    await fs.readFile(evidencePath(`${i}.json`), "utf8"),
  );
  const pending = normalizeAllPending(rawPending);
  const xml = await fs.readFile(evidencePath(`${i}.xml`), "utf8");
  const scope = emittedValidationScope(xml);
  const ctx = createReturnContext(
    pending,
    {
      ...filer,
      primarySSN: filer.primarySSN,
      spouseSSN: filer.spouse?.ssn,
      filingStatus: typeof pending.f1040.filing_status === "number"
        ? pending.f1040.filing_status
        : 0,
      NameLine1Txt: returnHeaderNameLine1(filer),
      returnVersion: scope.returnVersion,
    },
    FIELD_REGISTRY,
    scope.formCounts,
  );
  const rules = ALL_RULES.filter((r) => !isTransmissionOnlyRule(r.ruleNumber));
  const report = evaluateRules(rules, ctx, scope.rulePrefixes);
  const counts = { outsideScope: 0, serverOnly: 0, stub: 0, executable: 0 };
  for (const r of rules) {
    if (!scope.rulePrefixes.has(ruleFormPrefix(r.ruleNumber))) {
      counts.outsideScope++;
    } else if (["database", "duplicate"].includes(r.category)) {
      counts.serverOnly++;
    } else if (r.check === null) counts.stub++;
    else counts.executable++;
  }
  let exportResult = "passed";
  try {
    validateBusinessRules(pending, filer, false, scope);
  } catch (e) {
    exportResult = String(e);
  }
  const fields = [
    "CalculatedTotalTaxableIntAmt",
    "TaxableInterestAmt",
    "TotalOrdinaryDividendsAmt",
    "OrdinaryDividendsAmt",
    "BusinessIncomeLossAmt",
    "NetProfitOrLossAmt",
    "TaxesLessCreditsAmt",
    "AdjustedCreditLimitAmt",
    "EgyEffcntHmImprvCrAmt",
    "TotalIncomeAmt",
    "DeductibleSelfEmploymentTaxAmt",
  ];
  results.push({
    case: i,
    filingStatus: ctx.filingStatus(),
    fields: Object.fromEntries(
      fields.map(
        (name) => [name, {
          location: FIELD_REGISTRY.get(name),
          value: ctx.field(name),
        }],
      ),
    ),
    scope: [...scope.rulePrefixes],
    formCounts: Object.fromEntries(scope.formCounts),
    counts,
    report,
    exportResult,
  });
}
await fs.writeFile(
  evidencePath("business-rule-results.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    results.map(({ case: c, counts, report, exportResult }) => ({
      case: c,
      counts,
      summary: report.summary,
      rejectionRules: report.entries.map((entry) => entry.ruleNumber),
      exportBlocked: exportResult !== "passed",
    })),
    null,
    2,
  ),
);
