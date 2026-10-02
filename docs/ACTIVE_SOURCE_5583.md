# Active source replacement — 2026-10-02

Only `3매거진자동화템플릿.idml` is the active extraction source.

- IDML SHA256: `5583fa2bb92b5405d28bb6ad1ee9c1a0b6c6be1c31159e73819181dc4bb5979d`
- Companion INDD SHA256: `bba54175cb1602408577890867b39b7690a4dc35e5d44e88a07fd7d63e30c47f`
- Set: `magazine-active-source`, version `5583fa2bb92b5405`.
- 31 ordinary pages / 16 spreads → 22 design page-sets. Two Parent spreads remain source dependencies.
- Fresh extraction and structural role registration; no old role or Adobe approval inheritance. Existing private libraries and the previous selection backup remain archived on disk.

## Actual Adobe evidence

`assets/templates/working/source-5583-batch-host.private.json` was produced through the existing registration UI batch handlers and native proof engine, using the selected active Library. InDesign 21.4.1.4; run.mode=proof; total=22; reports=22; cancelled=false; mockPassed=0. Finished 2026-10-02T06:07:36Z. The COM wrapper reached its timeout, but the native job continued and completed; no concurrent retry was launched.

Fidelity PASS **13**, failed **7**, unsupported skips **2**. Every state uses the new full source hash; old-source mixing **0**. There was no DOCX Production or option merge in this milestone. Script-owned proof documents were closed without saving; existing user documents were preserved.

## Classification

READY requires actual DOCX Production PASS, not proof or static capability. BLOCK takes precedence over role review when proof fails or the engine cannot safely replace content. WARN means eligible for a Production attempt, not guaranteed content fit.

| Source page-set | Image roles | Adobe proof | Current classification |
| --- | ---: | --- | --- |
| u1ba | 0 | PASS | REVIEW_REQUIRED — title/body |
| u1ce | 0 | PASS | BLOCK — title Typography; body role |
| u1cf | 0 | PASS | BLOCK — title Typography; body role |
| u8f86+u90b9 | 1 | FAIL | BLOCK — source-proof overflow; mixed BODY; multiple titles |
| ub2e9+ub2ea | 1 | PASS | REVIEW_REQUIRED — title/body |
| u335e | 1 | PASS | WARN — DOCX Production unverified |
| u3356 | 1 | PASS | WARN — DOCX Production unverified |
| u9615 | 0 | PASS | BLOCK — mixed BODY Typography |
| u9ba6 | 0 | PASS | WARN — DOCX Production unverified |
| ua829 | 0 | SKIP | BLOCK — complex Table/Story readback |
| uaa27 | 4 | PASS | WARN — DOCX Production unverified; four required images |
| u8a26+u8a27 | 0 | PASS | BLOCK — mixed title Typography; body role |
| u8b10+u8b11 | 0 | FAIL | BLOCK — source-proof overflow; mixed BODY |
| u8c39+u8d68 | 0 | FAIL | BLOCK — Gradient/u8e18 readback on u8e15; mixed title |
| u8ccf | 0 | PASS | BLOCK — mixed title; multiple subtitle candidates |
| u8e19 | 1 | PASS | WARN — DOCX Production unverified |
| u92a9 | 2 | FAIL | BLOCK — source-proof overflow; mixed title |
| u936f | 4 | PASS | REVIEW_REQUIRED — title |
| u9496+u94f4 | 1 | FAIL | BLOCK — Gradient/u8e18 readback on ua085; title review |
| u9dcd+u9dce | 0 | FAIL | BLOCK — source-proof overflow; multiple titles |
| uae8a+uae8b | 2 | FAIL | BLOCK — source-proof overflow; mixed BODY/title review |
| uafe5+uafe6 | 2 | SKIP | BLOCK — unsupported shared object ub05e |

Totals: READY **0**, WARN **5**, REVIEW_REQUIRED **3**, BLOCK **14**. Role-review flags occur on 15 designs, including BLOCK entries; do not add that overlapping count to these totals. Production-entry candidates **5**; for a one-photo manuscript, the three exact one-slot candidates are u335e/u3356/u8e19. Their complete IDs are `magazine-active-source:<page-set>@5583fa2bb92b5405`. Actual content overflow, fitting, Auto-fit and combined-document PASS remain unverified for this source.

The five overflow failures are observed before DOCX replacement. This report does not decide whether each overset originated in the source or source reconstruction. The two gradient failures are unsupported readback, not evidence requiring designer repair.

## Source boundary

The local ignored `active-design-set.private.json` points only to `source-5583fa2b.library.private.json` and contains the filename/full SHA allowlist. Source selection has no fallback to remembered or packaged legacy libraries. Descriptors record set/version, source filename/SHA, ordered pages/spreads, page-set and fingerprint. Loading, recommendation, native Production and final OPTION validation enforce this identity. Stale manual libraries are rejected, even with matching page IDs. General native UI hides legacy generated/JSON preview and creation routes; those engines remain for reference/tests.

Private source models, libraries and Host reports are intentionally not committed. Reload this local checkout to use the new selection. Other installations must extract/register their authorized source and create the explicit active selection; missing selection is an error rather than an older template fallback.

Next milestone, after user review: same actual DOCX → sequential Production on this active set → actual content/overflow/fitting/preservation results → combine only actual PASS options. Do not substitute old-source results.
