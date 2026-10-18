/**
 * MeF A2A SOAP 1.1 messages, named exactly as WSDL 10.9 defines them
 * in irs/wsdl/10.9 (MeFMSIServices.wsdl, MeFTransmitterServicesMTOM.wsdl).
 * Message structure and fault handling follow the MeF State and Trading
 * Partners Reference Guide (Pub 5830 / MeF-DOC-STP_REF_GUIDE) §1.3–1.11.
 */
import { escapeXml } from "../../forms/f1040/mef/xml.ts";
import {
  MEF_HEADER_NAMESPACE,
  MefAction,
} from "../../forms/f1040/2025/mef/submissions/a2a-header.ts";
import { MefTestCd } from "../../forms/f1040/2025/mef/submissions/submission-manifest.ts";
import {
  child,
  childElements,
  childText,
  localName,
  parseXml,
  textContent,
  type XmlDocument,
  type XmlElement,
} from "./xml.ts";

export const SOAP_ENV_NAMESPACE = "http://schemas.xmlsoap.org/soap/envelope/";
export const MSI_NAMESPACE = "http://www.irs.gov/a2a/mef/MeFMSIServices.xsd";
export const TRANSMITTER_MTOM_NAMESPACE =
  "http://www.irs.gov/a2a/mef/MeFTransmitterServiceMTOM.xsd";
export const WSSE_NAMESPACE =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
export const DS_NAMESPACE = "http://www.w3.org/2000/09/xmldsig#";
export const XOP_NAMESPACE = "http://www.w3.org/2004/08/xop/include";
export const SAML_NAMESPACE = "urn:oasis:names:tc:SAML:1.0:assertion";
export const EFILE_NAMESPACE = "http://www.irs.gov/efile";

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

export enum MefService {
  /** Modernized System Infrastructure: plain SOAP, URLs without "mtom". */
  Msi = "msi",
  /** Transmitter services over MTOM (STP guide §1.3.2–1.3.3). */
  TransmitterMtom = "mtom",
}

export enum MefErrorClassification {
  SystemError = "SYSTEM_ERROR",
  ResourceUnavailable = "RESOURCE_UNAVAILABLE",
  MessageFormatError = "MESSAGE_FORMAT_ERROR",
  SecurityError = "SECURITY_ERROR",
  RequestError = "REQUEST_ERROR",
}

export type MefOperation = {
  readonly action: MefAction;
  readonly service: MefService;
  /** Path under the environment base URL, e.g. /mtom/GetAck. */
  readonly path: string;
  readonly soapAction: string;
  readonly requestElement: string;
  readonly responseElement: string;
};

const MSI_REQUEST_ELEMENTS: Readonly<Record<string, string>> = {
  [MefAction.Login]: "Login",
  [MefAction.Logout]: "Logout",
  [MefAction.EtinRetrieval]: "ETINRetrieval",
  [MefAction.EtinStatus]: "ETINStatus",
  [MefAction.GetStateParticipantsList]: "GetStateParticipantsList",
};

/** WSDL binding for an action: soapAction and the request/response element names. */
export function mefOperation(action: MefAction): MefOperation {
  const msi = MSI_REQUEST_ELEMENTS[action];
  if (msi !== undefined) {
    return {
      action,
      service: MefService.Msi,
      path: `/${action}`,
      soapAction: `http://www.irs.gov/a2a/mef/${action}`,
      requestElement: `${msi}Request`,
      responseElement: `${msi}Response`,
    };
  }
  return {
    action,
    service: MefService.TransmitterMtom,
    path: `/mtom/${action}`,
    soapAction: `http://www.irs.gov/a2a/mef/mtom/${action}`,
    requestElement: `${action}Request`,
    responseElement: `${action}Response`,
  };
}

export function operationNamespace(operation: MefOperation): string {
  return operation.service === MefService.Msi
    ? MSI_NAMESPACE
    : TRANSMITTER_MTOM_NAMESPACE;
}

/** The SOAP Body's request element; `content` is already-escaped child XML. */
export function requestBody(action: MefAction, content = ""): string {
  const operation = mefOperation(action);
  return `<${operation.requestElement} xmlns="${
    operationNamespace(operation)
  }">${content}</${operation.requestElement}>`;
}

function text(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

const SUBMISSION_ID = /^[0-9]{13}[a-z0-9]{7}$/;
const MESSAGE_ID = /^[0-9]{12}[a-z0-9]{8}$/;

function submissionIdList(ids: readonly string[]): string {
  if (ids.length === 0) throw new Error("MeF request needs a Submission ID");
  for (const id of ids) {
    if (!SUBMISSION_ID.test(id)) throw new Error(`Invalid Submission ID ${id}`);
  }
  return `<SubmissionIdList>${
    ids.map((id) => text("SubmissionId", id)).join("")
  }</SubmissionIdList>`;
}

function maxResultCnt(count: number): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("MaxResultCnt must be a positive integer");
  }
  return text("MaxResultCnt", String(count));
}

export const bodies = {
  login: () => requestBody(MefAction.Login),
  logout: () => requestBody(MefAction.Logout),
  etinRetrieval: (testCd: MefTestCd) =>
    requestBody(MefAction.EtinRetrieval, text("TestCd", testCd)),
  etinStatus: (etin: string) =>
    requestBody(MefAction.EtinStatus, text("ETIN", etin)),
  getStateParticipantsList: () =>
    requestBody(MefAction.GetStateParticipantsList),
  /**
   * `submissionDataList` is the exporter's SubmissionDataList element; the
   * container ZIP travels as an MTOM part named by `contentId`.
   */
  sendSubmissions: (submissionDataList: string, contentId: string) =>
    requestBody(
      MefAction.SendSubmissions,
      `${submissionDataList}<SubmissionsAttMTOM><xop:Include xmlns:xop="${XOP_NAMESPACE}" href="cid:${
        encodeURIComponent(contentId)
      }"></xop:Include></SubmissionsAttMTOM>`,
    ),
  getAck: (submissionId: string) => {
    submissionIdList([submissionId]);
    return requestBody(MefAction.GetAck, text("SubmissionId", submissionId));
  },
  getAcks: (ids: readonly string[]) =>
    requestBody(MefAction.GetAcks, submissionIdList(ids)),
  getAcksByMsgId: (messageId: string) => {
    if (!MESSAGE_ID.test(messageId)) {
      throw new Error(`Invalid MeF Message ID ${messageId}`);
    }
    return requestBody(MefAction.GetAcksByMsgID, text("MessageId", messageId));
  },
  getNewAcks: (count: number) =>
    requestBody(MefAction.GetNewAcks, maxResultCnt(count)),
  getSubmissionStatus: (submissionId: string) => {
    submissionIdList([submissionId]);
    return requestBody(
      MefAction.GetSubmissionStatus,
      text("SubmissionId", submissionId),
    );
  },
  getSubmissionsStatus: (ids: readonly string[]) =>
    requestBody(MefAction.GetSubmissionsStatus, submissionIdList(ids)),
  getNewSubmissionsStatus: (count: number) =>
    requestBody(MefAction.GetNewSubmissionsStatus, maxResultCnt(count)),
} as const;

/** The SubmissionDataList the exporter built, re-homed into the MTOM namespace. */
export function submissionDataListFrom(
  sendSubmissionsRequestXml: string,
): string {
  const list = /<SubmissionDataList>[\s\S]*<\/SubmissionDataList>/.exec(
    sendSubmissionsRequestXml,
  )?.[0];
  if (list === undefined) {
    throw new Error("MeF transmission package has no SubmissionDataList");
  }
  return list;
}

/**
 * SOAP 1.1 envelope. The declaration starts line 1, column 1 (STP guide §1.3).
 * `bodyAttributes` carries the wsu:Id a signed Login references.
 */
export function soapEnvelope(
  headerBlocks: readonly string[],
  body: string,
  bodyAttributes = "",
): string {
  return `${XML_DECLARATION}\n<SOAP-ENV:Envelope xmlns:SOAP-ENV="${SOAP_ENV_NAMESPACE}"><SOAP-ENV:Header>${
    headerBlocks.join("")
  }</SOAP-ENV:Header><SOAP-ENV:Body${bodyAttributes}>${body}</SOAP-ENV:Body></SOAP-ENV:Envelope>`;
}

export class MefFaultError extends Error {
  constructor(
    readonly action: MefAction,
    readonly faultCode: string,
    readonly faultString: string,
    readonly classification: MefErrorClassification | undefined,
    readonly errorMessageCd: string | undefined,
  ) {
    super(
      `MeF ${action} fault${classification ? ` ${classification}` : ""}${
        errorMessageCd ? ` ${errorMessageCd}` : ""
      }: ${faultString}`,
    );
  }

  get isSecurityError(): boolean {
    return this.classification === MefErrorClassification.SecurityError;
  }
}

export class MefTransportError extends Error {
  constructor(
    readonly action: MefAction,
    readonly status: number,
    detail: string,
  ) {
    super(`MeF ${action} HTTP ${status}: ${detail}`);
  }
}

export class MefProtocolError extends Error {}

export type MefResponseHeader = {
  readonly messageId: string;
  readonly relatesTo: string | undefined;
  readonly action: string | undefined;
  readonly notification: string | undefined;
};

export type MefSoapResponse = {
  readonly document: XmlDocument;
  readonly header: MefResponseHeader | undefined;
  readonly security: XmlElement | undefined;
  readonly body: XmlElement;
};

function classification(value: string | undefined) {
  return Object.values(MefErrorClassification).find((c) => c === value);
}

/** Parse a response envelope; SOAP faults become MefFaultError (STP guide §1.11.2). */
export function parseSoapResponse(
  action: MefAction,
  xml: string,
  requestMessageId: string,
): MefSoapResponse {
  const document = parseXml(xml);
  const envelope = document.root;
  const soapBody = child(envelope, SOAP_ENV_NAMESPACE, "Body");
  if (soapBody === undefined) {
    throw new MefProtocolError(`MeF ${action} response is not a SOAP envelope`);
  }
  const soapHeader = child(envelope, SOAP_ENV_NAMESPACE, "Header");
  const fault = child(soapBody, SOAP_ENV_NAMESPACE, "Fault");
  if (fault !== undefined) {
    // Fault children are unqualified; IRS examples qualify the detail's
    // children inconsistently, so they are matched by local name.
    const detail = byLocalName(
      byLocalName(fault, "detail") ?? fault,
      "ErrorExceptionDetail",
    );
    const detailText = (name: string) => {
      const found = detail === undefined
        ? undefined
        : byLocalName(detail, name);
      return found === undefined ? undefined : textContent(found).trim();
    };
    throw new MefFaultError(
      action,
      childText(fault, "", "faultcode") ?? "",
      detailText("ErrorMessageTxt") ?? childText(fault, "", "faultstring") ??
        "",
      classification(detailText("ErrorClassificationCd")),
      detailText("ErrorMessageCd"),
    );
  }
  const mefHeader = soapHeader === undefined
    ? undefined
    : child(soapHeader, MEF_HEADER_NAMESPACE, "MeFHeader");
  const header = mefHeader === undefined ? undefined : {
    messageId: childText(mefHeader, MEF_HEADER_NAMESPACE, "MessageID") ?? "",
    relatesTo: childText(mefHeader, MEF_HEADER_NAMESPACE, "RelatesTo"),
    action: childText(mefHeader, MEF_HEADER_NAMESPACE, "Action"),
    notification: (() => {
      const n = child(mefHeader, MEF_HEADER_NAMESPACE, "NotificationResponse");
      return n === undefined
        ? undefined
        : childText(n, MEF_HEADER_NAMESPACE, "NotificationDesc");
    })(),
  };
  // A response ID is the request ID plus R; plus E marks an error (STP guide §1.6.1).
  if (header !== undefined) {
    if (header.messageId.endsWith("E")) {
      throw new MefProtocolError(
        `MeF ${action} returned error message ${header.messageId}`,
      );
    }
    if (
      header.relatesTo !== undefined && header.relatesTo !== requestMessageId
    ) {
      throw new MefProtocolError(
        `MeF ${action} response relates to ${header.relatesTo}, not ${requestMessageId}`,
      );
    }
  }
  const operation = mefOperation(action);
  const body = childElements(soapBody)[0];
  if (
    body === undefined || localName(body.name) !== operation.responseElement
  ) {
    throw new MefProtocolError(
      `MeF ${action} response has no ${operation.responseElement}`,
    );
  }
  return {
    document,
    header,
    security: soapHeader === undefined
      ? undefined
      : child(soapHeader, WSSE_NAMESPACE, "Security"),
    body,
  };
}

function byLocalName(
  element: XmlElement,
  name: string,
): XmlElement | undefined {
  return childElements(element).find((c) => localName(c.name) === name);
}
