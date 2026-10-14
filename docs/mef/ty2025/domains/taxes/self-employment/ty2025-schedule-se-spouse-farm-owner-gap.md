# Schedule SE spouse-owned farm proprietor

The registered Schedule F route identifies a spouse proprietor on a joint
return. A sole spouse-owned farm can also produce Schedule SE tax. The previous
Schedule SE native serializer and PDF descriptor inferred spouse ownership only
from Schedule C, so they printed the taxpayer SSN/name for this farm route.

Both Schedule SE outputs now select the spouse when all active Schedule C and
Schedule F rows name the spouse, including multiple same-owner businesses and
farms. They reconcile that SSN with the joint Form 1040 source. Genuinely
mixed-owner C/F rows and unnamed joint proprietors are rejected rather than
printed under either owner's identity.

Focused evidence replays a spouse-owned Schedule F source through its line 34,
projects that amount into Schedule SE, fills the canonical TY2025 Schedule SE
AcroForm, and extracts its flattened text to verify the spouse name, SSN, and
farm profit. The native XML check verifies the same spouse SSN and farm amount.

Separate taxpayer/spouse Schedule SE copies, mixed-owner allocations, and full
return-wide wage-base allocation remain
open. The filled-page human review and IRS acceptance gates remain open.
