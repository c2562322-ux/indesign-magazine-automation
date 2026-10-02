# Actual sequential Production — 2026-10-02

This is actual InDesign21.4.1.4 UXP Host evidence, not a Mock result. Production engines, safety policies, registration roles and active Library were unchanged. The existing registration UI articleLoaded/recommendation and `추천 3안으로 제작` handler called the existing sequential Production and merge engines. Private DOM controls invoke those same handlers; this is not an automated click test in the visible UDT panel.

## Input and provenance

- DOCX: `C:\Users\webju\Desktop\02_소아근시_매거진.docx`.
- DOCX SHA: `adaf7ffde162610185a5420f4f0961e8895ff8dc43b459c541fa8f245e4de2d0` at extraction.
- Title22 / subtitle75 / body878 characters; one440×349px embedded PNG. The old1061-character fixture was not used.
- Only `3매거진자동화템플릿.idml`, source SHA `5583fa2bb92b5405d28bb6ad1ee9c1a0b6c6be1c31159e73819181dc4bb5979d`, set `magazine-active-source`, version `5583fa2bb92b5405`.
- Five role/capability-ready entries evaluated among22 active entries. Current article yields three safe Production candidates; zero old-source entries/attempts/final options.

## Actual results

All five IDs below have the form `magazine-active-source:<page-set>@5583fa2bb92b5405` and the full source SHA above. Excluded entries were evaluated but not written to an Adobe document.

| Page-set | Slots | Recommendation / attempt | Actual result |
| --- | ---: | --- | --- |
| u335e | 1 | score31 / ATTEMPT_1 | FAIL CONTENT_APPLIED — BODY and SUBTITLE overflow |
| u3356 | 1 | score28 / ATTEMPT_2 → OPTION_1 | PASS independent Production and combined-check |
| u8e19 | 1 | score27 / ATTEMPT_3 | FAIL CONTENT_APPLIED — BODY overflow |
| u9ba6 | 0 | excluded before Production | EXTRA_IMAGES — cannot insert the DOCX image without an IMAGE role |
| uaa27 | 4 required | excluded before Production | MISSING_IMAGE — image2/image3/image4 absent |

The first execution completed2026-10-02T06:22:52Z. Its diagnostic cleanup closed the partial result; it did not change the Production result. The private harness was corrected to preserve the engine's final manifest-labelled result and use the exported geometry value reader, then the identical sequential job completed2026-10-02T06:31:45Z. Both executions returned the same1PASS/2FAIL. No engine code or safety condition was changed to obtain it.

## Auto-fit and actual readback

Values below are point size / leading in pt. Tracking remained unchanged; TITLE was not Auto-fit. Original run relationships, frame geometry and whole text were retained.

| Page-set / role | Source → final | Ratio | Source frame / Story | Characters | Story.overflows |
| --- | --- | ---: | --- | ---: | --- |
| u335e BODY | base12/20 →10.8/18; enlarged initial21/20 →18.9/18 |90% |u7c96 / u7c99 |878 |true |
| u335e SUBTITLE |15/23 →14.4/22.08 |96% |u7caf / u7cb2 |75 |true |
| u3356 BODY1 |base12/20 →11.04/18.4; enlarged initial16/20 →14.72/18.4 |92% |ub666 / ub669 |566 |false |
| u3356 BODY2 |12/20 →11.04/18.4 |92% |ub67d / ub680 |312 |false |
| u8e19 BODY |13/16 →11.7/14.4 |90% |u8ee0 / u8ee3 |878 |true |

u3356 first resolves both Stories at92%;98/96/94% still overflow. The failed bodies remain overset at90%; u335e subtitle remains overset at96%. These are content-fit failures, not source-proof overset or an observed geometry/Fidelity mismatch. No additional shrink, truncation, frame enlargement or source substitution was performed.

u3356 and u8e19 have no confirmed SUBTITLE slot: their existing optional contract records75 subtitle characters as unapplied with WARN. Their BODY/TITLE are not altered to absorb that text. u3356 PASS is under that explicit contract, not a claim that every DOCX role including subtitle is rendered.

## Images and preservation

All three attempted designs actually placed the DOCX image in the confirmed IMAGE frame. Existing source fitting/crop checks produced no blocking mismatch. Ratio and resolution warnings remain; no promise of visually identical crop or print-ready resolution is made.

| Page-set | Source IMAGE frame | Width×height (pt) | Policy/evidence |
| --- | --- | --- | --- |
| u335e |u7c78 |240.945×750.981 |source crop settings retained; ratio/low-resolution WARN |
| u3356 |ub6f8 |488.001×138.898 |source crop settings retained; ratio/low-resolution WARN |
| u8e19 |u8ec2 |240.945×756.850 |source FillProportionally; ratio/low-resolution WARN |

All attempted source proof originalErrors arrays were empty; all original/generated record comparisons were equal. Content post-inspection failures were solely the three CONTENT_OVERFLOW issues above. Non-overflow preservation/Fidelity/image issues did not block these attempts. u3356 also passed the final option-scoped geometry/Fidelity check.

## Final document

- Actual PASS **1**, ID `magazine-active-source:u3356@5583fa2bb92b5405`, one source page.
- Actual attempts **3**; all safe candidates exhausted; 3/3 **not obtained**.
- Partial combined result is one InDesign document, `무제-141` (Host id152), one visible window, one page, OPTION_1 range1–1. It is left open and unsaved. There are not three designs in it.
- Final read-only Host inspection verified exact title match, full878-character BODY match after the engine's documented LF→InDesign CR paragraph conversion, both BODY Stories and TITLE overflows=false, placed image link NORMAL, effectivePpi72×72. The raw newline representations differ; there is no missing/duplicated BODY text.
- Existing five user documents were preserved. Final document manifest and all attempt rows use only the authorized new full source SHA. Mixing **0**.
- outputReady=false and UI `추천 3안 제작 미완료 (1/3)` remain correct. A single option PASS does not imply the batch is complete or print ready.

Private evidence: `source-5583-production-article.private.json`, `source-5583-production-host.private.json`, `source-5583-result-inspect.private.json`, and their private UXP scripts under `assets/templates/working`. These contain text/paths and are excluded from Git.

Node regression367/367 passed. No engine/Library/source code changes were needed for this verification. Further3PASS work requires additional safely registered, one-photo-capable fresh-source layouts or a separate authorized design/content-fit change; do not borrow legacy sources or widen the fit limits silently.

UDT check: Reload → load the same02 DOCX → automatic registered recommendations → `추천 3안으로 제작`. Expected current result is1/3, u3356 one-page partial result, and explicit BODY/SUBTITLE failure reasons for the other two candidates.
