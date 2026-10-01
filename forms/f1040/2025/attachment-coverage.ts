/**
 * Native attachments that a positive source path requires but this exporter
 * cannot yet produce. This is a filing boundary, not a document skip list.
 */
import {
  casualtyLossLines,
  inputSchema as form4684InputSchema,
} from "../nodes/intermediate/forms/form4684/index.ts";
import { isSupportedForm2106Route } from "./form2106_staged.ts";
import { isSupportedForm8844DirectEmployerInput } from "./mef/forms/f8844_source.ts";
import { reconcileForm8941DocumentSource } from "./mef/forms/f8941_source.ts";
import {
  calculateForm8881,
  inputSchema as f8881InputSchema,
} from "../nodes/inputs/f8881/index.ts";
import { inputSchema as f3800InputSchema } from "../nodes/inputs/f3800/index.ts";
import { inputSchema as f8882InputSchema } from "../nodes/inputs/f8882/index.ts";

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
    pendingKey: "clergy",
    exportKinds: ["mef", "pdf"],
    reason:
      "Clergy income needs matched W-2, housing designation, taxable excess, parsonage/SE, and Form 4361 evidence",
    isActive: (fields) => nonempty(fields.clergys),
  },
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
    reason: "Form 2106 needs the sourced one-job fee-basis filing route",
    isActive: (fields) =>
      nonempty(fields.f2106s) && !isSupportedForm2106Route(fields),
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
    reason: "Form 8844 needs a sourced direct Schedule C employer route",
    isActive: (fields) =>
      nonempty(fields.f8844s) &&
      !isSupportedForm8844DirectEmployerInput(fields),
  },
  {
    pendingKey: "f8881",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8881 needs a positive linked direct Schedule C employer source",
    isActive: (fields) => {
      if (Object.keys(fields).length === 0) return false;
      const parsed = f8881InputSchema.safeParse(fields);
      if (!parsed.success) return true;
      const lines = calculateForm8881(parsed.data);
      return lines.line8 + lines.line11 + lines.line15 <= 0;
    },
  },
  {
    pendingKey: "f3800",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8881 credit needs a complete source claim",
    isActive: (fields) =>
      fields.f8881_credit !== undefined &&
      !f3800InputSchema.safeParse(fields).success,
  },
  {
    pendingKey: "f8874",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8874 direct QEI needs authenticated CDE status and recapture history",
    isActive: (fields) => nonempty(fields.investments),
  },
  {
    pendingKey: "f8882",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8882 needs a sourced direct Schedule C employer route",
    isActive: (fields) => !f8882InputSchema.safeParse(fields).success,
  },
  {
    pendingKey: "f8908",
    exportKinds: ["mef", "pdf"],
    reason: "Form 8908 energy-efficient home credit needs a native attachment",
    isActive: (fields) => nonempty(fields.f8908s),
  },
  {
    pendingKey: "f3800",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8908 line 1p needs registered native/PDF Form 8908 and per-residence Form 7220 attachment support",
    isActive: (fields) => fields.f8908_credit !== undefined,
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
    reason:
      "Form 5471 Schedule R all-zero treatment and parent reference linkage need current MeF evidence",
    isActive: (fields) => nonempty(fields.f5471s),
  },
  {
    pendingKey: "form7203",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 7203 basis paths outside the reviewed stock loss or one new formal note require further filing work",
    isActive: (fields) => {
      const keys = Object.keys(fields);
      const allowedKeys = new Set([
        "stock_basis_beginning",
        "ordinary_loss",
        "additional_contributions",
        "reviewed_stock_loss_ledger",
        "new_loans",
        "reviewed_debt_evidence",
      ]);
      return keys.length > 0 && (
        keys.some((key) => !allowedKeys.has(key)) ||
        !keys.includes("stock_basis_beginning") ||
        !keys.includes("ordinary_loss") ||
        (keys.includes("new_loans") !==
          keys.includes("reviewed_debt_evidence")) ||
        (keys.includes("new_loans") && (
          typeof fields.new_loans !== "number" ||
          !Number.isSafeInteger(fields.new_loans) || fields.new_loans <= 0 ||
          !fields.reviewed_debt_evidence ||
          typeof fields.reviewed_debt_evidence !== "object"
        )) ||
        (keys.includes("additional_contributions") && (
          typeof fields.additional_contributions !== "number" ||
          !Number.isSafeInteger(fields.additional_contributions) ||
          fields.additional_contributions <= 0
        )) ||
        (keys.includes("reviewed_stock_loss_ledger") && (
          !keys.includes("additional_contributions") ||
          !fields.reviewed_stock_loss_ledger ||
          typeof fields.reviewed_stock_loss_ledger !== "object"
        )) ||
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
      "Form 9465 attached installment request remains blocked until IRS guidance establishes how its separate third-party disclosure authorization is signed with a Form 1040 e-file and linked native/PDF filing review is complete",
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
    reason:
      "Form 965-A prior-filed liabilities and actual installment payments need verification before printable filing",
    isActive: (fields) => nonempty(fields.f965s),
  },
  {
    pendingKey: "form8582",
    exportKinds: ["mef", "pdf"],
    reason:
      "Form 8582 prior PAL needs authenticated accepted-2024 return and activity ledger before export",
    isActive: (fields) =>
      positive(fields.prior_unallowed) ||
      (Array.isArray(fields.activities) && fields.activities.some((row) =>
        row !== null && typeof row === "object" &&
        (positive((row as Record<string, unknown>).prior_unallowed_operating) ||
          positive(
            (row as Record<string, unknown>).prior_unallowed_4797_part1,
          ) ||
          positive((row as Record<string, unknown>).prior_unallowed_4797_part2))
      )),
  },
  {
    pendingKey: "form8582cr",
    exportKinds: ["pdf"],
    reason:
      "Form 8582-CR PDF needs a filed-return ordinary line 6 source worksheet",
    isActive: (fields) =>
      nonempty(fields.credit_sources) &&
      fields.line6_ordinary_worksheet === undefined,
  },
  {
    pendingKey: "f4255",
    exportKinds: ["pdf"],
    reason:
      "Form 4255 PDF needs authenticated prior-return and IRS determination bytes before positive filing",
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
    reason:
      "Form 8611 historical credit, qualified-basis, and interest records need source verification before printable filing",
    isActive: (fields) => nonempty(fields.f8611s),
  },
  {
    pendingKey: "f8854",
    exportKinds: ["pdf"],
    reason:
      "Initial Form 8854 PDF needs authenticated prior-return, tax-compliance, and balance-sheet evidence before positive filing",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
  {
    pendingKey: "f8854_annual",
    exportKinds: ["pdf"],
    reason:
      "Annual Form 8854 PDF needs authenticated prior-filed obligation history before positive filing",
    isActive: (fields) => Object.keys(fields).length > 0,
  },
];

export function assertAttachmentCoverage(
  pending: object,
  exportKind: ExportKind,
): void {
  const byKey = pending as Readonly<Record<string, unknown>>;
  const form3800 = byKey.f3800;
  const hasForm8941Credit = form3800 !== null &&
    typeof form3800 === "object" &&
    ("f8941_direct_employer_credit" in form3800 ||
      "form8941_applied_credit" in form3800);
  if (byKey.f8941 !== undefined || hasForm8941Credit) {
    try {
      reconcileForm8941DocumentSource(byKey.f8941, byKey);
    } catch (cause) {
      throw new Error(
        `[${exportKind.toUpperCase()}] Form 8941 needs a reconciled direct Schedule C source, Form 3800 allocation, and premium deduction; export blocked`,
        { cause },
      );
    }
  }
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
  // A single large disposition is a Form 8886 loss-transaction review signal.
  // Screen source basis and proceeds before netting with other sales or Form
  // 8949 adjustments. This does not determine section 165 character or a
  // published exception; Form 8886 has no supported filing route yet.
  const dispositionRows = [
    ...((byKey.f8949 as { f8949s?: unknown[] } | undefined)?.f8949s ?? []),
    ...((byKey.f1099b as { f1099bs?: unknown[] } | undefined)?.f1099bs ?? []),
    ...qofRows,
  ];
  if (
    dispositionRows.some((raw) => {
      if (raw === null || typeof raw !== "object") return false;
      const row = raw as Record<string, unknown>;
      return typeof row.cost_basis === "number" &&
        Number.isFinite(row.cost_basis) &&
        typeof row.proceeds === "number" &&
        Number.isFinite(row.proceeds) &&
        row.cost_basis - row.proceeds >= 2_000_000;
    })
  ) {
    throw new Error(
      `[${exportKind.toUpperCase()}] Form 8886 review required for a single Form 8949/1099-B disposition with at least $2 million gross loss; no disclosure route is registered; export blocked`,
    );
  }
  const rawCasualty = byKey.form4684;
  if (
    rawCasualty !== null && typeof rawCasualty === "object" &&
    !Array.isArray(rawCasualty)
  ) {
    const casualty = form4684InputSchema.parse(rawCasualty);
    const businessLoss = casualtyLossLines(
      casualty.business_fmv_before ?? 0,
      casualty.business_fmv_after ?? 0,
      casualty.business_basis ?? 0,
      casualty.business_insurance ?? 0,
    ).loss;
    if (businessLoss >= 2_000_000) {
      throw new Error(
        `[${exportKind.toUpperCase()}] Form 8886 review required for a Form 4684 business casualty with at least $2 million loss after insurance; no disclosure route is registered; export blocked`,
      );
    }
  }
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
