import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { inputSchema } from "../../../nodes/inputs/schedule_lep/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = z.input<typeof inputSchema> | readonly [];

const personNamePattern = /^([A-Za-z0-9'-] ?)*[A-Za-z0-9'-]$/;

export function requestIdentity(
  person: "taxpayer" | "spouse",
  context: MefBuildContext,
): { name: string; ssn: string } {
  const filer = context.filer;
  if (!filer) throw new Error("Schedule LEP needs the filed Form 1040 identity");
  if (person === "spouse" &&
    (filer.filingStatus !== FilingStatus.MarriedFilingJointly || !filer.spouse)) {
    throw new Error("Schedule LEP spouse request needs a joint Form 1040 and spouse identity");
  }
  const source = person === "taxpayer" ? filer : filer.spouse!;
  const name = [source.firstName, source.middleInitial, source.lastName, source.suffix]
    .filter((part) => part !== undefined && part !== "").join(" ");
  const ssn = person === "taxpayer" ? filer.primarySSN : filer.spouse!.ssn;
  if (
    !source.firstName || !source.lastName || name.length > 35 ||
    !personNamePattern.test(name) || !/^\d{9}$/.test(ssn)
  ) {
    throw new Error("Schedule LEP person name and SSN must match the filed identity");
  }
  return { name, ssn };
}

export function buildScheduleLep(
  raw: Input,
  context: MefBuildContext = {},
): readonly string[] {
  if (Array.isArray(raw) && raw.length === 0) return [];
  const source = inputSchema.parse(raw);
  return source.requests.map((request) => {
    const identity = requestIdentity(request.person, context);
    return elements("IRS1040ScheduleLEP", [
      element("PersonNm", identity.name),
      element("SSN", identity.ssn),
      element("LanguagePreferenceCd", request.language_preference_code),
    ]);
  });
}

export const scheduleLep: MefFormDescriptor<"schedule_lep", Input, readonly string[]> = {
  pendingKey: "schedule_lep",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040lep.pdf",
  build: buildScheduleLep,
};
