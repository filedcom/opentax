# MeF A2A transmission

`opentax mef` sends TY2025 Form 1040 submissions to the IRS over MeF
Application-to-Application (WSDL 10.9) and stores what comes back. It reuses
the exporter: the submission ZIP is the one `return export --type
mef-submission` builds, and the container is `buildMefTransmissionPackage`'s.
ATS is the default; nothing reaches production without three separate opt-ins.

```text
opentax mef send ── Login (signed: X.509 BinarySecurityToken, RSA-SHA256, exc-C14N)
                 │    └─ SAML Security block + JSESSIONID cookie
                 ├─ SendSubmissions (MTOM: SubmissionDataList + container ZIP part)
                 └─ Logout
```

Code: `cli/mef/` (XML and exclusive C14N, WS-Security, MTOM, SOAP messages,
session client, config) and `cli/commands/mef.ts`. The binary reaches only
`la.alt.www4.irs.gov` (ATS) and `la.www4.irs.gov` (production) for this, through
the restricted fetch in `cli/network.ts`.

## What the owner provides

| Item                              | From                                                                                    | Where it goes                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ETIN (5 digits)                   | IRS e-file application, transmitter role                                                | `etin` / `OPENTAX_MEF_ETIN`                                              |
| EFIN (6 digits)                   | IRS e-file application                                                                  | `efin` / `OPENTAX_MEF_EFIN`                                              |
| Software ID (8 digits)            | Assigned at ATS registration                                                            | `softwareId` / `OPENTAX_MEF_SOFTWARE_ID`                                 |
| Application System ID             | Automated Enrollment (Pub 4164 §4.1.2); use a separate ASID for testing                 | `appSysId` / `OPENTAX_MEF_APP_SYS_ID`                                    |
| Strong-authentication certificate | An IRS-approved CA (IdenTrust, WidePoint), uploaded to the ASID in Automated Enrollment | PEM path in `certificate` / `OPENTAX_MEF_CERT`                           |
| Its private key                   | Generated with the certificate request                                                  | Encrypted PKCS#8 PEM path in `privateKey` / `OPENTAX_MEF_KEY`, mode 0600 |
| Key passphrase                    | You                                                                                     | `OPENTAX_MEF_KEY_PASSPHRASE` only, never the file                        |

`~/.opentax/mef.json` (or the file `OPENTAX_MEF_CONFIG` names) must be mode
0600; environment variables override its keys:

```json
{
  "etin": "12345",
  "efin": "123456",
  "softwareId": "25000000",
  "appSysId": "YOURASID",
  "certificate": "/home/you/.opentax/a2a-cert.pem",
  "privateKey": "/home/you/.opentax/a2a-key.pem"
}
```

A CA that issues PKCS#12 (`.p12`/`.pfx`) converts with
`openssl pkcs12 -in a2a.p12 -clcerts -nokeys -out a2a-cert.pem` and
`openssl pkcs12 -in a2a.p12 -nocerts -nodes | openssl pkcs8 -topk8 -v2 aes-256-cbc -out a2a-key.pem`.
Optional keys: `endpoints.ats` / `endpoints.production` (must stay on the IRS
hosts), `productionEnabled` (default false), `signTimestamp` (default true).

## Commands

| Command                                           | Does                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `opentax mef login-check`                         | Login, then Logout: proves certificate, ASID and ETIN                                                                                         |
| `opentax mef send --returnId <id>`                | Builds the submission ZIP (written to `returns/<id>/submissions/`), sends it, records `returns/<id>/mef/submissions/<submissionId>.json`      |
| `opentax mef status --submissionId <id>`          | GetSubmissionStatus; updates that record                                                                                                      |
| `opentax mef acks --submissionId <id>` or `--new` | GetAck, or GetNewAcks until none remain; stores `returns/<id>/mef/acks/<submissionId>.json` and `.xml`                                        |
| `opentax mef ats-run`                             | Sends every ATS test return in the store without an accepted ack in one SendSubmissions, then polls GetAcks (`--poll-seconds`, `--max-polls`) |

Each takes `--ats` (the default) or `--production`. Production also needs
`"productionEnabled": true` and the ETIN typed back at the prompt; a return
marked `general.ats_test_submission` cannot go to production, and an unmarked
one cannot go to ATS. A return already sent is not resent unless its ack was
a rejection.

## First ATS run

1. Put the credentials in place and run `opentax mef login-check`.
2. `bun run ats:stage` writes the TY2025 ATS scenarios into `./.state/returns`
   with their attachments, retained source copies and residency reviews.
3. `opentax mef ats-run`. Rejected scenarios keep their ack under the return;
   fix and rerun, and only the rejected ones go again.
4. Acks that arrive after the polls end: `opentax mef acks --new`.

## Proof without the IRS

`cli/mef/mock-irs.ts` is a local MeF server for tests. It validates every
request against the WSDL 10.9 XSDs with xmllint (when `irs/wsdl/10.9` is
installed), verifies the Login signature against the enrolled test
certificate, requires the SAML block and cookie afterwards, checks the
container layout, and answers with receipts, status records and accepted or
rejected acks that validate against `efileAttachments.xsd`.
`cli/commands/mef-cli.test.ts` runs the real CLI through an HTTPS CONNECT proxy
to it, so the binary's network policy and TLS stay in the path.
`cli/mef/wssecurity.test.ts` checks the canonicalization and digests against
libxml2 when Python lxml is present.

## Assumptions to confirm on the first live ATS run

Each follows the cited IRS material where it exists; none could be tried
against the IRS.

1. URLs: MSI services at `<base>/Login`, `/Logout`, `/EtinStatus`;
   transmitter services at `<base>/mtom/<Operation>`, with base
   `https://la.alt.www4.irs.gov/a2a/mef` (10.9 release notes; STP guide §1.3).
2. The Login MeFHeader carries ETIN and TestCd, as the 10.9 release-notes
   example does, although the STP guide §1.6.5 and §1.6.7 call both "not
   applicable" to Login and Logout.
3. Login signs a `wsu:Timestamp` as a third reference beside the MeFHeader and
   Body (allowed by §1.4.5.2; the IRS samples sign only the two). Set
   `"signTimestamp": false` if the gateway objects.
4. The signature references the MeFHeader by `wsu:Id`, as the STP samples do,
   not by the schema's unqualified `Id`.
5. `SubmissionsAttMTOM` has no `xmime:contentType` attribute, since 10.9 types
   it `xsd:base64Binary`; the attachment part is `application/octet-stream`
   (§1.5.2).
6. Every transmitter request is MTOM multipart, even without an attachment
   (§1.3.2); MSI requests are plain `text/xml`.
7. Later calls echo Login's whole `wsse:Security` block verbatim (§1.4.3.3)
   and every `Set-Cookie` pair as `Cookie`; a UsernameToken holding only the
   ASID is added if Login's block has none.
8. A `SECURITY_ERROR` fault mid-session means the assertion expired: one new
   Login and one retry, SendSubmissions included.
9. Response elements are matched by local name; the STP samples answer MTOM
   requests in the `MeFTransmitterService.xsd` namespace.
10. Acks, receipts and status records are read from every XML file in the
    attachment ZIP and any inner ZIP (§1.5.1, §1.9.5–1.9.8);
    `SubmissionStatusTxt` values are stored as received.
11. The certificate is RSA or ECDSA with a SHA-256 signature, and the IRS
    accepts a certificate PEM without its chain.
12. `ClientSoftwareTxt` is omitted (§1.6.13: toolkit only).
13. ATS takes the transmitter's real EFIN and ETIN with TestCd `T` and the
    ATS packets' taxpayer data unchanged.
14. 30 polls a minute apart are long enough for ATS acks; otherwise
    `mef acks --new` collects the rest.

Sources: Pub 4164 (Rev. 12-2025) §2.8.4, §4.1, §6.5; MeF State and Trading
Partners Reference Guide (Pub 5830, MeF-DOC-STP_REF_GUIDE v5.0) §1.3–1.11 and
§4; MeF 10.9 Release Notes; WSDL 10.9 package (`irs/wsdl/10.9`).
