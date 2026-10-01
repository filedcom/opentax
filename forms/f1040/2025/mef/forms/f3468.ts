import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { inputSchema as f3468InputSchema } from "../../../nodes/inputs/f3468/index.ts";
import { reconcileFiledTrustPartVClaims } from "./f3468_source.ts";

/** One TY2025 Part V Section A document per trust-owned solar facility. */
export const form3468: MefFormDescriptor<"f3468", unknown, readonly string[]> =
  {
    pendingKey: "f3468",
    FIELD_MAP: [],
    pdfUrl: "https://www.irs.gov/pub/irs-prior/f3468--2025.pdf",
    build(raw, context) {
      if (raw === undefined || raw === null) return [];
      if (!context?.pending) {
        throw new Error(
          "Trust Form 3468 needs the source K-1 and filed Form 3800",
        );
      }
      if (
        JSON.stringify(f3468InputSchema.parse(raw)) !==
          JSON.stringify(f3468InputSchema.parse(context.pending.f3468))
      ) {
        throw new Error("Form 3468 native source differs from pending return");
      }
      const claims = reconcileFiledTrustPartVClaims(context.pending);
      if (claims.length === 0) {
        throw new Error("Form 3468 has no supported trust Part V claim");
      }
      const filer = context.filer;
      if (
        !filer ||
        claims.some((claim) =>
          claim.statement.beneficiary_ssn !== filer.primarySSN
        )
      ) {
        throw new Error(
          "Trust Form 3468 beneficiary differs from filed taxpayer",
        );
      }
      const form3800 = context.pending.f3800;
      if (
        !form3800 || typeof form3800 !== "object" || Array.isArray(form3800)
      ) {
        throw new Error("Trust Form 3468 needs filed Form 3800");
      }
      const entries = (form3800 as Record<string, unknown>)
        .f3468_trust_part_v_credit_entries;
      if (!Array.isArray(entries) || entries.length !== claims.length) {
        throw new Error("Form 3468 trust source count differs from Form 3800");
      }
      for (const claim of claims) {
        if (
          !entries.some((entry) =>
            entry && typeof entry === "object" &&
            (entry as Record<string, unknown>).source_type === "trust" &&
            (entry as Record<string, unknown>).source_ein ===
              claim.source_ein &&
            (entry as Record<string, unknown>).source_document_reference ===
              claim.source_document_reference &&
            (entry as Record<string, unknown>).source_statement_reference ===
              claim.statement.statement_reference &&
            (entry as Record<string, unknown>).credit_amount ===
              claim.credit_amount &&
            (entry as Record<string, unknown>)
                .subject_to_passive_activity_limit === false
          )
        ) {
          throw new Error(
            "Form 3468 trust credit differs from Form 3800 line 1v source",
          );
        }
      }
      if (
        context.documentIdsByPendingKey &&
        context.documentIdsByPendingKey.f3800?.length !== 1
      ) {
        throw new Error("Trust Form 3468 needs one attached Form 3800");
      }
      return claims.map((claim) => {
        const statement = claim.statement;
        const address = statement.facility_address;
        const credit = claim.credit_amount;
        return elements("IRS3468", [
          element("FacilityTypeDesc", "Solar"),
          elements("FacilityOwnerBusinessName", [
            element("BusinessNameLine1Txt", claim.source_name),
          ]),
          element("FacilityOwnerEIN", claim.source_ein),
          elements("FacilityUSAddress", [
            element("AddressLine1Txt", address.line1),
            element("CityNm", address.city),
            element("StateAbbreviationCd", address.state),
            element("ZIPCd", address.zip),
          ]),
          element(
            "FacilityConstructionStartDt",
            statement.construction_started_on,
          ),
          element("FacilityPlacedInServiceDt", statement.placed_in_service_on),
          element("ExistingFacilityExpansionInd", "false"),
          element("NetOutLess1MWOrThermalEgyCd", "YES"),
          element("ProjWageRqrNAInd", "X"),
          element("DomContentCrNotQlfyInd", "X"),
          element("EgyComBonusCrNotQlfyInd", "X"),
          element("SolarWindCrComNotQlfyInd", "X"),
          elements("QlfyCleanElectricityFcltyGrp", [
            element(
              "BssQlfyInvstSect48Eb1Amt",
              statement.beneficiary_allocated_qualified_basis,
            ),
            element("NetOutLss1MWACOrStsfdWgReqPct", "0.30"),
            element("CalcBssQlfyInvstSect48Eb1Amt", credit),
            element("TotQlfyElecFcltySect48Eb1CrAmt", credit),
          ]),
          element("TotalQlfyElecEgyStorTechCrAmt", credit),
          element("FncFcltyEgyFncCrOrBondAmt", credit),
          element("ACLess1MWEPEAmt", credit),
          element("TotReportableEgyFncCrAmt", credit),
        ]);
      });
    },
  };
