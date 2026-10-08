import { z } from "zod";

export const prerequisiteGuardSchema = z.object({
  file: z.string(),
  beforeSha256: z.string().regex(/^[a-f0-9]{64}$/),
  afterSha256: z.string().regex(/^[a-f0-9]{64}$/),
  beforeSource: z.string(),
  afterSource: z.string(),
  edits: z.array(
    z.object({
      line: z.number().int().positive(),
      old: z.string(),
      new: z.string(),
    }),
  ).min(1),
});

const reviewedTestLines = new Map<string, readonly number[]>([
  [
    "forms/f1040/2025/domains/business/business-schedule1-reconciliation.test.ts",
    [30],
  ],
  ["forms/f1040/2025/domains/execution/schedule1_box3_source_replay.test.ts", [
    114,
  ]],
  ["forms/f1040/2025/domains/execution/schedule1_grant_source_replay.test.ts", [
    107,
  ]],
  ["forms/f1040/2025/domains/execution/schedule1_rtaa_source.test.ts", [115]],
  [
    "forms/f1040/2025/domains/income/f1099m/f1099m_box8_substitute_sources.test.ts",
    [213, 281],
  ],
  [
    "forms/f1040/2025/domains/international/form1116/form1116_three_country_interest.test.ts",
    [240],
  ],
  [
    "forms/f1040/2025/domains/international/form1116/form1116_three_country_mixed.test.ts",
    [158],
  ],
  ["forms/f1040/2025/mef/forms/credits/f3800/f3800_current_rows.test.ts", [
    305,
  ]],
  ["forms/f1040/2025/mef/forms/credits/f3800/f3800_join.test.ts", [250]],
  ["forms/f1040/2025/mef/forms/credits/f3800/f3800_nonpassive.test.ts", [991]],
  ["forms/f1040/2025/mef/forms/credits/f3800/f3800_passive_rows.test.ts", [
    388,
  ]],
  ["forms/f1040/2025/mef/forms/credits/f8826_draft.test.ts", [367]],
  ["forms/f1040/2025/mef/forms/credits/f8912.test.ts", [278]],
  ["forms/f1040/2025/mef/forms/deductions/f8283/f8283.test.ts", [139, 812]],
  [
    "forms/f1040/2025/mef/forms/deductions/f8283/f8283_carryover_route.test.ts",
    [34],
  ],
  ["forms/f1040/2025/mef/forms/investments/schedule_b.test.ts", [558]],
  ["forms/f1040/2025/mef/forms/retirement/f8915f.test.ts", [107]],
  ["forms/f1040/2025/pdf/forms/retirement/f8915f.test.ts", [79]],
  ["forms/f1040/e2e/income/form1099m/form1099misc_box3_business.test.ts", [38]],
  ["forms/f1040/e2e/income/form1099m/form1099misc_box3_other.test.ts", [35]],
  ["forms/f1040/e2e/income/form1099m/form1099misc_schedule_c.test.ts", [37]],
  ["forms/f1040/e2e/income/form1099n/form1099nec_nonbusiness.test.ts", [36]],
  ["forms/f1040/e2e/income/form1099n/form1099nec_schedule_c.test.ts", [36]],
  ["forms/f1040/e2e/taxes/form8814/form8814_schedule_b.test.ts", [91]],
]);

const reviewedOtherGuardEdits = new Map<
  string,
  readonly { line: number; old: string; new: string }[]
>([
  ["forms/f1040/2025/pdf/reviews/credits/form8863-missing-1098t.test.ts", [{
    "line": 244,
    "old": "      if (xsdAvailable) await validateXml(prepared.bundle.xml);\n",
    "new":
      '      assertEquals(xsdAvailable, true, "Missing verification prerequisite: complete local XSD");\n      if (xsdAvailable) await validateXml(prepared.bundle.xml);\n',
  }, {
    "line": 686,
    "old": "    if (xsdAvailable) await validateXml(prepared.bundle.xml);\n",
    "new":
      '    assertEquals(xsdAvailable, true, "Missing verification prerequisite: complete local XSD");\n    if (xsdAvailable) await validateXml(prepared.bundle.xml);\n',
  }]],
  [
    "forms/f1040/2025/domains/retirement/form4972/form4972_partial_nua_death_estate_annuity.test.ts",
    [{
      "line": 372,
      "old": "  if (xsdAvailable) await validateXml(prepared.bundle.xml);\n",
      "new":
        '  assertEquals(xsdAvailable, true, "Missing verification prerequisite: complete local XSD");\n  if (xsdAvailable) await validateXml(prepared.bundle.xml);\n',
    }],
  ],
  ["forms/f1040/2025/domains/taxes/schedule1_form8814_source_replay.test.ts", [{
    "line": 69,
    "old": "  if (xsdAvailable) {\n",
    "new":
      '  assertEquals(xsdAvailable, true, "Missing verification prerequisite: complete local XSD");\n  if (xsdAvailable) {\n',
  }]],
  ["forms/f1040/2025/mef/tests/xsd-validation.test.ts", [{
    "line": 10491,
    "old":
      '  if (xsdAvailable) await validateXsd(xml, "TY2025 returnVersion");\n',
    "new":
      '  assertEquals(xsdAvailable, true, "Missing verification prerequisite: complete local XSD");\n  if (xsdAvailable) await validateXsd(xml, "TY2025 returnVersion");\n',
  }]],
  [
    "forms/f1040/2025/mef/forms/deductions/f8283/f8283_intellectual_property.test.ts",
    [{
      "line": 211,
      "old":
        "  if (await Deno.stat(xsdPath).then(() => true).catch(() => false)) {\n",
      "new":
        "  await Deno.stat(xsdPath);\n  if (await Deno.stat(xsdPath).then(() => true).catch(() => false)) {\n",
    }],
  ],
  ["forms/f1040/2025/mef/forms/income/foreign_employer_wages.test.ts", [{
    "line": 111,
    "old": "  if (hasXsd) {\n",
    "new":
      '  assertEquals(hasXsd, true, "Missing verification prerequisite: complete local XSD");\n  if (hasXsd) {\n',
  }]],
  [
    "forms/f1040/2025/pdf/reviews/composed/review-tip-health-cf-beneficiary.test.ts",
    [{
      "line": 227,
      "old": "      if (available) {\n",
      "new":
        '      assertEquals(available, true, "Missing verification prerequisite: complete local XSD");\n      if (available) {\n',
    }],
  ],
  ["cli/commands/node.test.ts", [{
    "line": 135,
    "old":
      "  if (f1040.outputNodeTypes.length > 0) return; // skip if it gains outputs\n",
    "new": "  assertEquals(f1040.outputNodeTypes.length, 0);\n",
  }]],
  ["cli/commands/export-cli.test.ts", [{
    "line": 171,
    "old": "      if (!(error instanceof Deno.errors.NotFound)) throw error;\n",
    "new": "      throw error;\n",
  }]],
  ["forms/f1040/e2e/international/schedule1a_form2555_senior_2025.test.ts", [{
    "line": 109,
    "old": "    if (!(error instanceof Deno.errors.NotFound)) throw error;\n",
    "new": "    throw error;\n",
  }]],
  ["forms/f1040/e2e/business/schedule-f/schedule_f_sources.test.ts", [{
    "line": 230,
    "old": "    if (!(error instanceof Deno.errors.NotFound)) throw error;\n",
    "new": "    throw error;\n",
  }]],
  ["forms/f1040/2025/pdf/reviews/composed/joint-mixed-source-return.test.ts", [{
    "line": 238,
    "old": "    if (!(error instanceof Deno.errors.NotFound)) throw error;\n",
    "new": "    throw error;\n",
  }]],
  ["forms/f1040/2025/mef/forms/income/schedule1/schedule1a.test.ts", [{
    "line": 1548,
    "old": "    if (!(error instanceof Deno.errors.NotFound)) throw error;\n",
    "new": "    throw error;\n",
  }]],
  [
    "forms/f1040/2025/domains/income/f1099g/f1099g_unemployment_source_replay.test.ts",
    [{
      "line": 156,
      "old": "    if (!(error instanceof Deno.errors.NotFound)) throw error;\n",
      "new": "    throw error;\n",
    }],
  ],
]);

/** Only reviewed prerequisite returns can change; every other character is fixed. */
export function assertPrerequisiteGuardPatch(value: unknown): string {
  const patch = prerequisiteGuardSchema.parse(value);
  if (
    !reviewedTestLines.has(patch.file) &&
    !reviewedOtherGuardEdits.has(patch.file)
  ) {
    throw new Error(`Unreviewed prerequisite guard file: ${patch.file}`);
  }
  const lines = patch.beforeSource.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const edits = patch.edits.map((edit) => {
    const exactOther = reviewedOtherGuardEdits.get(patch.file)?.some((
      approved,
    ) =>
      approved.line === edit.line && approved.old === edit.old &&
      approved.new === edit.new
    );
    if (
      !exactOther && !reviewedTestLines.get(patch.file)?.includes(edit.line)
    ) {
      throw new Error(
        `Unreviewed prerequisite line: ${patch.file}:${edit.line}`,
      );
    }
    const simple = edit.old.trim() === "return;" &&
      /^throw new Error\(`Missing verification prerequisite: \$\{(?:xsdPath|xsd|XSD_PATH|schema|templatePath)\}`\);$/
        .test(edit.new.trim());
    const notFound = edit.old.trim() ===
        "if (error instanceof Deno.errors.NotFound) return;" &&
      /^if \(error instanceof Deno\.errors\.NotFound\) \{\s*throw new Error\(`Missing verification prerequisite: \$\{(?:xsdPath|xsd|XSD_PATH|schema|templatePath)\}`\);\s*\}$/
        .test(edit.new.trim());
    if (!simple && !notFound && !exactOther) {
      throw new Error(`Non-prerequisite edit in ${patch.file}`);
    }
    if (edit.line > lines.length) {
      throw new Error(`Invalid guard line in ${patch.file}`);
    }
    const start = lines.slice(0, edit.line - 1).reduce(
      (sum, line) => sum + line.length,
      0,
    );
    if (patch.beforeSource.slice(start, start + edit.old.length) !== edit.old) {
      throw new Error(`Guard original slice differs: ${patch.file}`);
    }
    return { ...edit, start, end: start + edit.old.length };
  }).sort((a, b) => b.start - a.start);
  let result = patch.beforeSource;
  let boundary = result.length;
  for (const edit of edits) {
    if (edit.end > boundary) {
      throw new Error(`Overlapping prerequisite edits: ${patch.file}`);
    }
    result = result.slice(0, edit.start) + edit.new + result.slice(edit.end);
    boundary = edit.start;
  }
  if (result !== patch.afterSource) {
    throw new Error(
      `Source changed outside prerequisite guards: ${patch.file}`,
    );
  }
  return result;
}
