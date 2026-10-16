import * as fs from "node:fs/promises";
/** CLI regression scenarios with explicitly invented identity/eligibility facts. */
import variants from "../../benchmark/reference/2025/issue77-synthetic.json" with {
  type: "json",
};

type Invoke = (...args: string[]) => Promise<string>;
type Form = { node_type: string; data: Record<string, unknown> };
async function source(name: string): Promise<Form[]> {
  return JSON.parse(
    await fs.readFile(
      new URL(
        `../../benchmark/cases/f1040/2025/${name}/input.json`,
        import.meta.url,
      ), "utf8",
    ),
  ).forms;
}
const general = {
  filing_status: "single",
  taxpayer_first_name: "Synthetic",
  taxpayer_last_name: "Example",
  taxpayer_ssn: variants.taxpayer_ssn,
  taxpayer_dob: "1985-06-15",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_tin_issued_by_due_date: true,
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  main_home_in_us_over_half_year: true,
  taxpayer_can_be_claimed_as_dependent: false,
  childless_eic_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    qualifying_child_status_record_reference:
      "SYNTHETIC issue77 family assumption",
  },
  prior_eic_disallowance_review: {
    status: "none",
    irs_account_record_reference: "SYNTHETIC issue77 disallowance assumption",
    no_nonclerical_disallowance_since_1996_verified: true,
  },
  eic_tax_residency_review: {
    status: "all_year_resident",
    taxpayer_status_record_reference: "SYNTHETIC issue77 residency assumption",
  },
};
async function compute(
  invoke: Invoke,
  forms: Form[],
  expectedWarnings: string[] | null = [],
) {
  const { returnId } = JSON.parse(
    await invoke("return", "create", "--year", "2025"),
  );
  for (const form of forms) {
    await invoke(
      "form",
      "add",
      "--returnId",
      returnId,
      "--node_type",
      form.node_type,
      JSON.stringify(form.data),
    );
  }
  const result = JSON.parse(
    await invoke("return", "get", "--returnId", returnId),
  );
  if (
    expectedWarnings === null
      ? (result.warnings ?? []).some((warning: string) =>
        warning !==
          "Refund is more than double total withholding — verify refundable credits."
      )
      : JSON.stringify(result.warnings ?? []) !==
        JSON.stringify(expectedWarnings)
  ) {
    throw new Error(
      `Synthetic issue77 warnings: ${JSON.stringify(result.warnings)}`,
    );
  }
  return result;
}
function equal(actual: unknown, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
export async function smokeIssue77(invoke: Invoke): Promise<void> {
  for (const variant of variants.ownership) {
    // Isolate ownership with the archived W-2 amounts; other original forms and
    // dependent facts are intentionally outside these synthetic scenarios.
    const rows = (await source(variant.case)).filter((f) =>
      f.node_type === "w2"
    );
    const forms: Form[] = [
      {
        node_type: "general",
        data: {
          ...general,
          filing_status: "mfj",
          spouse_first_name: "SyntheticSpouse",
          spouse_last_name: "Example",
          spouse_ssn: variants.spouse_ssn,
          spouse_dob: "1985-06-15",
          spouse_ssn_valid_for_employment: true,
          spouse_tin_issued_by_due_date: true,
        },
      },
      ...rows.map((row, i) => ({
        node_type: "w2",
        data: {
          ...row.data,
          employee_ssn: variant.owners[i] === "taxpayer"
            ? variants.taxpayer_ssn
            : variants.spouse_ssn,
          source_document_reference: `SYNTHETIC issue77 W2 ${i + 1}`,
        },
      })),
    ];
    const result = await compute(invoke, forms);
    equal(
      result.lines.line31_additional_payments ?? 0,
      variant.expected_excess_ss,
      `${variant.case} ${variant.owners}`,
    );
  }
  for (const variant of variants.childless_eic) {
    const rows = (await source("78-single-w2-1099int-1099div-1099b")).filter(
      (f) => ["w2", "f1099int", "f1099div", "f1099b"].includes(f.node_type),
    );
    const forms: Form[] = [
      { node_type: "general", data: { ...general, taxpayer_dob: variant.dob } },
      {
        node_type: "schedule_b_part_iii",
        data: {
          foreign_accounts_question: false,
          foreign_trust_question: false,
        },
      },
      ...rows.map((row, i) => ({
        ...row,
        data: {
          ...row.data,
          ...(row.node_type === "w2"
            ? { employee_ssn: variants.taxpayer_ssn }
            : {}),
          source_document_reference: `SYNTHETIC issue77 source ${i + 1}`,
        },
      })),
    ];
    const result = await compute(
      invoke,
      forms,
      variant.expected_eic > 0
        ? [
          "Refund is more than double total withholding — verify refundable credits.",
        ]
        : [],
    );
    equal(
      result.lines.line27_eitc ?? 0,
      variant.expected_eic,
      `EIC age ${variant.age}`,
    );
    equal(
      result.summary.line33_total_payments,
      66 + variant.expected_eic,
      `Payments age ${variant.age}`,
    );
    equal(
      result.summary.line35a_refund,
      66 + variant.expected_eic,
      `Refund age ${variant.age}`,
    );
  }
  console.log(
    "Synthetic issue77 CLI smoke passed: four ownership and four EIC age scenarios",
  );
}

/** Replay every completed fixture through persisted public CLI inputs. */
export async function smokeCompletedIssue77(invoke: Invoke): Promise<void> {
  const archived = JSON.parse(
    await fs.readFile(
      new URL(
        "../../benchmark/reference/2025/issue77-original-incomplete.json",
        import.meta.url,
      ), "utf8",
    ),
  );
  const fields = [
    "line9_total_income",
    "line11_agi",
    "line15_taxable_income",
    "line24_total_tax",
    "line33_total_payments",
    "line35a_refund",
    "line37_amount_owed",
  ];
  for (const name of Object.keys(archived)) {
    const fixture = JSON.parse(
      await fs.readFile(
        new URL(
          `../../benchmark/cases/f1040/2025/${name}/correct.json`,
          import.meta.url,
        ), "utf8",
      ),
    );
    const expected = fixture.correct;
    // Refund advisory is informational; every executor or other warning fails.
    const result = await compute(invoke, await source(name), null);
    for (const field of fields) {
      equal(result.summary[field] ?? 0, expected[field], `${name} ${field}`);
    }
    console.log(`Complete issue77 CLI scenario passed: ${name}`);
  }
  console.log(
    `Complete issue77 CLI smoke passed: ${
      Object.keys(archived).length
    } scenarios, seven exact summary amounts each`,
  );
}
