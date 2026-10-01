# Registered recommendation options

## User workflow

UDT Reload → load DOCX → review the displayed top three registered candidates → **추천 3안으로 제작**.

The displayed list fixes OPTION order. No developer proof dialog is required. Existing internal source Fidelity, content replacement, Recompose, content overset and preservation checks still run. The existing **이 디자인으로 제작** button remains independent.

When all three options pass, one generated document contains their complete page sets in order. Save INDD and export PDF through the existing controls. If only one or two candidates exist, or any option fails, the report explicitly shows the partial count and each failed stage. Successful pages remain inspectable; plugin save/PDF are blocked. The application itself can still manually save documents outside plugin control.

## Implementation boundary

- `registered-options.js`: freeze candidate descriptor/article snapshots, validate through existing binding policy, sequential independent production, continue after an individual failure, aggregate status.
- `auto-indesign.js`: calls the unchanged single registered production function for each option. Keeps a separate composite context; checks and saves never confuse it with a single-design context.
- `registered-options-host.js`: resource preflight, native Spread duplication, scoped source references, exact copied Story identity restoration, pre/post merge comparison and rollback. A plain scoped document facade avoids wrapping the Adobe DOM bridge in another Proxy.
- `studio-ui.js`, `design-registration-ui.js`, `studio.js`: separate button, fixed list, progress/status, output gating and full options diagnostics through the existing JSON save button.
- `idml-package.js`: optional hidden opening for batch staging; the single path keeps its previous visible default.

The merge uses [Adobe Spread.duplicate](https://developer.adobe.com/indesign/uxp/dom/api/s/spread/). It does not parse another DOCX or independently rewrite text/images. The first successful generated temporary document becomes the final document. Other temporary documents close without saving.

Each option retains its design/source IDs, original page IDs, physical page range, source snapshot, post-production snapshot and content-check context. Page labels contain `MagazineStudioOption`; document metadata contains `MagazineStudioOptions/v1`. These labels add no visible artwork. Source IDs need only be unique within an option. Parent objects are checked against the source context. Original automatic numbering/sections remain; physical OPTION page range is not a promise to renumber visible page-number text to 1/2/3.

## Conservative merge limits

Resource definitions must match, including styles, swatches, fonts, document preferences, Parent structures and ordered layers. Same-name/different-definition resources are blocked before copying. Automatic resource namespacing is not implemented. Different page sizes remain individually compared, but incompatible global preferences can still block a combination.

Adobe duplication loses Story labels even when frame labels, text and threading are retained. The merger groups copied frames by the produced snapshot, verifies exact thread order, physical OPTION membership and full Story text, then restores only a missing source label. An existing wrong label, split/merged Story, changed text or thread outside the option is blocked. It never guesses a new thread or writes replacement text to repair the copy.

The full produced snapshot comparison includes KEEP objects, layers/order, Parent, page side/size, geometry, text, Story/thread, image link/transform/crop and effects; the existing native checker separately verifies effective typography and source-model properties. Scope/reference ambiguity fails closed. Rollback removes only newly appended spreads, then checks previous successful options; an unsafe rollback discards this newly generated result. Partial reports cannot become output-ready.

Multi-page sets are appended in original Spread order. Multi-Spread threading that the Host does not preserve is explicitly blocked. Actual multi-page Host verification remains outstanding; Mock coverage is not Adobe evidence.

## Evidence — 2026-10-02

| Test | Result |
|---|---|
| New sample `172e0fb7adc52e31-u577b`, original engine, extracted Smoke DOCX | Actual InDesign UXP: TITLE, SUBTITLE, three independent BODY targets and IMAGE1 applied; source and postchecks errors 0 |
| Three distinct old-source designs u335e/u3d5/u577b, same Smoke DOCX | Actual InDesign UXP: 3 PASS, 3 pages, independent contexts/page ranges 1/2/3, errors 0 |
| Save combined INDD, then check | Actual Host save/recheck passed |
| Export combined PDF | Real PDF created, 3 pages parsed/rendered; each has DOCX title and image, no representative-image placeholder. Existing afterExport event was not observed in script mode, so API correctly returned `unconfirmed` |
| Real failure before Story-label restoration fix | OPTION1 retained, OPTION2/3 reported reference failures and were rolled back; no false complete result |
| Browser button/status | Mock UI: load article, three cards, separate batch button, per-option result and output state |
| Automated suite | Node 328/328; Python 18/18 |

Actual Host evidence uses COM to invoke local `.idjs` scripts calling the real existing UXP modules. It is not a DOM mock. It does not certify the user's final UDT click path, every template, arbitrary article lengths, multi-image combinations or multi-page Host merges. Source INDD/IDML/DOCX and Library were not modified.

Private test scripts/reports and generated INDD/PDF are ignored under `assets/templates/working/`; do not commit these or redistribute source content. Existing manual success histories remain unchanged.

## Minimum user confirmation

1. UDT Reload; load the intended DOCX.
2. Review the fixed OPTION list and `제작 가능 N/3`, then click **추천 3안으로 제작**.
3. Verify the one result document in page order: DOCX title/body/photos, original layout, and the per-option results.
4. Only for 3 PASS: use **INDD 저장**, then **PDF 내보내기**. If blocked, save the existing diagnostic JSON; it includes the complete options report and failure details.

Do not alter the manuscript just to hide a blocked template. Fewer than three eligible designs and content overset are explicit results. Single-design production remains available separately.
