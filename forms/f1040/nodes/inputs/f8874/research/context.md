# Form 8874, New Markets Credit

The TY2025 Form 1040 implementation is a work in progress. The source for the
current-year credit is an identified qualified equity investment (QEI), not a
precomputed amount. The current input requires the community development
entity's name, EIN, and U.S. address, the initial investment and 2025 credit
allowance dates, QEI amount, designation notice reference, and affirmative
holding and qualification facts. It currently rejects passive activity and
recapture-notice cases rather than treating them as an ordinary nonpassive
credit.

For each QEI, the initial allowance date and its first two anniversaries use 5%.
The next four anniversaries use 6%. The current-year total is Form 8874 line 1
and line 3. Prior-year carryovers do not belong in this source-form total; they
use Form 3800's separate carryover path.

The input node routes a supported self-earned nonpassive credit to Form 3800.
The MeF build pass writes one IRS8874 source document and links Form 3800 Part
III line 1i and Part V to it. Form 3800's tax-liability limit determines the
Schedule 3 line 6a amount. Source, XML, and local XSD cases are written but have
not run in the deferred full batch.

Nonpassive partnership box 15 code AD and S-corporation box 13 code AD amounts
go directly from identified K-1 sources to Form 3800 Part III line 1i. A
pass-through-only filer does not get an invented IRS8874 attachment. Multiple
same-line sources need explicit Part V use amounts if the tax limit only uses
some of their combined credit. These cases are written but unrun. Estate/trust
box 13 code ZZ amounts additionally require a source statement identifying the
New Markets Credit and route directly to the same line 1i. Passive K-1 code
AD/ZZ credits require matching Form 8582-CR activity facts and are checked again
against their K-1 during MeF assembly.

Open work: self-earned passive credit; carryovers and carrybacks; recapture and
sale events; leap-day anniversary rules; cent-bearing investments and XML
rounding; filled PDF output; IRS business rules and ATS acceptance. The current
route is not filing-ready.

Sources:

- [Form 8874](https://www.irs.gov/pub/irs-pdf/f8874.pdf)
- [Form 8874 instructions](https://www.irs.gov/instructions/i8874)
- [Form 3800 instructions](https://www.irs.gov/instructions/i3800)
