/**
 * Test-only stand-in for the IRS MeF A2A services. It holds each request to
 * the WSDL 10.9 contract the way the IRS portal does: xmllint against the
 * official XSDs (when irs/wsdl/10.9 is installed), the WS-Security signature
 * against the enrolled certificate, the SAML session and JSESSIONID cookie
 * on later calls, and the container ZIP's layout. It answers with realistic
 * receipts, status records and acknowledgements (accepted or rejected).
 * Never imported by cli/main.ts.
 */
import { randomBytes, X509Certificate } from "node:crypto";
import * as fs from "node:fs/promises";
import { join } from "node:path";
import * as sys from "../../scripts/support/sys.ts";
import {
  MEF_HEADER_NAMESPACE,
  MefAction,
  WSU_NAMESPACE,
} from "../../forms/f1040/2025/mef/submissions/a2a-header.ts";
import {
  unzipEntries,
  zipEntries,
} from "../../forms/f1040/2025/mef/submissions/zip.ts";
import {
  DS_NAMESPACE,
  EFILE_NAMESPACE,
  MefErrorClassification,
  mefOperation,
  MefService,
  MSI_NAMESPACE,
  SAML_NAMESPACE,
  SOAP_ENV_NAMESPACE,
  TRANSMITTER_MTOM_NAMESPACE,
  WSSE_NAMESPACE,
  XOP_NAMESPACE,
} from "./protocol.ts";
import {
  binaryContent,
  decodeMultipart,
  encodeMtom,
  type MimePart,
  newContentId,
  parseContentType,
} from "./mtom.ts";
import { verifyEnvelopeSignature } from "./wssecurity.ts";
import {
  attributeValue,
  child,
  childElements,
  childText,
  descendants,
  localName,
  namespaceOf,
  parseXml,
  standaloneElementSource,
  textContent,
  type XmlDocument,
  type XmlElement,
} from "./xml.ts";

const ROOT = new URL("../../", import.meta.url).pathname;
export const WSDL_DIR = join(ROOT, "irs/wsdl/10.9");
export const EFILE_ATTACHMENTS_XSD = join(
  ROOT,
  "irs/mef/2025v5.4/Common/efileAttachments.xsd",
);

export type MockRejection = {
  readonly ruleNumber: string;
  readonly message: string;
  readonly xpath: string;
  readonly category: string;
  readonly severity: string;
  readonly fieldValue?: string;
};

export type MockIrsOptions = {
  readonly etin: string;
  readonly appSysId: string;
  /** The strong-authentication certificate enrolled for appSysId. */
  readonly certificate: X509Certificate;
  /** Rejections for a submission; none means it is accepted. */
  readonly decide?: (
    submissionId: string,
    submissionXml: string,
  ) => readonly MockRejection[];
  /** GetAck/GetAcks calls that answer "not yet available" before an ack exists. */
  readonly ackDelayPolls?: number;
  readonly tls?: { readonly cert: string; readonly key: string };
  readonly now?: () => Date;
};

export type MockFault = {
  readonly action: MefAction;
  readonly classification: MefErrorClassification;
  readonly message: string;
  readonly code: string;
};

export type RecordedRequest = {
  readonly action: MefAction;
  readonly contentType: string;
  readonly cookie: string | undefined;
  readonly xml: string;
  readonly fault: string | undefined;
};

type Session = {
  readonly assertionId: string;
  readonly jsession: string;
  expired: boolean;
};

type Received = {
  readonly submissionId: string;
  readonly efin: string;
  readonly receivedTs: string;
  readonly receiptId: string;
  readonly rejections: readonly MockRejection[];
  polls: number;
  retrieved: boolean;
};

class Fault extends Error {
  constructor(
    readonly classification: MefErrorClassification,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();

function token(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function schemaProblems(
  xml: string,
  xsd: string,
): Promise<string | undefined> {
  if (!(await fs.stat(xsd).then(() => true, () => false))) return undefined;
  const path = await sys.makeTempFile({ suffix: ".xml" });
  try {
    await fs.writeFile(path, xml);
    const output = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", xsd, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    return output.code === 0
      ? undefined
      : new TextDecoder().decode(output.stderr).trim();
  } finally {
    await sys.remove(path);
  }
}

function standalone(document: XmlDocument, element: XmlElement): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${
    standaloneElementSource(document, element)
  }`;
}

function soapFault(fault: Fault): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<soapenv:Envelope xmlns:soapenv="${SOAP_ENV_NAMESPACE}"><soapenv:Body><soapenv:Fault><faultcode>soapenv:Server</faultcode><faultstring>${fault.message}</faultstring><detail><wn0:ErrorExceptionDetail xmlns:wn0="${MEF_HEADER_NAMESPACE}"><wn0:ErrorMessageTxt>${fault.message}</wn0:ErrorMessageTxt><wn0:ErrorClassificationCd>${fault.classification}</wn0:ErrorClassificationCd><wn0:ErrorMessageCd>${fault.code}</wn0:ErrorMessageCd><wn0:HostNm>mock-irs</wn0:HostNm></wn0:ErrorExceptionDetail></detail></soapenv:Fault></soapenv:Body></soapenv:Envelope>`;
}

function efileDocument(root: string, children: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${root} xmlns="${EFILE_NAMESPACE}">${children}</${root}>`;
}

export class MockIrs {
  readonly requests: RecordedRequest[] = [];
  /** Container ZIPs exactly as SendSubmissions delivered them. */
  readonly containers: Uint8Array[] = [];
  /** Contract violations the mock answered with a fault. */
  readonly problems: string[] = [];
  /** Response attachments that fail efileAttachments.xsd (should stay empty). */
  readonly responseProblems: string[] = [];
  private readonly sessions = new Map<string, Session>();
  private readonly received = new Map<string, Received>();
  private readonly faults: MockFault[] = [];
  private server: ReturnType<typeof Bun.serve> | undefined;
  rejectAllSessions = false;

  constructor(readonly options: MockIrsOptions) {}

  get port(): number {
    return this.server!.port!;
  }

  /** Base URL, as config.endpoints would name it. */
  get url(): string {
    return `${
      this.options.tls ? "https" : "http"
    }://127.0.0.1:${this.port}/a2a/mef`;
  }

  start(): this {
    this.server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      ...(this.options.tls ? { tls: this.options.tls } : {}),
      fetch: (request) => this.handle(request),
    });
    return this;
  }

  stop(): void {
    this.server?.stop(true);
  }

  /** Invalidate every SAML assertion, as an IRS session timeout does. */
  expireSessions(): void {
    for (const session of this.sessions.values()) session.expired = true;
  }

  failNext(fault: MockFault): void {
    this.faults.push(fault);
  }

  logins(): number {
    return this.requests.filter((r) =>
      r.action === MefAction.Login && r.fault === undefined
    ).length;
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private async handle(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname.replace(/^\/a2a\/mef/, "");
    const action = Object.values(MefAction).find((a) =>
      mefOperation(a).path === path
    );
    if (action === undefined || request.method !== "POST") {
      return new Response("Not Found", { status: 404 });
    }
    const contentType = request.headers.get("content-type") ?? "";
    const body = new Uint8Array(await request.arrayBuffer());
    let xml = "";
    try {
      const { root, parts } = this.decode(action, contentType, body);
      xml = decoder.decode(root.bytes);
      const response = await this.respond(action, request, xml, parts);
      this.requests.push({
        action,
        contentType,
        cookie: request.headers.get("cookie") ?? undefined,
        xml,
        fault: undefined,
      });
      return response;
    } catch (error) {
      const fault = error instanceof Fault ? error : new Fault(
        MefErrorClassification.SystemError,
        String(error),
        "MEF00001",
      );
      this.problems.push(`${action}: ${fault.message}`);
      this.requests.push({
        action,
        contentType,
        cookie: request.headers.get("cookie") ?? undefined,
        xml,
        fault: fault.message,
      });
      return new Response(soapFault(fault), {
        status: 500,
        headers: { "Content-Type": "text/xml; charset=UTF-8" },
      });
    }
  }

  private decode(action: MefAction, contentType: string, body: Uint8Array) {
    const format = (message: string) =>
      new Fault(
        MefErrorClassification.MessageFormatError,
        message,
        "MSG000001",
      );
    if (mefOperation(action).service === MefService.Msi) {
      if (parseContentType(contentType).type !== "text/xml") {
        throw format(`MSI request Content-Type ${contentType} is not text/xml`);
      }
      return { root: { bytes: body } as MimePart, parts: [] as MimePart[] };
    }
    const { type, params } = parseContentType(contentType);
    if (
      type !== "multipart/related" ||
      params.get("type") !== "application/xop+xml"
    ) {
      throw format(
        `MTOM request Content-Type ${contentType} is not multipart/related application/xop+xml`,
      );
    }
    const decoded = decodeMultipart(body, contentType);
    if (
      !decoded.root.headers.get("content-type")?.startsWith(
        "application/xop+xml",
      )
    ) {
      throw format("MTOM root part is not application/xop+xml");
    }
    return decoded;
  }

  private async respond(
    action: MefAction,
    request: Request,
    xml: string,
    parts: readonly MimePart[],
  ): Promise<Response> {
    const soapAction = (request.headers.get("soapaction") ?? "").replace(
      /^"|"$/g,
      "",
    );
    if (soapAction !== mefOperation(action).soapAction) {
      throw new Fault(
        MefErrorClassification.MessageFormatError,
        `SOAPAction ${soapAction} does not match ${action}`,
        "MSG000002",
      );
    }
    if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
      throw new Fault(
        MefErrorClassification.MessageFormatError,
        "Request must begin with the XML declaration",
        "MSG000003",
      );
    }
    const document = parseXml(xml);
    const envelope = document.root;
    const header = child(envelope, SOAP_ENV_NAMESPACE, "Header");
    const soapBody = child(envelope, SOAP_ENV_NAMESPACE, "Body");
    const mefHeader = header &&
      child(header, MEF_HEADER_NAMESPACE, "MeFHeader");
    const requestElement = soapBody && childElements(soapBody)[0];
    if (!header || !soapBody || !mefHeader || !requestElement) {
      throw new Fault(
        MefErrorClassification.MessageFormatError,
        "Envelope needs a MeFHeader and a request body",
        "MSG000004",
      );
    }
    await this.validateSchemas(
      action,
      document,
      mefHeader,
      requestElement,
      parts,
    );
    const messageId = this.checkHeader(action, mefHeader);
    const session = action === MefAction.Login
      ? this.checkLogin(xml, header, mefHeader, soapBody)
      : this.checkSession(header, request.headers.get("cookie"));
    const queued = this.faults.findIndex((f) => f.action === action);
    if (queued >= 0) {
      const [fault] = this.faults.splice(queued, 1);
      throw new Fault(fault.classification, fault.message, fault.code);
    }
    return await this.operation(
      action,
      messageId,
      session,
      requestElement,
      parts,
    );
  }

  private async validateSchemas(
    action: MefAction,
    document: XmlDocument,
    mefHeader: XmlElement,
    requestElement: XmlElement,
    parts: readonly MimePart[],
  ) {
    const operation = mefOperation(action);
    const headerProblem = await schemaProblems(
      standalone(document, mefHeader),
      join(WSDL_DIR, "MeFHeader.xsd"),
    );
    let body = standalone(document, requestElement);
    // The schema types the attachment as xsd:base64Binary; validate the XOP-decoded infoset.
    for (
      const include of descendants(requestElement, XOP_NAMESPACE, "Include")
    ) {
      const holder = include.parent!;
      const base64 = Buffer.from(binaryContent(holder, parts)).toString(
        "base64",
      );
      body = body.replace(
        /<SubmissionsAttMTOM>[\s\S]*<\/SubmissionsAttMTOM>/,
        `<SubmissionsAttMTOM>${base64}</SubmissionsAttMTOM>`,
      );
    }
    const bodyProblem = await schemaProblems(
      body,
      join(
        WSDL_DIR,
        operation.service === MefService.Msi
          ? "MeFMSIServices.xsd"
          : "MeFTransmitterServiceMTOM.xsd",
      ),
    );
    const problem = headerProblem ?? bodyProblem;
    if (problem !== undefined) {
      throw new Fault(
        MefErrorClassification.MessageFormatError,
        `WSDL validation failed: ${problem}`,
        "MSG000005",
      );
    }
    const expectedNamespace = operation.service === MefService.Msi
      ? MSI_NAMESPACE
      : TRANSMITTER_MTOM_NAMESPACE;
    if (
      localName(requestElement.name) !== operation.requestElement ||
      namespaceOf(requestElement) !== expectedNamespace
    ) {
      throw new Fault(
        MefErrorClassification.MessageFormatError,
        `Body is not ${operation.requestElement}`,
        "MSG000006",
      );
    }
  }

  private checkHeader(action: MefAction, mefHeader: XmlElement): string {
    const text = (name: string) =>
      childText(mefHeader, MEF_HEADER_NAMESPACE, name);
    const messageId = text("MessageID") ?? "";
    const etin = text("ETIN");
    if (
      !/^[0-9]{12}[a-z0-9]{8}$/.test(messageId) ||
      !messageId.startsWith(etin ?? "-")
    ) {
      throw new Fault(
        MefErrorClassification.RequestError,
        `Invalid Message ID ${messageId}`,
        "REQSTI004000008",
      );
    }
    if (etin !== this.options.etin) {
      throw new Fault(
        MefErrorClassification.RequestError,
        `ETIN ${etin} is not associated with Application System ID ${this.options.appSysId}`,
        "REQSTI004000010",
      );
    }
    if (text("Action") !== action) {
      throw new Fault(
        MefErrorClassification.RequestError,
        `Action ${text("Action")} does not match ${action}`,
        "REQSTI004000011",
      );
    }
    if (text("AppSysID") !== this.options.appSysId) {
      throw new Fault(
        MefErrorClassification.SecurityError,
        "Unknown Application System ID",
        "SECURE00001",
      );
    }
    if (text("TestCd") !== "T") {
      throw new Fault(
        MefErrorClassification.RequestError,
        "The ATS environment takes only TestCd T",
        "REQSTI004000012",
      );
    }
    const expectedKey = action === MefAction.Logout ? "N" : "Y";
    if (text("SessionKeyCd") !== expectedKey) {
      throw new Fault(
        MefErrorClassification.RequestError,
        `SessionKeyCd must be ${expectedKey}`,
        "REQSTI004000013",
      );
    }
    return messageId;
  }

  private checkLogin(
    xml: string,
    header: XmlElement,
    mefHeader: XmlElement,
    soapBody: XmlElement,
  ): Session {
    const security = (message: string) =>
      new Fault(MefErrorClassification.SecurityError, message, "SECURE00002");
    if (
      child(header, WSSE_NAMESPACE, "Security") &&
      descendants(header, SAML_NAMESPACE, "Assertion").length > 0
    ) {
      throw security("Login must be signed, not carry a SAML assertion");
    }
    let verified;
    try {
      verified = verifyEnvelopeSignature(xml);
    } catch (error) {
      throw security(
        `Signature validation failed: ${(error as Error).message}`,
      );
    }
    const covered = [...verified.signed.values()];
    if (
      !covered.some((e) => e.start === mefHeader.start) ||
      !covered.some((e) => e.start === soapBody.start)
    ) {
      throw security(
        "The signature must reference the MeFHeader and the SOAP Body",
      );
    }
    if (!verified.certificate.raw.equals(this.options.certificate.raw)) {
      throw security(
        "Certificate is not enrolled for this Application System ID",
      );
    }
    const ts = Date.parse(
      childText(mefHeader, MEF_HEADER_NAMESPACE, "MessageTs") ?? "",
    );
    if (!(Math.abs(this.now().getTime() - ts) <= 9 * 60_000)) {
      throw security(
        "The Timestamp in the Request message Header is not within the allowable range of current time.",
      );
    }
    const session = {
      assertionId: `id-${token(20)}`,
      jsession: token(12),
      expired: false,
    };
    this.sessions.set(session.assertionId, session);
    return session;
  }

  private checkSession(header: XmlElement, cookie: string | null): Session {
    const security = (message: string) =>
      new Fault(MefErrorClassification.SecurityError, message, "SECURE00003");
    const block = child(header, WSSE_NAMESPACE, "Security");
    if (!block) throw security("No WS-Security header");
    if (
      child(block, DS_NAMESPACE, "Signature") ||
      child(block, WSSE_NAMESPACE, "BinarySecurityToken")
    ) {
      throw security(
        "A request with a SAML assertion must not contain a Signature or BinarySecurityToken",
      );
    }
    const assertion = child(block, SAML_NAMESPACE, "Assertion");
    const session = assertion &&
      this.sessions.get(attributeValue(assertion, "", "AssertionID") ?? "");
    if (!session || session.expired || this.rejectAllSessions) {
      throw security("SAML assertion is expired or invalid; log in again");
    }
    const username = child(block, WSSE_NAMESPACE, "UsernameToken");
    if (
      !username || childElements(username).length !== 1 ||
      childText(username, WSSE_NAMESPACE, "Username") !== this.options.appSysId
    ) {
      throw security("UsernameToken must hold only the AppSysID Username");
    }
    if (
      !(cookie ?? "").split(/;\s*/).includes(`JSESSIONID=${session.jsession}`)
    ) {
      throw security(
        "Session cookie is missing or does not match the assertion",
      );
    }
    return session;
  }

  private sessionSecurity(session: Session): string {
    const now = this.now();
    const expires = new Date(now.getTime() + 15 * 60_000);
    return `<wsse:Security xmlns:wsse="${WSSE_NAMESPACE}" xmlns:wsu="${WSU_NAMESPACE}"><wsu:Timestamp wsu:Id="id-${
      token(8)
    }"><wsu:Created>${isoSeconds(now)}</wsu:Created><wsu:Expires>${
      isoSeconds(expires)
    }</wsu:Expires></wsu:Timestamp><wsse:UsernameToken wsu:Id="id-${
      token(8)
    }"><wsse:Username>${this.options.appSysId}</wsse:Username></wsse:UsernameToken><saml:Assertion xmlns:saml="${SAML_NAMESPACE}" AssertionID="${session.assertionId}" IssueInstant="${now.toISOString()}" Issuer="http://www.forumsys.com/sentry" MajorVersion="1" MinorVersion="1"><saml:Conditions NotBefore="${now.toISOString()}" NotOnOrAfter="${expires.toISOString()}"/><saml:AttributeStatement><saml:Subject><saml:NameIdentifier Format="urn:oasis:names:tc:SAML:1.1:nameid-format:X509SubjectName">UID=${this.options.appSysId},OU=irsA2ASystem,OU=External,OU=Internal Revenue Service,OU=Department of the Treasury,O=U.S. Government,C=US</saml:NameIdentifier></saml:Subject><saml:Attribute AttributeName="SMSESSION" AttributeNamespace="http://www.forumsys.com/sentry"><saml:AttributeValue>${
      randomBytes(48).toString("base64")
    }</saml:AttributeValue></saml:Attribute></saml:AttributeStatement></saml:Assertion></wsse:Security>`;
  }

  private envelope(
    action: MefAction,
    messageId: string,
    session: Session,
    body: string,
  ): string {
    const header =
      `<ns0:MeFHeader xmlns:ns0="${MEF_HEADER_NAMESPACE}"><ns0:MessageID>${messageId}R</ns0:MessageID><ns0:RelatesTo>${messageId}</ns0:RelatesTo><ns0:Action>${action}</ns0:Action><ns0:MessageTs>${
        isoSeconds(this.now())
      }</ns0:MessageTs><ns0:ETIN>${this.options.etin}</ns0:ETIN><ns0:SessionKeyCd>${
        action === MefAction.Logout ? "N" : "Y"
      }</ns0:SessionKeyCd><ns0:TestCd>T</ns0:TestCd><ns0:AppSysID>${this.options.appSysId}</ns0:AppSysID><ns0:WSDLVersionNum>10.9</ns0:WSDLVersionNum></ns0:MeFHeader>`;
    const security = action === MefAction.Logout
      ? ""
      : this.sessionSecurity(session);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<e:Envelope xmlns:e="${SOAP_ENV_NAMESPACE}"><e:Header>${header}${security}</e:Header><e:Body>${body}</e:Body></e:Envelope>`;
  }

  private msiResponse(
    action: MefAction,
    messageId: string,
    session: Session,
    inner: string,
    cookie?: string,
  ): Response {
    const operation = mefOperation(action);
    const headers: Record<string, string> = {
      "Content-Type": "text/xml; charset=UTF-8",
    };
    if (cookie) headers["Set-Cookie"] = cookie;
    return new Response(
      this.envelope(
        action,
        messageId,
        session,
        `<wn1:${operation.responseElement} xmlns:wn1="${MSI_NAMESPACE}">${inner}</wn1:${operation.responseElement}>`,
      ),
      { status: 200, headers },
    );
  }

  private async mtomResponse(
    action: MefAction,
    messageId: string,
    session: Session,
    fields: string,
    attachmentElement: string,
    attachment: Uint8Array,
    xsdRoot: string,
  ): Promise<Response> {
    for (
      const xmlText of Object.values(unzipEntries(attachment)).map((b) =>
        decoder.decode(b)
      )
    ) {
      const problem = await schemaProblems(xmlText, EFILE_ATTACHMENTS_XSD);
      if (problem !== undefined) {
        this.responseProblems.push(`${xsdRoot}: ${problem}`);
      }
    }
    const operation = mefOperation(action);
    const contentId = newContentId(1);
    const envelope = this.envelope(
      action,
      messageId,
      session,
      `<ns10:${operation.responseElement} xmlns:ns10="${TRANSMITTER_MTOM_NAMESPACE}">${fields}<ns10:${attachmentElement}><xop:Include xmlns:xop="${XOP_NAMESPACE}" href="cid:${
        encodeURIComponent(contentId)
      }"/></ns10:${attachmentElement}></ns10:${operation.responseElement}>`,
    );
    const encoded = encodeMtom(envelope, [{ contentId, bytes: attachment }]);
    return new Response(encoded.body, {
      status: 200,
      headers: { "Content-Type": encoded.contentType },
    });
  }

  private readySubmission(id: string): Received | undefined {
    const received = this.received.get(id);
    if (received === undefined) return undefined;
    received.polls++;
    return received.polls > (this.options.ackDelayPolls ?? 0)
      ? received
      : undefined;
  }

  private acknowledgement(received: Received): string {
    const rejected = received.rejections.length > 0;
    const errors = rejected
      ? `<ValidationErrorList errorCnt="${received.rejections.length}">${
        received.rejections.map((r, i) =>
          `<ValidationErrorGrp errorId="${
            i + 1
          }"><DocumentId>RetDoc1038000001</DocumentId><XpathContentTxt>${r.xpath}</XpathContentTxt><ErrorCategoryCd>${r.category}</ErrorCategoryCd><ErrorMessageTxt>${r.message}</ErrorMessageTxt><RuleNum>${r.ruleNumber}</RuleNum><SeverityCd>${r.severity}</SeverityCd>${
            r.fieldValue === undefined
              ? ""
              : `<FieldValueTxt>${r.fieldValue}</FieldValueTxt>`
          }</ValidationErrorGrp>`
        ).join("")
      }</ValidationErrorList>`
      : "";
    return `<Acknowledgement submissionVersionNum="2025v5.4" validatingSchemaVersionNum="2025v5.4"><SubmissionId>${received.submissionId}</SubmissionId><EFIN>${received.efin}</EFIN><TaxYr>2025</TaxYr><ExtndGovernmentCd>IRS</ExtndGovernmentCd><SubmissionTyp>1040</SubmissionTyp><ExtndSubmissionCategoryCd>IND</ExtndSubmissionCategoryCd><ReceiptId>${received.receiptId}</ReceiptId><AcceptanceStatusTxt>${
      rejected ? "Rejected" : "Accepted"
    }</AcceptanceStatusTxt><ContainedAlertsInd>false</ContainedAlertsInd><StatusDt>${
      this.now().toISOString().slice(0, 10)
    }</StatusDt><TaxPeriodEndDt>2025-12-31</TaxPeriodEndDt><SubmissionValidationCompInd>true</SubmissionValidationCompInd>${errors}</Acknowledgement>`;
  }

  private ackZip(acks: readonly Received[]): Uint8Array {
    for (const ack of acks) ack.retrieved = true;
    return zipEntries({
      "acknowledgements.xml": encoder.encode(
        efileDocument(
          "AcknowledgementList",
          `<Cnt>${acks.length}</Cnt>${
            acks.map((a) => this.acknowledgement(a)).join("")
          }`,
        ),
      ),
    }, false);
  }

  private notFound(id: string): string {
    return `<ns10:SubmissionError><ns10:SubmissionId>${id}</ns10:SubmissionId><ns10:ErrorClassificationDetail><ns10:ErrorMessageTxt>MEF00006 ObjectNotFound: no acknowledgement for submission ID ${id}</ns10:ErrorMessageTxt><ns10:ErrorClassificationCd>REQUEST_ERROR</ns10:ErrorClassificationCd><ns10:ErrorMessageCd>MEF00006</ns10:ErrorMessageCd></ns10:ErrorClassificationDetail></ns10:SubmissionError>`;
  }

  private errorList(ids: readonly string[]): string {
    return `<ns10:SubmissionErrorList><ns10:Cnt>${ids.length}</ns10:Cnt>${
      ids.map((id) => this.notFound(id)).join("")
    }</ns10:SubmissionErrorList>`;
  }

  private submissionIds(element: XmlElement): string[] {
    return descendants(element, TRANSMITTER_MTOM_NAMESPACE, "SubmissionId").map(
      (e) => textContent(e).trim(),
    );
  }

  private receive(element: XmlElement, parts: readonly MimePart[]): Received[] {
    const request = (message: string) =>
      new Fault(
        MefErrorClassification.RequestError,
        message,
        "REQSTI004000020",
      );
    const attachment = child(
      element,
      TRANSMITTER_MTOM_NAMESPACE,
      "SubmissionsAttMTOM",
    );
    const include = attachment && child(attachment, XOP_NAMESPACE, "Include");
    if (!attachment || !include) {
      throw request("SendSubmissions needs one MTOM attachment");
    }
    const href = decodeURIComponent(
      (attributeValue(include, "", "href") ?? "").replace(/^cid:/, ""),
    );
    const part = parts.find((p) => p.contentId === href);
    if (
      !part || part.headers.get("content-type") !== "application/octet-stream"
    ) {
      throw request("The attachment part must be application/octet-stream");
    }
    const container = part.bytes;
    this.containers.push(container);
    const ids = this.submissionIds(
      child(element, TRANSMITTER_MTOM_NAMESPACE, "SubmissionDataList")!,
    );
    const entries = unzipEntries(container);
    const view = new DataView(
      container.buffer,
      container.byteOffset,
      container.byteLength,
    );
    for (
      let at = 0;
      at + 4 <= container.length && view.getUint32(at, true) === 0x04034b50;
    ) {
      if (view.getUint16(at + 8, true) !== 0) {
        throw request("The container ZIP must be uncompressed");
      }
      at += 30 + view.getUint16(at + 26, true) + view.getUint16(at + 28, true) +
        view.getUint32(at + 18, true);
    }
    if (
      Object.keys(entries).sort().join() !==
        ids.map((id) => `${id}.zip`).sort().join()
    ) {
      throw request(
        "The container must hold exactly one <SubmissionId>.zip per SubmissionData",
      );
    }
    const now = this.now();
    return ids.map((id) => {
      const inner = unzipEntries(entries[`${id}.zip`]);
      const manifest = inner["manifest/manifest.xml"];
      const submission = inner["xml/submission.xml"];
      if (
        !manifest || !submission ||
        !decoder.decode(manifest).includes(`<SubmissionId>${id}</SubmissionId>`)
      ) {
        throw request(
          `Submission ${id} needs manifest/manifest.xml and xml/submission.xml`,
        );
      }
      const efin =
        /<EFIN>(\d{6})<\/EFIN>/.exec(decoder.decode(manifest))?.[1] ?? "000000";
      const received: Received = {
        submissionId: id,
        efin,
        receivedTs: isoSeconds(now),
        receiptId: token(10),
        rejections: this.options.decide?.(id, decoder.decode(submission)) ?? [],
        polls: 0,
        retrieved: false,
      };
      this.received.set(id, received);
      return received;
    });
  }

  private async operation(
    action: MefAction,
    messageId: string,
    session: Session,
    element: XmlElement,
    parts: readonly MimePart[],
  ): Promise<Response> {
    switch (action) {
      case MefAction.Login:
        return this.msiResponse(
          action,
          messageId,
          session,
          "<wn1:StatusTxt>session counter updated</wn1:StatusTxt>",
          `JSESSIONID=${session.jsession}; Path=/; Secure; HttpOnly`,
        );
      case MefAction.Logout:
        this.sessions.delete(session.assertionId);
        return this.msiResponse(
          action,
          messageId,
          session,
          "<wn1:StatusTxt>Session counter decremented</wn1:StatusTxt>",
        );
      case MefAction.EtinStatus:
        return this.msiResponse(
          action,
          messageId,
          session,
          `<wn1:ETIN>${this.options.etin}</wn1:ETIN><wn1:StatusTxt>Test</wn1:StatusTxt>`,
        );
      case MefAction.SendSubmissions: {
        const received = this.receive(element, parts);
        const receipts = zipEntries({
          "receipts.xml": encoder.encode(
            efileDocument(
              "SubmissionReceiptList",
              `<Cnt>${received.length}</Cnt>${
                received.map((r) =>
                  `<SubmissionReceiptGrp><SubmissionId>${r.submissionId}</SubmissionId><SubmissionReceivedTs>${r.receivedTs}</SubmissionReceivedTs><ReceiptId>${r.receiptId}</ReceiptId></SubmissionReceiptGrp>`
                ).join("")
              }`,
            ),
          ),
        }, false);
        return await this.mtomResponse(
          action,
          messageId,
          session,
          `<ns10:DepositId>${token(20).toUpperCase()}</ns10:DepositId>`,
          "SubmissionRcptListAttMTOM",
          receipts,
          "SubmissionReceiptList",
        );
      }
      case MefAction.GetAck: {
        const [id] = this.submissionIds(element);
        const ready = this.readySubmission(id);
        if (!ready) {
          throw new Fault(
            MefErrorClassification.RequestError,
            `MEF00006 ObjectNotFound: Could not find acknowledgement for submission ID ${id} for this ETIN ${this.options.etin}`,
            "MEF00006",
          );
        }
        return await this.mtomResponse(
          action,
          messageId,
          session,
          "",
          "AcknowledgementAttMTOM",
          this.ackZip([ready]),
          "AcknowledgementList",
        );
      }
      case MefAction.GetAcks: {
        const ids = this.submissionIds(element);
        const ready = ids.map((id) => this.readySubmission(id));
        const missing = ids.filter((_, i) => ready[i] === undefined);
        return await this.mtomResponse(
          action,
          messageId,
          session,
          this.errorList(missing),
          "AcknowledgementListAttMTOM",
          this.ackZip(ready.filter((r): r is Received => r !== undefined)),
          "AcknowledgementList",
        );
      }
      case MefAction.GetNewAcks: {
        const max = Number(
          childText(element, TRANSMITTER_MTOM_NAMESPACE, "MaxResultCnt"),
        );
        const fresh = [...this.received.values()].filter((r) => !r.retrieved);
        const batch = fresh.slice(0, max);
        return await this.mtomResponse(
          action,
          messageId,
          session,
          `<ns10:MoreAvailableInd>${
            fresh.length > batch.length
          }</ns10:MoreAvailableInd>`,
          "AcknowledgementListAttMTOM",
          this.ackZip(batch),
          "AcknowledgementList",
        );
      }
      case MefAction.GetSubmissionStatus: {
        const [id] = this.submissionIds(element);
        const received = this.received.get(id);
        if (!received) {
          throw new Fault(
            MefErrorClassification.RequestError,
            `MEF00006 ObjectNotFound: no submission ${id}`,
            "MEF00006",
          );
        }
        const created = received.rejections.length > 0 ? "R" : "A";
        const status = `ACK_${created}_${
          received.retrieved ? "RETRIEVED" : "CREATED"
        }`;
        const records = zipEntries({
          "statusrecords.xml": encoder.encode(
            efileDocument(
              "StatusRecordList",
              `<Cnt>1</Cnt><StatusRecordGrp><SubmissionId>${id}</SubmissionId><SubmissionStatusTxt>${status}</SubmissionStatusTxt><SubmsnStatusAcknowledgementDt>${
                this.now().toISOString().slice(0, 10)
              }</SubmsnStatusAcknowledgementDt></StatusRecordGrp>`,
            ),
          ),
        }, false);
        return await this.mtomResponse(
          action,
          messageId,
          session,
          "",
          "StatusRecordListAttMTOM",
          records,
          "StatusRecordList",
        );
      }
      default:
        throw new Fault(
          MefErrorClassification.RequestError,
          `${action} is not implemented by the mock`,
          "MEF00005",
        );
    }
  }
}

export type TestCredentials = {
  readonly certificatePath: string;
  /** PKCS#8 key encrypted with `passphrase`, mode 0600. */
  readonly privateKeyPath: string;
  readonly passphrase: string;
  readonly certificate: X509Certificate;
  /** A second key pair the mock has not enrolled. */
  readonly strangerCertificatePath: string;
  readonly strangerKeyPath: string;
  /** TLS server certificate for the IRS A2A host names, its own CA. */
  readonly tlsCertPath: string;
  readonly tlsKeyPath: string;
};

async function openssl(args: string[], cwd: string): Promise<void> {
  const output = await new sys.Command("openssl", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (output.code !== 0) {
    throw new Error(
      `openssl ${args[0]} failed: ${new TextDecoder().decode(output.stderr)}`,
    );
  }
}

/** Throwaway self-signed certificates generated for one test run; never committed. */
export async function generateTestCredentials(
  dir: string,
): Promise<TestCredentials> {
  const passphrase = token(12);
  const subject = "/C=US/O=OpenTax Test/OU=irsA2ASystem/CN=opentax-a2a-test";
  await openssl([
    "genpkey",
    "-algorithm",
    "RSA",
    "-pkeyopt",
    "rsa_keygen_bits:2048",
    "-aes-256-cbc",
    "-pass",
    `pass:${passphrase}`,
    "-out",
    "sign-key.pem",
  ], dir);
  await openssl([
    "req",
    "-x509",
    "-key",
    "sign-key.pem",
    "-passin",
    `pass:${passphrase}`,
    "-out",
    "sign-cert.pem",
    "-days",
    "2",
    "-subj",
    subject,
  ], dir);
  await openssl([
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    "stranger-key.pem",
    "-out",
    "stranger-cert.pem",
    "-days",
    "2",
    "-subj",
    "/CN=stranger",
  ], dir);
  await openssl([
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    "tls-key.pem",
    "-out",
    "tls-cert.pem",
    "-days",
    "2",
    "-subj",
    "/CN=la.alt.www4.irs.gov",
    "-addext",
    "subjectAltName=DNS:la.alt.www4.irs.gov,DNS:la.www4.irs.gov",
  ], dir);
  for (const key of ["sign-key.pem", "stranger-key.pem", "tls-key.pem"]) {
    await fs.chmod(join(dir, key), 0o600);
  }
  return {
    certificatePath: join(dir, "sign-cert.pem"),
    privateKeyPath: join(dir, "sign-key.pem"),
    passphrase,
    certificate: new X509Certificate(
      await fs.readFile(join(dir, "sign-cert.pem")),
    ),
    strangerCertificatePath: join(dir, "stranger-cert.pem"),
    strangerKeyPath: join(dir, "stranger-key.pem"),
    tlsCertPath: join(dir, "tls-cert.pem"),
    tlsKeyPath: join(dir, "tls-key.pem"),
  };
}
