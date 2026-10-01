import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../form3800_final_credit_join.ts";
import { reconcileFiledForm8582CROrdinary } from "../../form8582cr_filed_ordinary.ts";
import {
  calculateForm8820,
  inputSchema as f8820InputSchema,
} from "../../../nodes/inputs/f8820/index.ts";
import {
  calculateForm5884,
  inputSchema as f5884InputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import {
  calculateForm8826,
  inputSchema as f8826InputSchema,
} from "../../../nodes/inputs/f8826/index.ts";
import {
  calculateForm8874,
  inputSchema as f8874InputSchema,
} from "../../../nodes/inputs/f8874/index.ts";
import {
  computeCommercialVehicleCreditLines,
  inputSchema as f8936InputSchema,
} from "../../../nodes/inputs/f8936/index.ts";
import { sourceOrphanDrugK1Credits } from "../../mef/forms/f3800.ts";
import { reconcileDisabledAccessK1Credits } from "../../mef/forms/f8826_credit_evidence.ts";
import { reconcileForm8826SelfSource } from "../../mef/forms/f8826_source.ts";
import { reconcileFiledTrustPartVClaims } from "../../mef/forms/f3468_source.ts";
import { reconcileForm8844DirectEmployer } from "../../mef/forms/f8844_source.ts";
import { reconcileForm8881DirectEmployer } from "../../mef/forms/f8881.ts";
import { reconcileForm8941ScheduleC } from "../../mef/forms/f8941_source.ts";
import { reconcileForm8994DocumentSource } from "../../form8994_source.ts";
import { reconcileForm8864DocumentSource } from "../../form8864_source.ts";
import { reconcileForm8882DirectEmployer } from "../../mef/forms/f8882_source.ts";
import { reconciledForm8908Source } from "../../mef/forms/f8908_source_reconciliation.ts";
import {
  inputSchema as f3800InputSchema,
  reconcileForm3800NonpassiveCarryforwards,
} from "../../../nodes/inputs/f3800/index.ts";
import { appendForm3800CarryoverStatement } from "./f3800_carryover_statement.ts";
import { FORM3800_PRINTED_PART_V_ROWS } from "./f3800_capacity.ts";
import { form8835PdfSources } from "./f8835_source.ts";
import {
  form3800HeaderFields,
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartIIILines,
  form3800PartIVFields,
  form3800PartIVLines,
  form3800PartVFields,
  form3800PartVIFields,
} from "./f3800_fields.ts";
import {
  projectForm3800HeaderFields,
  projectForm3800PartIAndIIFields,
  projectForm3800PartIIIFields,
  projectForm3800PartIVFields,
} from "./f3800_print_projection.ts";
import {
  projectForm3800PartVFields,
  projectForm3800PartVIFields,
} from "./f3800_detail_projection.ts";

const checkboxPaths = new Set<string>([
  form3800HeaderFields.camtAndBeatYes,
  form3800HeaderFields.camtAndBeatNo,
  form3800HeaderFields.transferElectionYes,
  form3800HeaderFields.transferElectionNo,
  form3800HeaderFields.line4RevisedCarryforward,
  form3800HeaderFields.line34RevisedCarryforward,
]);
const paths = new Set<string>([
  ...Object.values(form3800HeaderFields),
  ...Object.values(form3800PartIAndIIFields),
  ...form3800PartIIILines.flatMap((line) =>
    Object.values(form3800PartIIIFields(line))
  ),
  ...form3800PartIVLines.flatMap((line) =>
    Object.values(form3800PartIVFields(line))
  ),
  ...Array.from(
    { length: 15 },
    (_, index) => Object.values(form3800PartVFields(index + 1)),
  ).flat(),
  ...Array.from(
    { length: 35 },
    (_, index) => Object.values(form3800PartVIFields(index + 1)),
  ).flat(),
]);
const fields: readonly PdfFieldEntry[] = [...paths].map((path) => ({
  kind: checkboxPaths.has(path) ? "checkbox" : "text",
  domainKey: path,
  pdfField: path,
}));

export const form3800Pdf: PdfFormDescriptor = {
  pendingKey: "f3800",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f3800--2025.pdf",
  fields,
  instances(raw, filer, all, prepared) {
    if (Object.keys(raw).length === 0) return [];
    if (!prepared || !filer || !all?.schedule3) {
      throw new Error(
        "Form 3800 PDF needs the same prepared MeF return, filer, and Schedule 3",
      );
    }
    const allowed = raw.allowed_credit;
    const pending3800 = all.f3800;
    if (
      !pending3800 || typeof pending3800 !== "object" ||
      Array.isArray(pending3800) ||
      (pending3800 as Record<string, unknown>).allowed_credit !== allowed ||
      typeof allowed !== "number" || !Number.isFinite(allowed) ||
      !Number.isSafeInteger(Math.round(allowed * 100)) ||
      Math.abs(allowed * 100 - Math.round(allowed * 100)) > 0.000001 ||
      Math.round(allowed * 100) !==
        Math.round(prepared.lines.line38 * 100)
    ) {
      throw new Error(
        "Form 3800 PDF pending allowed credit differs from prepared MeF line 38",
      );
    }
    const line6a = all.schedule3.line6a_total;
    if (typeof line6a !== "number") {
      throw new Error("Form 3800 PDF needs finalized Schedule 3 line 6a");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, all);
    const source = f3800InputSchema.parse(pending3800);
    if (source.f8864_direct_producer_credit) {
      const { lines } = reconcileForm8864DocumentSource(all.f8864, all);
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1l");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1l"
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === "1l"
      );
      const [row] = rows;
      const [amount] = amounts;
      const [detail] = details;
      if (
        JSON.stringify(rawSource.f8864_direct_producer_credit) !==
          JSON.stringify(source.f8864_direct_producer_credit) ||
        rawSource.form8864_applied_credit !==
          source.form8864_applied_credit ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8864" ||
        !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
        amount.nonpassiveCredit !== lines.line11 ||
        amount.totalCredit !== lines.line11 ||
        amount.transferOutCredit !== 0 || amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.appliedCredit !== source.form8864_applied_credit ||
        amount.appliedCredit !== detail.appliedCredit ||
        detail.credit !== lines.line11 ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        detail.passThroughEin !== undefined
      ) {
        throw new Error("Form 3800 PDF line 1l differs from Form 8864 source");
      }
    }
    if (source.f8908_credit) {
      const { lines } = reconciledForm8908Source(all.f8908, source);
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1p");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1p"
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === "1p"
      );
      const [row] = rows;
      const [amount] = amounts;
      const [detail] = details;
      if (
        JSON.stringify(rawSource.f8908_credit) !==
          JSON.stringify(source.f8908_credit) ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8908" ||
        !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
        amount.nonpassiveCredit !== lines.line8 ||
        amount.totalCredit !== lines.line8 ||
        amount.transferOutCredit !== 0 || amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.appliedCredit !== detail.appliedCredit ||
        detail.credit !== lines.line8 ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        detail.passThroughEin !== undefined
      ) {
        throw new Error("Form 3800 PDF line 1p differs from Form 8908 source");
      }
    }
    if (source.f8941_direct_employer_credit) {
      const { lines } = reconcileForm8941ScheduleC(
        all,
        undefined,
        source.form8941_applied_credit,
      );
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "4h");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "4h"
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === "4h"
      );
      const [row] = rows;
      const [amount] = amounts;
      const [detail] = details;
      if (
        JSON.stringify(rawSource.f8941_direct_employer_credit) !==
          JSON.stringify(source.f8941_direct_employer_credit) ||
        rawSource.form8941_applied_credit !==
          source.form8941_applied_credit ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8941" ||
        !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
        amount.nonpassiveCredit !== lines.line16 ||
        amount.totalCredit !== lines.line16 ||
        amount.transferOutCredit !== 0 || amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.appliedCredit !== source.form8941_applied_credit ||
        amount.appliedCredit !== detail.appliedCredit ||
        detail.credit !== lines.line16 ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        detail.passThroughEin !== undefined
      ) {
        throw new Error("Form 3800 PDF line 4h differs from Form 8941 source");
      }
    }
    if (source.f8994_direct_employer_credit) {
      const { lines } = reconcileForm8994DocumentSource(all.f8994, all);
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "4j");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "4j"
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === "4j"
      );
      const [row] = rows;
      const [amount] = amounts;
      const [detail] = details;
      if (
        JSON.stringify(rawSource.f8994_direct_employer_credit) !==
          JSON.stringify(source.f8994_direct_employer_credit) ||
        rawSource.form8994_applied_credit !==
          source.form8994_applied_credit ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8994" ||
        !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
        amount.nonpassiveCredit !== lines.line3 ||
        amount.totalCredit !== lines.line3 ||
        amount.transferOutCredit !== 0 || amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.appliedCredit !== source.form8994_applied_credit ||
        amount.appliedCredit !== detail.appliedCredit ||
        detail.credit !== lines.line3 ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        detail.passThroughEin !== undefined
      ) {
        throw new Error("Form 3800 PDF line 4j differs from Form 8994 source");
      }
    }
    if (source.f8882_direct_employer_credit) {
      const { lines } = reconcileForm8882DirectEmployer(all.f8882, all);
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1k");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1k"
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === "1k"
      );
      const [row] = rows;
      const [amount] = amounts;
      const [detail] = details;
      if (
        JSON.stringify(rawSource.f8882_direct_employer_credit) !==
          JSON.stringify(source.f8882_direct_employer_credit) ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8882" ||
        !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
        amount.nonpassiveCredit !== lines.line7 ||
        amount.totalCredit !== lines.line7 ||
        amount.transferOutCredit !== 0 || amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.appliedCredit !== detail.appliedCredit ||
        detail.credit !== lines.line7 ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        detail.passThroughEin !== undefined
      ) {
        throw new Error("Form 3800 PDF line 1k differs from Form 8882 source");
      }
    }
    if (source.f8881_credit) {
      const lines = reconcileForm8881DirectEmployer(all);
      const rawSource = f3800InputSchema.parse(raw);
      const parts = [
        { line: "1j", credit: lines.line8 },
        { line: "1dd", credit: lines.line11 },
        { line: "1ee", credit: lines.line15 },
      ];
      const expected = parts.filter((part) => part.credit > 0);
      if (
        JSON.stringify(rawSource.f8881_credit) !==
          JSON.stringify(source.f8881_credit)
      ) {
        throw new Error(
          "Form 3800 PDF Form 8881 claim differs from filed source",
        );
      }
      if (
        parts.filter((part) => part.credit === 0).some((part) =>
          prepared.currentRows.some((row) => row.line === part.line) ||
          prepared.currentAmounts.some((row) => row.line === part.line) ||
          prepared.currentDetails.some((row) => row.line === part.line)
        )
      ) {
        throw new Error("Form 3800 PDF has an unclaimed Form 8881 part");
      }
      for (const part of expected) {
        const rows = prepared.currentRows.filter((row) =>
          row.line === part.line
        );
        const amounts = prepared.currentAmounts.filter((row) =>
          row.line === part.line
        );
        const details = prepared.currentDetails.filter((row) =>
          row.line === part.line
        );
        const [row] = rows;
        const [amount] = amounts;
        const [detail] = details;
        if (
          rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
          row.metadata.sourceCount !== 1 ||
          row.metadata.referenceDocumentName !== "IRS8881" ||
          !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
          amount.nonpassiveCredit !== part.credit ||
          amount.totalCredit !== part.credit ||
          amount.transferOutCredit !== 0 || amount.passiveBeforeLimit !== 0 ||
          amount.passiveAfterLimit !== 0 ||
          amount.appliedCredit !== detail.appliedCredit ||
          detail.credit !== part.credit ||
          detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
          detail.passThroughEin !== undefined
        ) {
          throw new Error(
            `Form 3800 PDF ${part.line} differs from Form 8881 source`,
          );
        }
      }
    }
    if (source.f8844_direct_employer_credit) {
      const { lines } = reconcileForm8844DirectEmployer(all);
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "3");
      const amounts = prepared.currentAmounts.filter((row) => row.line === "3");
      const details = prepared.currentDetails.filter((row) => row.line === "3");
      const row = rows[0];
      const amount = amounts[0];
      const detail = details[0];
      if (
        JSON.stringify(rawSource.f8844_direct_employer_credit) !==
          JSON.stringify(source.f8844_direct_employer_credit) ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8844" ||
        !row.metadata.referenceDocumentId ||
        row.entityCredits.length !== 0 ||
        amount.nonpassiveCredit !== lines.line2 ||
        amount.totalCredit !== lines.line2 ||
        amount.transferOutCredit !== 0 ||
        amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.appliedCredit !== detail.appliedCredit ||
        detail.credit !== lines.line2 ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        detail.passThroughEin !== undefined
      ) {
        throw new Error(
          "Form 3800 PDF line 3 differs from direct employer Form 8844 source",
        );
      }
    }
    if (
      source.f8820_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      !source.f8874_credit &&
      !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.f8936_new_vehicle_credit &&
      !source.f8820_k1_credit_entries?.length &&
      !source.f8874_k1_credit_entries?.length &&
      !source.passive_source_allocations?.length &&
      !source.carryforward_vintages?.length
    ) {
      const filed = f8820InputSchema.parse(all.f8820);
      const credit = calculateForm8820(filed).line4;
      const rawSource = f3800InputSchema.parse(raw);
      const row = prepared.currentRows[0];
      const amount = prepared.currentAmounts[0];
      const detail = prepared.currentDetails[0];
      const wotcCredit = source.f5884_credit?.credit_amount ?? 0;
      const wotcRow = prepared.currentRows.find((item) => item.line === "4b");
      const wotcDetail = prepared.currentDetails.find((item) =>
        item.line === "4b"
      );
      const commercialCredit =
        source.f8936_commercial_vehicle_credit?.credit_amount ?? 0;
      const commercialRow = prepared.currentRows.find((item) =>
        item.line === "1aa"
      );
      const commercialDetail = prepared.currentDetails.find((item) =>
        item.line === "1aa"
      );
      const expectedRows = 1 + Number(wotcCredit > 0) +
        Number(commercialCredit > 0);
      if (
        filed.subject_to_passive_activity_limit ||
        (filed.pass_through_credits?.length ?? 0) !== 0 ||
        credit <= 0 ||
        source.f8820_credit.subject_to_passive_activity_limit ||
        source.f8820_credit.credit_amount !== credit ||
        JSON.stringify(rawSource.f8820_credit) !==
          JSON.stringify(source.f8820_credit) ||
        prepared.currentRows.length !== expectedRows ||
        prepared.currentAmounts.length !== expectedRows ||
        prepared.currentDetails.length !== expectedRows ||
        prepared.currentRows.some((item) =>
          item.line !== "1h" && item.line !== "1aa" && item.line !== "4b"
        ) ||
        prepared.currentDetails.some((item) =>
          item.line !== "1h" && item.line !== "1aa" && item.line !== "4b"
        ) ||
        prepared.carryoverRows.length !== 0 ||
        row?.line !== "1h" || row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8820" ||
        !row.metadata.referenceDocumentId ||
        amount?.line !== "1h" ||
        amount.nonpassiveCredit !== credit ||
        amount.totalCredit !== credit ||
        amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.transferOutCredit !== 0 ||
        amount.appliedCredit !== credit ||
        detail?.line !== "1h" || detail.credit !== credit ||
        detail.appliedCredit !== credit ||
        detail.passThroughEin !== undefined ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        (wotcCredit > 0 &&
          (!wotcRow?.metadata.referenceDocumentId ||
            wotcRow.metadata.referenceDocumentId ===
              row.metadata.referenceDocumentId ||
            wotcDetail?.sourceDocumentId !==
              wotcRow.metadata.referenceDocumentId)) ||
        (commercialCredit > 0 &&
          (!commercialRow?.metadata.referenceDocumentId ||
            commercialRow.metadata.referenceDocumentId ===
              row.metadata.referenceDocumentId ||
            commercialRow.metadata.referenceDocumentId ===
              wotcRow?.metadata.referenceDocumentId ||
            commercialDetail?.sourceDocumentId !==
              commercialRow.metadata.referenceDocumentId)) ||
        prepared.lines.line1 !== credit + commercialCredit ||
        prepared.lines.line6 !== credit + commercialCredit ||
        prepared.lines.line17 !== credit + commercialCredit ||
        (prepared.lines.line37 ?? 0) !== wotcCredit ||
        prepared.lines.line38 !== credit + commercialCredit + wotcCredit
      ) {
        throw new Error(
          "Form 3800 PDF line 1h differs from one filed self-earned Form 8820 source",
        );
      }
    }
    if (
      source.f8826_credit_entries?.length === 2 &&
      source.f8826_credit_entries.some((entry) => entry.source_type === "self")
    ) {
      const filed = f8826InputSchema.parse(all.f8826);
      const passThrough = filed.pass_through_credits ?? [];
      if (
        filed.subject_to_passive_activity_limit !== false ||
        passThrough.length !== 1 ||
        passThrough[0].subject_to_passive_activity_limit !== false
      ) {
        throw new Error(
          "Form 3800 PDF line 1e needs one self and one nonpassive pass-through Form 8826 source",
        );
      }
      const lines = calculateForm8826(filed);
      reconcileForm8826SelfSource(filed, all);
      reconcileDisabledAccessK1Credits([{
        source_type: passThrough[0].entity_type,
        entity_ein: passThrough[0].entity_ein,
        source_document_reference: passThrough[0].source_document_reference,
        credit_amount: passThrough[0].credit_amount,
        subject_to_passive_activity_limit: false,
      }], all);
      const expectedCredits = [
        lines.selfCreditAfterCap,
        lines.passThroughCreditsAfterCap[0],
      ];
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1e");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1e"
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === "1e"
      );
      const credit = expectedCredits[0] + expectedCredits[1];
      if (
        expectedCredits.some((amount) => amount <= 0) ||
        JSON.stringify(rawSource.f8826_credit_entries) !==
          JSON.stringify(source.f8826_credit_entries) ||
        source.f8826_credit_entries[0].source_type !== "self" ||
        source.f8826_credit_entries[0].credit_amount !==
          expectedCredits[0] ||
        source.f8826_credit_entries[1].source_type !==
          passThrough[0].entity_type ||
        source.f8826_credit_entries[1].source_ein !==
          passThrough[0].entity_ein ||
        source.f8826_credit_entries[1].source_document_reference !==
          passThrough[0].source_document_reference ||
        source.f8826_credit_entries[1].credit_amount !==
          expectedCredits[1] ||
        rows.length !== 1 || amounts.length !== 1 ||
        details.length !== 2 ||
        rows[0].metadata.sourceCount !== 2 ||
        rows[0].metadata.referenceDocumentName !== "IRS8826" ||
        !rows[0].metadata.referenceDocumentId ||
        details[0].sourceDocumentId !==
          rows[0].metadata.referenceDocumentId ||
        details[0].passThroughEin !== undefined ||
        details[0].credit !== expectedCredits[0] ||
        details[1].sourceDocumentId !== undefined ||
        details[1].passThroughEin !== passThrough[0].entity_ein ||
        details[1].credit !== expectedCredits[1] ||
        details.some((detail) =>
          detail.appliedCredit < 0 ||
          detail.appliedCredit > detail.credit
        ) ||
        amounts[0].nonpassiveCredit !== credit ||
        amounts[0].totalCredit !== credit ||
        amounts[0].passiveBeforeLimit !== 0 ||
        amounts[0].passiveAfterLimit !== 0 ||
        amounts[0].transferOutCredit !== 0 ||
        amounts[0].appliedCredit !==
          details[0].appliedCredit + details[1].appliedCredit
      ) {
        throw new Error(
          "Form 3800 PDF line 1e differs from self and pass-through Form 8826 sources",
        );
      }
    }
    if (source.f5884_credit) {
      const workOpportunity = f5884InputSchema.parse(all.f5884);
      if (
        workOpportunity.f5884s.length === 1 &&
        (workOpportunity.pass_through_credits?.length ?? 0) === 0
      ) {
        const lines = calculateForm5884(workOpportunity);
        const rawSource = f3800InputSchema.parse(raw);
        const rows = prepared.currentRows.filter((row) => row.line === "4b");
        const amounts = prepared.currentAmounts.filter((row) =>
          row.line === "4b"
        );
        const details = prepared.currentDetails.filter((row) =>
          row.line === "4b"
        );
        if (
          workOpportunity.subject_to_passive_activity_limit ||
          lines.line2 <= 0 || lines.line3 !== 0 ||
          source.f5884_credit.subject_to_passive_activity_limit ||
          source.f5884_credit.credit_amount !== lines.line4 ||
          JSON.stringify(rawSource.f5884_credit) !==
            JSON.stringify(source.f5884_credit) ||
          rows.length !== 1 || amounts.length !== 1 ||
          details.length !== 1 || rows[0].metadata.sourceCount !== 1 ||
          rows[0].metadata.referenceDocumentName !== "IRS5884" ||
          !rows[0].metadata.referenceDocumentId ||
          details[0].sourceDocumentId !==
            rows[0].metadata.referenceDocumentId ||
          details[0].passThroughEin !== undefined ||
          details[0].credit !== lines.line4 ||
          details[0].appliedCredit !== amounts[0].appliedCredit ||
          amounts[0].nonpassiveCredit !== lines.line4 ||
          amounts[0].totalCredit !== lines.line4 ||
          amounts[0].passiveBeforeLimit !== 0 ||
          amounts[0].passiveAfterLimit !== 0 ||
          amounts[0].transferOutCredit !== 0
        ) {
          throw new Error(
            "Form 3800 PDF line 4b differs from one self-earned Form 5884 source",
          );
        }
      }
    }
    if (
      source.f8936_commercial_vehicle_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      !source.f8936_new_vehicle_credit &&
      !source.f8874_credit &&
      !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.f8820_k1_credit_entries?.length &&
      !source.f8874_k1_credit_entries?.length &&
      !source.passive_source_allocations?.length &&
      !source.carryforward_vintages?.length
    ) {
      const filed = f8936InputSchema.parse(all.f8936);
      const vehicle = filed.f8936s[0];
      const credit = vehicle?.credit_kind ===
          "qualified_commercial_clean_vehicle"
        ? computeCommercialVehicleCreditLines(vehicle).line26Credit
        : 0;
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1aa");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1aa"
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === "1aa"
      );
      const wotcCredit = source.f5884_credit?.credit_amount ?? 0;
      const wotcRow = prepared.currentRows.find((row) => row.line === "4b");
      const orphanCredit = source.f8820_credit?.credit_amount ?? 0;
      const orphanRow = prepared.currentRows.find((row) => row.line === "1h");
      const orphanDetail = prepared.currentDetails.find((row) =>
        row.line === "1h"
      );
      const expectedRows = 1 + Number(wotcCredit > 0) +
        Number(orphanCredit > 0);
      if (
        filed.f8936s.length !== 1 || credit <= 0 ||
        vehicle?.business_credit_subject_to_passive_activity_limit !== false ||
        source.f8936_commercial_vehicle_credit
          .subject_to_passive_activity_limit ||
        source.f8936_commercial_vehicle_credit.credit_amount !== credit ||
        JSON.stringify(rawSource.f8936_commercial_vehicle_credit) !==
          JSON.stringify(source.f8936_commercial_vehicle_credit) ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        prepared.currentRows.length !== expectedRows ||
        prepared.currentAmounts.length !== expectedRows ||
        prepared.currentDetails.length !== expectedRows ||
        prepared.currentRows.some((row) =>
          row.line !== "1aa" && row.line !== "1h" && row.line !== "4b"
        ) ||
        prepared.currentDetails.some((row) =>
          row.line !== "1aa" && row.line !== "1h" && row.line !== "4b"
        ) ||
        rows[0].metadata.sourceCount !== 1 ||
        rows[0].metadata.referenceDocumentName !== "IRS8936" ||
        !rows[0].metadata.referenceDocumentId ||
        (wotcCredit > 0 &&
          rows[0].metadata.referenceDocumentId ===
            wotcRow?.metadata.referenceDocumentId) ||
        (orphanCredit > 0 &&
          (!orphanRow?.metadata.referenceDocumentId ||
            orphanRow.metadata.referenceDocumentId ===
              rows[0].metadata.referenceDocumentId ||
            orphanRow.metadata.referenceDocumentId ===
              wotcRow?.metadata.referenceDocumentId ||
            orphanDetail?.sourceDocumentId !==
              orphanRow.metadata.referenceDocumentId)) ||
        details[0].sourceDocumentId !==
          rows[0].metadata.referenceDocumentId ||
        details[0].passThroughEin !== undefined ||
        details[0].credit !== credit ||
        details[0].appliedCredit !== amounts[0].appliedCredit ||
        amounts[0].nonpassiveCredit !== credit ||
        amounts[0].totalCredit !== credit ||
        amounts[0].passiveBeforeLimit !== 0 ||
        amounts[0].passiveAfterLimit !== 0 ||
        amounts[0].transferOutCredit !== 0 ||
        prepared.lines.line17 !==
          amounts[0].appliedCredit + orphanCredit ||
        (prepared.lines.line37 ?? 0) !== wotcCredit ||
        prepared.lines.line38 !==
          amounts[0].appliedCredit + orphanCredit + wotcCredit
      ) {
        throw new Error(
          "Form 3800 PDF line 1aa differs from one self-earned commercial Form 8936 source",
        );
      }
    }
    if (
      source.f8820_credit && source.f8874_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      (source.f8820_k1_credit_entries?.length ?? 0) === 0 &&
      (source.f8874_k1_credit_entries?.length ?? 0) === 0 &&
      !(source.passive_source_allocations ?? []).some((entry) =>
        entry.form3800_credit_line === "1h" ||
        entry.form3800_credit_line === "1i"
      )
    ) {
      const orphanSource = f8820InputSchema.parse(all.f8820);
      const newMarketsSource = f8874InputSchema.parse(all.f8874);
      const orphanCredit = calculateForm8820(orphanSource).line4;
      const newMarketsCredit = calculateForm8874(newMarketsSource)
        .nonpassiveCredit;
      const rawSource = f3800InputSchema.parse(raw);
      const orphanRow = prepared.currentRows.filter((row) => row.line === "1h");
      const newMarketsRow = prepared.currentRows.filter((row) =>
        row.line === "1i"
      );
      const orphanAmount = prepared.currentAmounts.filter((row) =>
        row.line === "1h"
      );
      const newMarketsAmount = prepared.currentAmounts.filter((row) =>
        row.line === "1i"
      );
      const orphanDetail = prepared.currentDetails.filter((row) =>
        row.line === "1h"
      );
      const newMarketsDetail = prepared.currentDetails.filter((row) =>
        row.line === "1i"
      );
      if (
        (orphanSource.pass_through_credits?.length ?? 0) !== 0 ||
        orphanSource.subject_to_passive_activity_limit ||
        newMarketsSource.investments.some((investment) =>
          investment.subject_to_passive_activity_limit
        ) ||
        orphanCredit <= 0 || newMarketsCredit <= 0 ||
        source.f8820_credit.credit_amount !== orphanCredit ||
        source.f8874_credit.credit_amount !== newMarketsCredit ||
        rawSource.f8820_credit?.credit_amount !== orphanCredit ||
        rawSource.f8874_credit?.credit_amount !== newMarketsCredit ||
        orphanRow.length !== 1 || newMarketsRow.length !== 1 ||
        orphanAmount.length !== 1 || newMarketsAmount.length !== 1 ||
        orphanDetail.length !== 1 || newMarketsDetail.length !== 1 ||
        orphanRow[0].metadata.sourceCount !== 1 ||
        newMarketsRow[0].metadata.sourceCount !== 1 ||
        orphanRow[0].metadata.referenceDocumentName !== "IRS8820" ||
        newMarketsRow[0].metadata.referenceDocumentName !== "IRS8874" ||
        !orphanRow[0].metadata.referenceDocumentId ||
        !newMarketsRow[0].metadata.referenceDocumentId ||
        orphanRow[0].metadata.referenceDocumentId ===
          newMarketsRow[0].metadata.referenceDocumentId ||
        orphanDetail[0].credit !== orphanCredit ||
        newMarketsDetail[0].credit !== newMarketsCredit ||
        orphanDetail[0].sourceDocumentId !==
          orphanRow[0].metadata.referenceDocumentId ||
        newMarketsDetail[0].sourceDocumentId !==
          newMarketsRow[0].metadata.referenceDocumentId ||
        orphanAmount[0].nonpassiveCredit !== orphanCredit ||
        newMarketsAmount[0].nonpassiveCredit !== newMarketsCredit ||
        orphanAmount[0].totalCredit !== orphanCredit ||
        newMarketsAmount[0].totalCredit !== newMarketsCredit
      ) {
        throw new Error(
          "Form 3800 PDF mixed orphan-drug/New Markets rows differ from filed sources",
        );
      }
    }
    if (
      source.f8820_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      source.f8835_credit_entries?.length === 1 &&
      !source.f8874_credit && !source.f5884_credit &&
      !source.f8826_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.f8936_new_vehicle_credit &&
      !source.f8936_commercial_vehicle_credit &&
      !source.f8820_k1_credit_entries?.length &&
      !source.passive_source_allocations?.length &&
      !source.carryforward_vintages?.length
    ) {
      const orphanSource = f8820InputSchema.parse(all.f8820);
      const orphanCredit = calculateForm8820(orphanSource).line4;
      const geothermalSources = form8835PdfSources(all, filer, prepared);
      const geothermalCredit = geothermalSources[0]?.lines.line15;
      const rawSource = f3800InputSchema.parse(raw);
      const orphanRow = prepared.currentRows.filter((row) => row.line === "1h");
      const geothermalRow = prepared.currentRows.filter((row) =>
        row.line === "4e"
      );
      const orphanAmount = prepared.currentAmounts.filter((row) =>
        row.line === "1h"
      );
      const geothermalAmount = prepared.currentAmounts.filter((row) =>
        row.line === "4e"
      );
      const orphanDetail = prepared.currentDetails.filter((row) =>
        row.line === "1h"
      );
      const geothermalDetail = prepared.currentDetails.filter((row) =>
        row.line === "4e"
      );
      if (
        orphanSource.subject_to_passive_activity_limit ||
        (orphanSource.pass_through_credits?.length ?? 0) !== 0 ||
        orphanCredit <= 0 || geothermalSources.length !== 1 ||
        geothermalCredit === undefined || geothermalCredit <= 0 ||
        source.f8820_credit.credit_amount !== orphanCredit ||
        rawSource.f8820_credit?.credit_amount !== orphanCredit ||
        JSON.stringify(rawSource.f8820_credit) !==
          JSON.stringify(source.f8820_credit) ||
        rawSource.f8835_credit_entries?.length !== 1 ||
        JSON.stringify(rawSource.f8835_credit_entries[0]) !==
          JSON.stringify(source.f8835_credit_entries[0]) ||
        rawSource.f8835_credit_entries[0].credit_amount !== geothermalCredit ||
        orphanRow.length !== 1 || geothermalRow.length !== 1 ||
        orphanAmount.length !== 1 || geothermalAmount.length !== 1 ||
        orphanDetail.length !== 1 || geothermalDetail.length !== 1 ||
        orphanRow[0].metadata.sourceCount !== 1 ||
        geothermalRow[0].metadata.sourceCount !== 1 ||
        orphanRow[0].metadata.referenceDocumentName !== "IRS8820" ||
        geothermalRow[0].metadata.referenceDocumentName !== "IRS8835" ||
        !orphanRow[0].metadata.referenceDocumentId ||
        !geothermalRow[0].metadata.referenceDocumentId ||
        orphanRow[0].metadata.referenceDocumentId ===
          geothermalRow[0].metadata.referenceDocumentId ||
        orphanDetail[0].sourceDocumentId !==
          orphanRow[0].metadata.referenceDocumentId ||
        geothermalDetail[0].sourceDocumentId !==
          geothermalRow[0].metadata.referenceDocumentId ||
        orphanDetail[0].credit !== orphanCredit ||
        geothermalDetail[0].credit !== geothermalCredit ||
        orphanAmount[0].nonpassiveCredit !== orphanCredit ||
        geothermalAmount[0].nonpassiveCredit !== geothermalCredit ||
        prepared.lines.line1 !== orphanCredit ||
        prepared.lines.line6 !== orphanCredit ||
        prepared.lines.line17 !== orphanCredit ||
        prepared.lines.line30 !== geothermalCredit ||
        prepared.lines.line37 !== geothermalCredit ||
        prepared.lines.line38 !== orphanCredit + geothermalCredit
      ) {
        throw new Error(
          "Form 3800 PDF mixed orphan-drug/geothermal sources differ from prepared tax use",
        );
      }
    }
    if (
      source.f8874_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      source.passive_source_allocations?.length === 1 &&
      !source.f8820_credit && !source.f5884_credit &&
      !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f8874_k1_credit_entries?.length &&
      !source.f8820_k1_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.f8936_new_vehicle_credit &&
      !source.f8936_commercial_vehicle_credit &&
      !source.carryforward_vintages?.length
    ) {
      const filed = f8874InputSchema.parse(all.f8874);
      const credits = calculateForm8874(filed);
      const { lines: passive, nonpassiveForm8874Credit } =
        reconcileFiledForm8582CROrdinary(all.form8582cr, all);
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1i");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1i"
      );
      const ordinaryDetails = prepared.currentDetails.filter((row) =>
        row.line === "1i"
      );
      const passiveDetails = prepared.passiveCurrentDetails.filter((row) =>
        row.line === "1i"
      );
      if (
        credits.rows.length !== 2 ||
        credits.rows.filter((row) =>
            row.investment.subject_to_passive_activity_limit
          ).length !== 1 ||
        nonpassiveForm8874Credit <= 0 ||
        credits.nonpassiveCredit !== nonpassiveForm8874Credit ||
        credits.passiveCredit !== passive.partI.line5 ||
        JSON.stringify(rawSource.f8874_credit) !==
          JSON.stringify(source.f8874_credit) ||
        JSON.stringify(rawSource.passive_source_allocations) !==
          JSON.stringify(source.passive_source_allocations) ||
        rows.length !== 1 || amounts.length !== 1 ||
        ordinaryDetails.length !== 1 || passiveDetails.length !== 1 ||
        rows[0].metadata.sourceCount !== 2 ||
        rows[0].metadata.referenceDocumentName !== "IRS8874" ||
        !rows[0].metadata.referenceDocumentId ||
        ordinaryDetails[0].sourceDocumentId !==
          rows[0].metadata.referenceDocumentId ||
        passiveDetails[0].sourceDocument?.documentId !==
          rows[0].metadata.referenceDocumentId ||
        ordinaryDetails[0].credit !== nonpassiveForm8874Credit ||
        passiveDetails[0].source.beforePassiveLimit !==
          credits.passiveCredit ||
        passiveDetails[0].source.afterPassiveLimit !== passive.line37 ||
        amounts[0].nonpassiveCredit !== nonpassiveForm8874Credit ||
        amounts[0].passiveBeforeLimit !== credits.passiveCredit ||
        amounts[0].passiveAfterLimit !== passive.line37 ||
        amounts[0].appliedCredit !==
          nonpassiveForm8874Credit + passive.line37 ||
        prepared.lines.line1 !== nonpassiveForm8874Credit ||
        prepared.lines.line2 !== credits.passiveCredit ||
        prepared.lines.line3 !== passive.line37 ||
        prepared.lines.line6 !==
          nonpassiveForm8874Credit + passive.line37 ||
        prepared.lines.line17 !==
          nonpassiveForm8874Credit + passive.line37 ||
        prepared.lines.line38 !==
          nonpassiveForm8874Credit + passive.line37
      ) {
        throw new Error(
          "Form 3800 PDF mixed passive/nonpassive Form 8874 row differs from filed source",
        );
      }
    }
    if (
      !source.f8874_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      source.passive_source_allocations !== undefined &&
      source.passive_source_allocations.length >= 2 &&
      source.passive_source_allocations.every((entry) =>
        entry.source_origin.kind === "self" &&
        entry.source_form === "Form 8874" &&
        entry.form3800_credit_line === "1i"
      ) &&
      !source.f8820_credit && !source.f5884_credit &&
      !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f8874_k1_credit_entries?.length &&
      !source.f8820_k1_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.carryforward_vintages?.length
    ) {
      const filed = f8874InputSchema.parse(all.f8874);
      const credits = calculateForm8874(filed);
      const { lines: passive, ledger } = reconcileFiledForm8582CROrdinary(
        all.form8582cr,
        all,
      );
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1i");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1i"
      );
      const details = prepared.passiveCurrentDetails.filter((row) =>
        row.line === "1i"
      );
      if (
        credits.rows.length !== ledger.rows.length ||
        credits.nonpassiveCredit !== 0 ||
        credits.passiveCredit !== passive.partI.line5 ||
        ledger.rows.length > FORM3800_PRINTED_PART_V_ROWS ||
        new Set(ledger.rows.map((row) =>
            JSON.stringify([
              row.source.activity_reference,
              row.source.source_document_reference,
            ])
          )).size !== ledger.rows.length ||
        JSON.stringify(rawSource.passive_source_allocations) !==
          JSON.stringify(source.passive_source_allocations) ||
        rows.length !== 1 || amounts.length !== 1 ||
        details.length !== ledger.rows.length ||
        prepared.currentDetails.some((row) => row.line === "1i") ||
        rows[0].metadata.sourceCount !== ledger.rows.length ||
        rows[0].metadata.referenceDocumentName !== "IRS8874" ||
        !rows[0].metadata.referenceDocumentId ||
        details.some((detail) => {
          const matches = ledger.rows.filter((row) =>
            row.source.activity_reference ===
              detail.source.activityReference &&
            row.source.source_document_reference ===
              detail.source.sourceDocumentReference
          );
          return matches.length !== 1 ||
            detail.sourceDocument?.documentId !==
              rows[0].metadata.referenceDocumentId ||
            detail.source.beforePassiveLimit !== matches[0].total_credit ||
            detail.source.afterPassiveLimit !== matches[0].allowed_credit ||
            detail.source.unusedAfterTaxLimit !== 0;
        }) ||
        ledger.rows.some((row) =>
          details.filter((detail) =>
            detail.source.activityReference === row.source.activity_reference &&
            detail.source.sourceDocumentReference ===
              row.source.source_document_reference
          ).length !== 1
        ) ||
        amounts[0].nonpassiveCredit !== 0 ||
        amounts[0].passiveBeforeLimit !== credits.passiveCredit ||
        amounts[0].passiveAfterLimit !== passive.line37 ||
        amounts[0].appliedCredit !== passive.line37 ||
        prepared.lines.line1 !== 0 ||
        prepared.lines.line2 !== credits.passiveCredit ||
        prepared.lines.line3 !== passive.line37 ||
        prepared.lines.line6 !== passive.line37 ||
        prepared.lines.line17 !== passive.line37 ||
        prepared.lines.line38 !== passive.line37
      ) {
        throw new Error(
          "Form 3800 PDF passive Form 8874 activities differ from filed Worksheet 9",
        );
      }
    }
    if (
      !source.f8874_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      source.passive_source_allocations !== undefined &&
      source.passive_source_allocations.length >= 2 &&
      source.passive_source_allocations.every((entry) =>
        (entry.source_origin.kind === "partnership" ||
          entry.source_origin.kind === "s_corporation") &&
        entry.source_form === "Form 8874" &&
        entry.form3800_credit_line === "1i"
      ) &&
      !source.f8820_credit && !source.f5884_credit &&
      !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f8874_k1_credit_entries?.length &&
      !source.f8820_k1_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.carryforward_vintages?.length
    ) {
      const { lines: passive, ledger } = reconcileFiledForm8582CROrdinary(
        all.form8582cr,
        all,
      );
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1i");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1i"
      );
      const details = prepared.passiveCurrentDetails.filter((row) =>
        row.line === "1i"
      );
      if (
        all.f8874 !== undefined ||
        JSON.stringify(rawSource.passive_source_allocations) !==
          JSON.stringify(source.passive_source_allocations) ||
        ledger.rows.length !== source.passive_source_allocations.length ||
        ledger.rows.length > FORM3800_PRINTED_PART_V_ROWS ||
        rows.length !== 1 || amounts.length !== 1 ||
        details.length !== ledger.rows.length ||
        prepared.currentDetails.some((row) => row.line === "1i") ||
        rows[0].metadata.sourceCount !== ledger.rows.length ||
        rows[0].metadata.referenceDocumentId !== undefined ||
        rows[0].metadata.referenceDocumentName !== undefined ||
        details.some((detail) => {
          const matches = ledger.rows.filter((row) =>
            row.source.activity_reference ===
              detail.source.activityReference &&
            row.source.source_document_reference ===
              detail.source.sourceDocumentReference &&
            row.source.source_form === detail.source.sourceForm &&
            row.source.reporting_route === detail.source.reportingRoute &&
            row.source.form3800_credit_line ===
              detail.source.form3800CreditLine &&
            detail.source.originatingTaxYear === 2025 &&
            row.source.source_origin.kind === detail.source.sourceOrigin.kind &&
            row.source.source_origin.kind !== "self" &&
            detail.source.sourceOrigin.kind !== "self" &&
            row.source.source_origin.ein === detail.source.sourceOrigin.ein &&
            row.source.source_origin.entity_reference ===
              detail.source.sourceOrigin.entity_reference
          );
          return matches.length !== 1 ||
            detail.sourceDocument !== undefined ||
            detail.source.beforePassiveLimit !== matches[0].total_credit ||
            detail.source.afterPassiveLimit !== matches[0].allowed_credit ||
            detail.source.unusedAfterTaxLimit !== 0;
        }) ||
        ledger.rows.some((row) =>
          details.filter((detail) =>
            detail.source.activityReference === row.source.activity_reference &&
            detail.source.sourceDocumentReference ===
              row.source.source_document_reference
          ).length !== 1
        ) ||
        amounts[0].nonpassiveCredit !== 0 ||
        amounts[0].passiveBeforeLimit !== passive.partI.line5 ||
        amounts[0].passiveAfterLimit !== passive.line37 ||
        amounts[0].appliedCredit !== passive.line37 ||
        prepared.lines.line1 !== 0 ||
        prepared.lines.line2 !== passive.partI.line5 ||
        prepared.lines.line3 !== passive.line37 ||
        prepared.lines.line6 !== passive.line37 ||
        prepared.lines.line17 !== passive.line37 ||
        prepared.lines.line38 !== passive.line37
      ) {
        throw new Error(
          "Form 3800 PDF pass-through New Markets activities differ from filed K-1 and Worksheet 9 sources",
        );
      }
    }
    if (
      !source.f8874_credit &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      source.passive_source_allocations !== undefined &&
      source.passive_source_allocations.length >= 2 &&
      source.passive_source_allocations.some((entry) =>
        entry.source_origin.kind === "self"
      ) &&
      source.passive_source_allocations.some((entry) =>
        entry.source_origin.kind === "partnership" ||
        entry.source_origin.kind === "s_corporation"
      ) &&
      source.passive_source_allocations.every((entry) =>
        (entry.source_origin.kind === "self" ||
          entry.source_origin.kind === "partnership" ||
          entry.source_origin.kind === "s_corporation") &&
        entry.source_form === "Form 8874" &&
        entry.form3800_credit_line === "1i"
      ) &&
      !source.f8820_credit && !source.f5884_credit &&
      !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f8874_k1_credit_entries?.length &&
      !source.f8820_k1_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.carryforward_vintages?.length
    ) {
      const credits = calculateForm8874(f8874InputSchema.parse(all.f8874));
      const { lines: passive, ledger } = reconcileFiledForm8582CROrdinary(
        all.form8582cr,
        all,
      );
      const selfRows = ledger.rows.filter((row) =>
        row.source.source_origin.kind === "self"
      );
      const k1Rows = ledger.rows.filter((row) =>
        row.source.source_origin.kind === "partnership" ||
        row.source.source_origin.kind === "s_corporation"
      );
      const rawSource = f3800InputSchema.parse(raw);
      const rows = prepared.currentRows.filter((row) => row.line === "1i");
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === "1i"
      );
      const details = prepared.passiveCurrentDetails.filter((row) =>
        row.line === "1i"
      );
      if (
        credits.nonpassiveCredit !== 0 ||
        credits.rows.length !== selfRows.length ||
        credits.passiveCredit !== selfRows.reduce(
            (sum, row) => sum + row.total_credit,
            0,
          ) ||
        credits.passiveCredit + k1Rows.reduce(
                (sum, row) => sum + row.total_credit,
                0,
              ) !== passive.partI.line5 ||
        JSON.stringify(rawSource.passive_source_allocations) !==
          JSON.stringify(source.passive_source_allocations) ||
        ledger.rows.length !== source.passive_source_allocations.length ||
        ledger.rows.length > FORM3800_PRINTED_PART_V_ROWS ||
        rows.length !== 1 || amounts.length !== 1 ||
        details.length !== ledger.rows.length ||
        prepared.currentDetails.some((row) => row.line === "1i") ||
        rows[0].metadata.sourceCount !== ledger.rows.length ||
        rows[0].metadata.referenceDocumentName !== "IRS8874" ||
        !rows[0].metadata.referenceDocumentId ||
        details.some((detail) => {
          const matches = ledger.rows.filter((row) =>
            row.source.activity_reference ===
              detail.source.activityReference &&
            row.source.source_document_reference ===
              detail.source.sourceDocumentReference &&
            row.source.source_form === detail.source.sourceForm &&
            row.source.reporting_route === detail.source.reportingRoute &&
            row.source.form3800_credit_line ===
              detail.source.form3800CreditLine &&
            detail.source.originatingTaxYear === 2025 &&
            row.source.source_origin.kind === detail.source.sourceOrigin.kind
          );
          if (matches.length !== 1) return true;
          const match = matches[0];
          const origin = match.source.source_origin;
          const detailOrigin = detail.source.sourceOrigin;
          const linkedDocumentId = origin.kind === "self"
            ? rows[0].metadata.referenceDocumentId
            : undefined;
          return detail.sourceDocument?.documentId !== linkedDocumentId ||
            detail.sourceDocument?.documentName !==
              (origin.kind === "self" ? "IRS8874" : undefined) ||
            (origin.kind !== "self" && detailOrigin.kind !== "self" &&
              (origin.ein !== detailOrigin.ein ||
                origin.entity_reference !== detailOrigin.entity_reference)) ||
            detail.source.beforePassiveLimit !== match.total_credit ||
            detail.source.afterPassiveLimit !== match.allowed_credit ||
            detail.source.appliedAgainstTax !== match.allowed_credit ||
            detail.source.unusedAfterTaxLimit !== 0;
        }) ||
        ledger.rows.some((row) =>
          details.filter((detail) =>
            detail.source.activityReference === row.source.activity_reference &&
            detail.source.sourceDocumentReference ===
              row.source.source_document_reference
          ).length !== 1
        ) ||
        amounts[0].nonpassiveCredit !== 0 ||
        amounts[0].passiveBeforeLimit !== passive.partI.line5 ||
        amounts[0].passiveAfterLimit !== passive.line37 ||
        amounts[0].appliedCredit !== passive.line37 ||
        prepared.lines.line1 !== 0 ||
        prepared.lines.line2 !== passive.partI.line5 ||
        prepared.lines.line3 !== passive.line37 ||
        prepared.lines.line6 !== passive.line37 ||
        prepared.lines.line17 !== passive.line37 ||
        prepared.lines.line38 !== passive.line37
      ) {
        throw new Error(
          "Form 3800 PDF self-earned and K-1 New Markets activities differ from filed sources and Worksheet 9",
        );
      }
    }
    const directOrphanK1 = source.f8820_k1_credit_entries;
    const rawOrphanK1 = raw.f8820_k1_credit_entries === undefined
      ? undefined
      : f3800InputSchema.parse(raw).f8820_k1_credit_entries;
    if (
      [...(directOrphanK1 ?? []), ...(rawOrphanK1 ?? [])].some((entry) =>
        entry.source_type === "estate" || entry.source_type === "trust"
      )
    ) {
      throw new Error(
        "Form 3800 PDF estate/trust K-1 box 13 code M orphan-drug credit needs qualified clinical-testing and passive-activity source evidence",
      );
    }
    const trustPartVClaims = reconcileFiledTrustPartVClaims(all);
    const trustPartVEntries = source.f3468_trust_part_v_credit_entries ?? [];
    const rawTrustPartVEntries =
      raw.f3468_trust_part_v_credit_entries === undefined
        ? []
        : f3800InputSchema.parse(raw).f3468_trust_part_v_credit_entries ?? [];
    if (
      trustPartVClaims.length > 0 || trustPartVEntries.length > 0 ||
      rawTrustPartVEntries.length > 0
    ) {
      const row = prepared.currentRows.filter((item) => item.line === "1v");
      const amount = prepared.currentAmounts.filter((item) =>
        item.line === "1v"
      );
      const details = prepared.currentDetails.filter((item) =>
        item.line === "1v"
      );
      const claimKeys = trustPartVClaims.map((claim) =>
        JSON.stringify([
          claim.source_type,
          claim.source_ein,
          claim.source_document_reference,
          claim.source_statement_reference,
          claim.credit_amount,
          claim.subject_to_passive_activity_limit,
        ])
      );
      const entryKeys = trustPartVEntries.map((entry) =>
        JSON.stringify([
          entry.source_type,
          entry.source_ein,
          entry.source_document_reference,
          entry.source_statement_reference,
          entry.credit_amount,
          entry.subject_to_passive_activity_limit,
        ])
      );
      const credit = trustPartVClaims.reduce(
        (sum, claim) => sum + claim.credit_amount,
        0,
      );
      const creditByEin = new Map<string, number>();
      for (const claim of trustPartVClaims) {
        creditByEin.set(
          claim.source_ein,
          (creditByEin.get(claim.source_ein) ?? 0) + claim.credit_amount,
        );
      }
      const largestEin = [...creditByEin.entries()]
        .sort((left, right) => right[1] - left[1])[0]?.[0];
      if (
        claimKeys.length === 0 ||
        trustPartVClaims.some((claim) =>
          claim.statement.beneficiary_ssn !== filer.primarySSN
        ) ||
        new Set(claimKeys).size !== claimKeys.length ||
        claimKeys.length !== entryKeys.length ||
        claimKeys.some((key) => !entryKeys.includes(key)) ||
        JSON.stringify(rawTrustPartVEntries) !==
          JSON.stringify(trustPartVEntries) ||
        row.length !== 1 || amount.length !== 1 ||
        details.length !== trustPartVClaims.length ||
        row[0].metadata.sourceCount !== trustPartVClaims.length ||
        !(row[0].metadata.entity && "ein" in row[0].metadata.entity) ||
        row[0].metadata.entity.ein !== largestEin ||
        row[0].metadata.referenceDocumentName !== "IRS3468" ||
        row[0].metadata.referenceDocumentId !==
          details.map((detail) => detail.sourceDocumentId).join(" ") ||
        row[0].entityCredits.length !== trustPartVClaims.length ||
        row[0].entityCredits.some((entity, index) =>
          !("ein" in entity.entity) ||
          entity.entity.ein !== trustPartVClaims[index].source_ein ||
          entity.credit !== trustPartVClaims[index].credit_amount
        ) ||
        details.some((detail, index) =>
          detail.passThroughEin !== trustPartVClaims[index].source_ein ||
          detail.credit !== trustPartVClaims[index].credit_amount ||
          !detail.sourceDocumentId ||
          detail.appliedCredit < 0 ||
          detail.appliedCredit > detail.credit
        ) ||
        amount[0].nonpassiveCredit !== credit ||
        amount[0].totalCredit !== credit ||
        amount[0].transferOutCredit !== 0 ||
        amount[0].passiveBeforeLimit !== 0 ||
        amount[0].passiveAfterLimit !== 0 ||
        amount[0].appliedCredit !==
          details.reduce((sum, detail) => sum + detail.appliedCredit, 0)
      ) {
        throw new Error(
          "Form 3800 PDF line 1v differs from reviewed trust Form 3468 source",
        );
      }
    }
    if (
      directOrphanK1?.length === 1 &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      directOrphanK1[0].source_type === "partnership" &&
      !source.f8820_credit &&
      !(source.passive_source_allocations ?? []).some((entry) =>
        entry.form3800_credit_line === "1h"
      )
    ) {
      const [entry] = sourceOrphanDrugK1Credits(source, { pending: all });
      if (!entry) {
        throw new Error(
          "Form 3800 printable orphan-drug K-1 source is missing",
        );
      }
      const rawEntries = rawOrphanK1;
      const rawEntry = rawEntries?.[0];
      const row = prepared.currentRows.find((item) => item.line === "1h");
      const amount = prepared.currentAmounts.find((item) => item.line === "1h");
      if (
        rawEntries?.length !== 1 || !rawEntry ||
        rawEntry.source_type !== entry.source_type ||
        rawEntry.source_ein !== entry.source_ein ||
        rawEntry.source_document_reference !==
          entry.source_document_reference ||
        rawEntry.credit_amount !== entry.credit_amount ||
        rawEntry.subject_to_passive_activity_limit !==
          entry.subject_to_passive_activity_limit ||
        !row || !amount || row.metadata.sourceCount !== 1 ||
        row.entityCredits.length !== 1 ||
        !("ein" in row.entityCredits[0].entity) ||
        row.entityCredits[0].entity.ein !== entry.source_ein ||
        row.entityCredits[0].credit !== entry.credit_amount ||
        !(row.metadata.entity && "ein" in row.metadata.entity) ||
        row.metadata.entity.ein !== entry.source_ein ||
        amount.nonpassiveCredit !== entry.credit_amount ||
        amount.totalCredit !== entry.credit_amount ||
        amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0
      ) {
        throw new Error(
          "Form 3800 printable orphan-drug line 1h differs from its K-1 source",
        );
      }
    }
    if (
      directOrphanK1?.length === 2 &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      directOrphanK1.every((entry) => entry.source_type === "partnership") &&
      !source.f8820_credit && !source.f8874_credit &&
      !source.f5884_credit && !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.f8936_new_vehicle_credit &&
      !source.f8936_commercial_vehicle_credit &&
      !source.f8874_k1_credit_entries?.length &&
      !source.passive_source_allocations?.length &&
      !source.carryforward_vintages?.length
    ) {
      const entries = sourceOrphanDrugK1Credits(source, { pending: all });
      const rawSource = f3800InputSchema.parse(raw);
      const [row] = prepared.currentRows;
      const [amount] = prepared.currentAmounts;
      const details = prepared.currentDetails.filter((detail) =>
        detail.line === "1h"
      );
      const total = entries.reduce(
        (sum, entry) => sum + entry.credit_amount,
        0,
      );
      const largest = entries[0].credit_amount >= entries[1].credit_amount
        ? entries[0]
        : entries[1];
      if (
        entries[0].source_ein === entries[1].source_ein ||
        entries.some((entry) =>
          entry.credit_amount <= 0 || entry.subject_to_passive_activity_limit
        ) ||
        JSON.stringify(rawSource.f8820_k1_credit_entries) !==
          JSON.stringify(directOrphanK1) ||
        prepared.currentRows.length !== 1 ||
        prepared.currentAmounts.length !== 1 ||
        prepared.currentDetails.length !== 2 ||
        prepared.carryoverRows.length !== 0 ||
        row?.line !== "1h" || row.metadata.sourceCount !== 2 ||
        row.entityCredits.length !== 2 ||
        !(row.metadata.entity && "ein" in row.metadata.entity) ||
        row.metadata.entity.ein !== largest.source_ein ||
        row.entityCredits.some((entity, index) =>
          !("ein" in entity.entity) ||
          entity.entity.ein !== entries[index].source_ein ||
          entity.credit !== entries[index].credit_amount
        ) ||
        details.length !== 2 ||
        details.some((detail, index) =>
          detail.credit !== entries[index].credit_amount ||
          detail.appliedCredit !== entries[index].credit_amount ||
          detail.passThroughEin !== entries[index].source_ein
        ) ||
        amount?.line !== "1h" ||
        amount.nonpassiveCredit !== total || amount.totalCredit !== total ||
        amount.appliedCredit !== total || amount.transferOutCredit !== 0 ||
        amount.passiveBeforeLimit !== 0 || amount.passiveAfterLimit !== 0 ||
        prepared.lines.line1 !== total || prepared.lines.line6 !== total ||
        prepared.lines.line17 !== total ||
        (prepared.lines.line37 ?? 0) !== 0 ||
        prepared.lines.line38 !== total
      ) {
        throw new Error(
          "Form 3800 PDF two partnership orphan-drug sources differ from Part V and filed K-1s",
        );
      }
    }
    if (
      source.f8820_credit && directOrphanK1?.length === 1 &&
      !source.f8844_direct_employer_credit &&
      !source.f8881_credit &&
      !source.f8908_credit &&
      !source.f8941_direct_employer_credit &&
      !source.f8994_direct_employer_credit &&
      !source.f8864_direct_producer_credit &&
      !source.f8882_direct_employer_credit &&
      directOrphanK1[0].source_type === "partnership" &&
      !source.f8874_credit && !source.f5884_credit &&
      !source.f8835_credit_entries?.length &&
      !source.f8826_credit_entries?.length &&
      !source.f3468_trust_part_v_credit_entries?.length &&
      !source.f8936_new_vehicle_credit &&
      !source.f8936_commercial_vehicle_credit &&
      !source.f8874_k1_credit_entries?.length &&
      !source.passive_source_allocations?.length &&
      !source.carryforward_vintages?.length
    ) {
      const filed = f8820InputSchema.parse(all.f8820);
      const selfCredit = calculateForm8820(filed).line2c;
      const [k1Credit] = sourceOrphanDrugK1Credits(source, {
        pending: all,
      });
      const rawSource = f3800InputSchema.parse(raw);
      const row = prepared.currentRows[0];
      const amount = prepared.currentAmounts[0];
      const [selfDetail, k1Detail] = prepared.currentDetails;
      const total = selfCredit + k1Credit.credit_amount;
      if (
        filed.subject_to_passive_activity_limit ||
        (filed.pass_through_credits?.length ?? 0) !== 0 ||
        selfCredit <= 0 || k1Credit.credit_amount <= 0 ||
        source.f8820_credit.subject_to_passive_activity_limit ||
        source.f8820_credit.credit_amount !== selfCredit ||
        JSON.stringify(rawSource.f8820_credit) !==
          JSON.stringify(source.f8820_credit) ||
        JSON.stringify(rawSource.f8820_k1_credit_entries) !==
          JSON.stringify(directOrphanK1) ||
        prepared.currentRows.length !== 1 ||
        prepared.currentAmounts.length !== 1 ||
        prepared.currentDetails.length !== 2 ||
        prepared.carryoverRows.length !== 0 ||
        row?.line !== "1h" || row.metadata.sourceCount !== 2 ||
        row.metadata.referenceDocumentName !== "IRS8820" ||
        !row.metadata.referenceDocumentId ||
        row.entityCredits.length !== 1 ||
        !("ein" in row.entityCredits[0].entity) ||
        row.entityCredits[0].entity.ein !== k1Credit.source_ein ||
        row.entityCredits[0].credit !== k1Credit.credit_amount ||
        amount?.line !== "1h" ||
        amount.nonpassiveCredit !== total ||
        amount.totalCredit !== total ||
        amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.transferOutCredit !== 0 ||
        amount.appliedCredit !== total ||
        selfDetail?.line !== "1h" ||
        selfDetail.credit !== selfCredit ||
        selfDetail.appliedCredit !== selfCredit ||
        selfDetail.passThroughEin !== undefined ||
        selfDetail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        k1Detail?.line !== "1h" ||
        k1Detail.credit !== k1Credit.credit_amount ||
        k1Detail.appliedCredit !== k1Credit.credit_amount ||
        k1Detail.passThroughEin !== k1Credit.source_ein ||
        k1Detail.sourceDocumentId !== undefined ||
        prepared.lines.line1 !== total ||
        prepared.lines.line6 !== total ||
        prepared.lines.line17 !== total ||
        (prepared.lines.line37 ?? 0) !== 0 ||
        prepared.lines.line38 !== total
      ) {
        throw new Error(
          "Form 3800 PDF mixed self-earned and partnership orphan-drug line 1h differs from filed sources",
        );
      }
    }
    const projected = {
      ...projectForm3800HeaderFields(prepared, filer),
      ...projectForm3800PartIAndIIFields(prepared, line6a),
      ...projectForm3800PartIIIFields(prepared),
      ...projectForm3800PartIVFields(prepared),
      ...projectForm3800PartVFields(prepared),
      ...projectForm3800PartVIFields(prepared),
    };
    for (const key of Object.keys(projected)) {
      if (!paths.has(key)) {
        throw new Error(`Form 3800 printable field is not mapped: ${key}`);
      }
    }
    return [projected];
  },
  async appendSupplementalPages(document, _fields, filer, all, prepared) {
    const entries = all?.f3800
      ? f3800InputSchema.parse(all.f3800).carryforward_vintages ?? []
      : [];
    if (entries.length === 0) {
      if (prepared?.carryforwardSources.length) {
        throw new Error(
          "Form 3800 printable carryforward source lacks ledger history",
        );
      }
      return;
    }
    if (!prepared) {
      throw new Error(
        "Form 3800 carryforward history needs prepared MeF parts",
      );
    }
    const reconciled = reconcileForm3800NonpassiveCarryforwards(entries);
    if (prepared.carryforwardSources.length !== reconciled.length) {
      throw new Error(
        "Form 3800 printable carryforward history source count differs from MeF",
      );
    }
    for (const vintage of reconciled) {
      const source = prepared.carryforwardSources.find((source) =>
        source.sourceKey === `carryforward:${vintage.sourceKey}`
      );
      const sourceCents = Math.round((source?.availableCredit ?? NaN) * 100);
      if (
        !source || source.line !== vintage.form3800CreditLine ||
        source.originatingTaxYear !== vintage.originatingTaxYear ||
        !source.documentId.trim() ||
        !Number.isSafeInteger(sourceCents) ||
        Math.abs(source.availableCredit * 100 - sourceCents) > 0.000001 ||
        sourceCents !==
          Math.round(vintage.availableAfterAdjustment * 100) ||
        source.revisedFromOriginal !== vintage.revisedFromOriginal
      ) {
        throw new Error(
          "Form 3800 printable carryforward history differs from prepared MeF source",
        );
      }
    }
    await appendForm3800CarryoverStatement(
      document,
      entries.map((entry) => entry.vintage),
      filer,
    );
  },
};
