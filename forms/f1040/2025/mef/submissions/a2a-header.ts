import { element } from "../../../mef/xml.ts";
import { julianDay, MefTestCd } from "./submission-manifest.ts";

const MEF_HEADER_NAMESPACE = "http://www.irs.gov/a2a/mef/MeFHeader.xsd";
const WSDL_VERSION = "10.9";

export interface MefHeaderOptions {
  readonly etin: string;
  /** A2A Application System ID; an account identifier, never a credential. */
  readonly appSysId: string;
  readonly messageTs: Date;
  /** Eight lower-case letters or digits, unique per message (T0000-013). */
  readonly messageSequence: string;
  readonly testCd: MefTestCd;
  readonly action: "SendSubmissions";
}

/** WSDL 10.9 HeaderMessageIdType and T0000-015/016: ETIN + ccyyddd + eight alphanumerics. */
export function mefMessageId(
  etin: string,
  messageTs: Date,
  sequence: string,
): string {
  if (!/^[0-9]{5}$/.test(etin)) {
    throw new Error("MeF Message ID needs the transmitter's five-digit ETIN");
  }
  if (Number.isNaN(messageTs.getTime())) {
    throw new Error("MeF Message ID needs a valid message timestamp");
  }
  if (!/^[a-z0-9]{8}$/.test(sequence)) {
    throw new Error(
      "MeF Message ID sequence must be eight lower-case letters or digits",
    );
  }
  return etin + String(messageTs.getUTCFullYear()) +
    String(julianDay(messageTs)).padStart(3, "0") + sequence;
}

/** The MeFHeader SOAP header block; TestCd routes ATS traffic to the test environment. */
export function buildMefHeaderXml(options: MefHeaderOptions): string {
  if (!options.appSysId.trim()) {
    throw new Error("MeF header needs the A2A Application System ID");
  }
  const children = [
    element(
      "MessageID",
      mefMessageId(options.etin, options.messageTs, options.messageSequence),
    ),
    element("Action", options.action),
    element("MessageTs", options.messageTs.toISOString()),
    element("ETIN", options.etin),
    element("TestCd", options.testCd),
    element("AppSysID", options.appSysId),
    element("WSDLVersionNum", WSDL_VERSION),
  ];
  return `<MeFHeader xmlns="${MEF_HEADER_NAMESPACE}">${
    children.join("")
  }</MeFHeader>`;
}
