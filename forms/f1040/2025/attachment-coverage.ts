/**
 * Native attachments that a positive source path requires but this exporter
 * cannot yet produce. This is a filing boundary, not a document skip list.
 */
import {
  calculateForm8826,
  inputSchema as form8826InputSchema,
} from "../nodes/inputs/f8826/index.ts";

type ExportKind = "mef" | "pdf";
type Fields = Readonly<Record<string, unknown>>;

interface MissingAttachment {
  readonly pendingKey: string;
  readonly exportKinds: readonly ExportKind[];
  readonly reason: string;
  readonly isActive: (fields: Fields) => boolean;
}

const nonempty = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;
const positive = (value: unknown): boolean =>
  typeof value === "number" && value > 0;

const MISSING_ATTACHMENTS: readonly MissingAttachment[] = [
  {
    pendingKey: "f8862",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8862 credit claim needs an explicit active-ban status",
    isActive: (fields) =>
      (fields.claim_eitc === true || fields.claim_ctc === true ||
        fields.claim_aotc === true) &&
      fields.credit_disallowance_ban_active === undefined,
  },
  {
    pendingKey: "f8862",
    exportKinds: ["mef"],
    reason: "Form 8862 credit-ban appeal must be mailed, not e-filed",
    isActive: (fields) =>
      fields.credit_disallowance_ban_active === true &&
      (fields.claim_eitc === true || fields.claim_ctc === true ||
        fields.claim_aotc === true),
  },
  {
    pendingKey: "f8997",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8997 requires a native annual QOF holdings document",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f8958",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8958 requires a native community-property allocation document",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f2106",
    exportKinds: ["mef", "pdf"],
    reason: "Form 2106 employee expenses require a native attachment",
    isActive: (fields) => nonempty(fields.f2106s),
  },
  {
    pendingKey: "f2210",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 2210 Part II filing reason requires a sourced native attachment",
    isActive: (fields) =>
      fields.waiver_requested === true ||
      fields.partial_waiver_requested === true ||
      fields.annualized_method === true ||
      fields.actual_withholding_dates_method === true ||
      fields.joint_filing_status_change === true ||
      fields.box_e_source !== undefined,
  },
  {
    pendingKey: "f3115",
    exportKinds: ["mef", "pdf"],
    reason: "Form 3115 accounting-method change requires a native attachment",
    isActive: (fields) => nonempty(fields.f3115s),
  },
  {
    pendingKey: "f3903",
    exportKinds: ["mef", "pdf"],
    reason: "Form 3903 moving expenses require a native attachment",
    isActive: (fields) => nonempty(fields.f3903s),
  },
  {
    pendingKey: "f3468",
    exportKinds: ["mef", "pdf"],
    reason: "Form 3468 direct investment credit requires a native attachment",
    isActive: (fields) => Object.values(fields).some(positive),
  },
  {
    pendingKey: "f6765",
    exportKinds: ["mef", "pdf"],
    reason: "Form 6765 direct research credit requires a native attachment",
    isActive: (fields) =>
      fields.payroll_tax_election === true ||
      Object.entries(fields).some(([key, value]) =>
        key !== "method" && positive(value)
      ),
  },
  {
    pendingKey: "f7207",
    exportKinds: ["mef", "pdf"],
    reason: "Form 7207 direct production credit requires a native attachment",
    isActive: (fields) => nonempty(fields.components),
  },
  {
    pendingKey: "f8801",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8801 prior minimum-tax credit requires a native attachment",
    isActive: (fields) =>
      positive(fields.prior_year_amt_paid) ||
      positive(fields.prior_year_carryforward),
  },
  {
    pendingKey: "f8275",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8275 or 8275-R disclosure requires a native attachment",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f8833",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8833 treaty disclosure requires a native attachment",
    isActive: (fields) => nonempty(fields.f8833s),
  },
  {
    pendingKey: "f8938",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8938 foreign-asset disclosure requires a native attachment",
    isActive: (fields) =>
      nonempty(fields.assets) || positive(fields.max_value_all_assets) ||
      positive(fields.year_end_value_all_assets),
  },
  {
    pendingKey: "f8828",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8828 mortgage-credit recapture needs a native attachment",
    isActive: (fields) => nonempty(fields.f8828s),
  },
  {
    pendingKey: "f8844",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8844 direct employer wage credit needs a native attachment",
    isActive: (fields) => nonempty(fields.f8844s),
  },
  {
    pendingKey: "f8881",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8881 startup or auto-enrollment credit needs a native attachment",
    isActive: (fields) =>
      positive(fields.startup_costs) || fields.has_auto_enrollment === true,
  },
  {
    pendingKey: "f8882",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8882 employer child-care credit needs a native attachment",
    isActive: (fields) =>
      positive(fields.qualified_childcare_expenses) ||
      positive(fields.resource_referral_expenses),
  },
  {
    pendingKey: "f8908",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8908 energy-efficient home credit needs a native attachment",
    isActive: (fields) => nonempty(fields.f8908s),
  },
  {
    pendingKey: "f8994",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8994 paid-leave credit needs a native attachment",
    isActive: (fields) => nonempty(fields.employees),
  },
  {
    pendingKey: "f1310",
    exportKinds: ["mef", "pdf"],
    reason: "Form 1310 refund-claim authority needs a native filing review",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f2120",
    exportKinds: ["mef", "pdf"],
    reason: "Form 2120 multiple-support claim needs a native filing review",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f8332",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8332 dependent-release facts need a native filing review",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f8379",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8379 injured-spouse allocation needs a native filing review",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f5471",
    exportKinds: ["mef", "pdf"],
    reason: "Form 5471 foreign-corporation reporting needs native schedules",
    isActive: (fields) => nonempty(fields.f5471s),
  },
  {
    pendingKey: "form7203",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 7203 basis paths outside the reviewed stock-only ordinary loss require further filing work",
    isActive: (fields) => {
      const keys = Object.keys(fields);
      return keys.length > 0 && (
        keys.length !== 2 ||
        !keys.includes("stock_basis_beginning") ||
        !keys.includes("ordinary_loss") ||
        typeof fields.stock_basis_beginning !== "number" ||
        !Number.isSafeInteger(fields.stock_basis_beginning) ||
        fields.stock_basis_beginning < 0 ||
        typeof fields.ordinary_loss !== "number" ||
        !Number.isSafeInteger(fields.ordinary_loss) ||
        fields.ordinary_loss <= 0
      );
    },
  },
  {
    pendingKey: "f9465",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 9465 requires a native filing document for the installment request",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "nol_carryforward",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 172 NOL deduction requires a native attachment and Schedule 1 line 8a",
    isActive: (fields) => nonempty(fields.nol_carryforwards),
  },
  {
    pendingKey: "schedule1",
    exportKinds: ["mef", "pdf"],
    reason:
      "Schedule 1 line 8a NOL needs Form 172 and sourced Form 6251 regular/AMT NOL refigures",
    isActive: (fields) => positive(fields.line8a_nol_deduction),
  },
  {
    pendingKey: "f8082",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8082 inconsistent-treatment notice requires a native attachment",
    isActive: (fields) => nonempty(fields.f8082s),
  },
  {
    pendingKey: "f8697",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8697 look-back interest requires reviewed tax routing and a native filing decision",
    isActive: (fields) => nonempty(fields.f8697s),
  },
  {
    pendingKey: "f8866",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8866 look-back interest needs reviewed tax routing and native filing decision",
    isActive: (fields) => nonempty(fields.f8866s),
  },
  {
    pendingKey: "f8867",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8867 preparer due-diligence checklist needs native filing review",
    isActive: (fields) => nonempty(fields.f8867s),
  },
  {
    pendingKey: "f8873",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8873 exclusion needs a native attachment",
    isActive: (fields) => nonempty(fields.f8873s),
  },
  {
    pendingKey: "f8896",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8896 credit needs a native attachment",
    isActive: (fields) => nonempty(fields.f8896s),
  },
  {
    pendingKey: "f970",
    exportKinds: ["mef", "pdf"],
    reason: "Form 970 LIFO election needs a native filing review",
    isActive: (fields) => nonempty(fields.f970s),
  },
  {
    pendingKey: "f965",
    exportKinds: ["pdf"],
    reason: "Form 965-A has a native filing but no source-backed PDF",
    isActive: (fields) => nonempty(fields.f965s),
  },
  {
    pendingKey: "form8582cr",
    exportKinds: ["pdf"],
    reason: "Form 8582-CR has a native filing but no source-backed PDF",
    isActive: (fields) => nonempty(fields.credit_sources),
  },
  {
    pendingKey: "f4255",
    exportKinds: ["pdf"],
    reason: "Form 4255 has a native filing but no source-backed PDF",
    isActive: (fields) => nonempty(fields.rows),
  },
  {
    pendingKey: "form8621",
    exportKinds: ["pdf"],
    reason: "Form 8621 has a native filing but no source-backed PDF",
    isActive: (fields) => nonempty(fields.items),
  },
  {
    pendingKey: "f8611",
    exportKinds: ["pdf"],
    reason: "Form 8611 has a native filing but no source-backed PDF",
    isActive: (fields) => nonempty(fields.f8611s),
  },
  {
    pendingKey: "f8826",
    exportKinds: ["pdf"],
    reason: "Form 8826 has a native filing but no source-backed PDF",
    isActive: (fields) => {
      if (fields.eligible_expenditures === undefined) return false;
      const source = form8826InputSchema.safeParse(fields);
      return !source.success || calculateForm8826(source.data).line6 > 0;
    },
  },
  {
    pendingKey: "f8854",
    exportKinds: ["pdf"],
    reason: "Initial Form 8854 has a native filing but no source-backed PDF",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f8854_annual",
    exportKinds: ["pdf"],
    reason: "Annual Form 8854 has a native filing but no source-backed PDF",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
];

export function assertAttachmentCoverage(
  pending: object,
  exportKind: ExportKind,
): void {
  const byKey = pending as Readonly<Record<string, unknown>>;
  // MeF's canonical pending projection stores Form 8949 rows as an array;
  // PDF uses the raw executor's transaction field. Neither may file a QOF
  // deferral or inclusion while the annual Form 8997 is unregistered.
  const form8949 = byKey.form8949;
  const qofRows = Array.isArray(form8949)
    ? form8949
    : form8949 !== null && typeof form8949 === "object" &&
        "transaction" in form8949
    ? Array.isArray(form8949.transaction)
      ? form8949.transaction
      : [form8949.transaction]
    : [];
  if (
    qofRows.some((row) =>
      row !== null && typeof row === "object" &&
      "adjustment_codes" in row &&
      typeof row.adjustment_codes === "string" &&
      /[ZY]/.test(row.adjustment_codes)
    )
  ) {
    throw new Error(
      `[${exportKind.toUpperCase()}] Form 8949 QOF code Z/Y rows require the annual Form 8997 attachment; export blocked`,
    );
  }
  for (const form of MISSING_ATTACHMENTS) {
    if (!form.exportKinds.includes(exportKind)) continue;
    const fields = byKey[form.pendingKey];
    if (
      fields !== null && typeof fields === "object" &&
      !Array.isArray(fields) && form.isActive(fields as Fields)
    ) {
      throw new Error(
        `[${exportKind.toUpperCase()}] ${form.reason}; export blocked`,
      );
    }
  }
}
