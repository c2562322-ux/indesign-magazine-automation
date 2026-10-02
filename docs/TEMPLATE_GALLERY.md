# Active template gallery — 2026-10-02

Default native workflow: **DOCX → original template gallery → choose one → selected design Production**. The current active source is `5583fa2bb92b5405d28bb6ad1ee9c1a0b6c6be1c31159e73819181dc4bb5979d`: 22 designs/page-sets covering 31 pages. No archived Library fallback. Recommendation/sequential/three-option tools remain available in the collapsed developer area; they do not select or replace a gallery choice.

## Selection and safety

Cards display original native JPEG previews, page-set size, image slots, BODY regions, subtitle support and photo count differences. All active designs remain visible, including structurally blocked designs. Selecting a blocked card explains its conditions and disables Production. Estimated text capacity does not grant or prevent actual Production; existing engine checks remain authoritative.

A choice captures the registered entry, article snapshot and full design/source provenance. Production calls the existing `createRegistered(..., 'production')` once. Result design ID and provenance must match the captured selection. Mismatch invalidates output; failure never invokes another design automatically. Changing the article invalidates the choice. Originals, roles, Library and Production algorithms are unchanged.

## Native previews and cache

`registered-thumbnails.js` opens the original packaged source in a temporary hidden document and exports each selected source page via native JPEG export. Page-set cards display their pages together in source order. Absolute document offsets avoid duplicate displayed page numbers. Export settings and interaction level are restored; the temporary document is closed without saving.

Local cache: `assets/templates/working/gallery-previews.private/` (ignored/private). Identity includes full source filename/SHA, set/version, fingerprint, ordered source pages, design ID, Host version and renderer/export settings. Full manifest identity and valid JPEG data are checked before persistent reuse. No DOCX-specific thumbnail is cached: these are original design previews, not production output. A missing/corrupt/outdated cache is regenerated. Normal reopening reuses the session cache; a fresh renderer uses the persistent cache without opening InDesign documents. First use may take longer and shows progress.

## Evidence and limits

Actual InDesign 21.4.1.4 executed the same gallery mount, selection-button handler and single Production handler with `02_소아근시_매거진.docx` (SHA `adaf7ffde162610185a5420f4f0961e8895ff8dc43b459c541fa8f245e4de2d0`). Native render produced 22 previews/31 page JPEGs; a new renderer read all 22 with zero source opens. The u3356 card is **디자인 07**; its original preview has a wide image above two BODY regions. Direct selection called only that design, mode=production, source=5583fa2b... .

Actual Production: title22 and BODY878 preserved (566+312, native paragraph breaks), internal image placed/link NORMAL, BODY92% (12→11.04pt, 20→18.4pt), overset0, errors0, outputReady=true, source/design identity matches. Existing image72ppi warning and optional subtitle75 omission remain visible; this design has no subtitle slot. No safety threshold was changed. Private evidence: `gallery-host.private.json`, `gallery-inspect.private.json` under working/.

Node372/372 and Python18/18 pass. Gallery tests cover all-design display, exact selection, no fallback after failure, output identity rejection and cache invalidation. Actual Host used the UI handlers with a DOM harness; visual UDT panel rendering/clicks still require user confirmation. Single selection only; multi-selection is not implemented in this prototype. Existing three-option engine remains preserved.

## Minimal UDT check

1. UDT Reload → load the same DOCX.
2. In the template gallery, visually select **디자인 07** (wide photo above two BODY columns) using **이 디자인 선택**.
3. Click **선택한 디자인으로 제작**. Confirm the new editable document has the DOCX title, full BODY and internal photo. Inspect warnings; save/export using InDesign itself.

No Library import, manual Fidelity approval or automatic recommendation is required in the default flow.

Final native-window rerun also passed: document166 (registered-1790925488603-awpd39s3dig), one page/one visible window, titleMatches=true, fullBODYMatches=true, BODY878, all content Story overflows=false, image link NORMAL. The editable unsaved result is left open. Gallery cache reused all22; source mixing0.

## Busy/gate UI correction (2026-10-02)
The legacy manual-proof button was still in general actions and its unmet registrationDisabled gate used the same message as an actual busy operation. Move that button to collapsed developer controls in gallery mode; distinguish a real Studio/registration busy lock from unmet manual-proof conditions. Thumbnail pending/finally and Production safety remain unchanged.
Actual Host rerun now includes Studio.mount, the DOCX load-button handler, thumbnail/cache, selection and Studio.production wrapper (earlier gallery harness used a simplified Studio adapter). Assertions checked busy=false after load, selection and Production. u3356 only was called, CONTENT_APPLIED/outputReady=true/errors0/BODY92%. Document167 is open/visible; full title/BODY878 and image NORMAL verified. Private gallery-busy-host/inspect reports. Node374/374, Python18/18. UDT visual confirmation still required; no claim of literal automated UDT clicks.

## Entry-derived gallery guards (2026-10-02)
Gallery enablement, selection feedback and click validation now use one Gallery.gate(selected, currentArticle), rather than a separately cached canProduce flag. Diagnose selectedEntry/galleryIdentity/sourceIdentity/articleUnchanged/productionAssessment with booleans and exact BLOCK reasons. Recompute at click; persist the current assessment in UI state and write GALLERY_GUARD to normal/developer progress logs. No role/Production/Fidelity/overflow policy change.
Actual Studio DOCX load→gallery handler comparison: 디자인12 (u8a26+u8a27) has first four guards true but productionAssessment=false: unresolved title/body, insufficient image slots, TITLE FontStyle/PointSize unsupported. Its blocked click invokes no Production. Then 디자인07 (u3356) has all guards true and alone calls single Production: outputReady=true/errors0, BODY92%, title/fullBODY878 preserved, photo NORMAL, overflow0. Visible result document168 remains open. Private gallery-guard-host/inspect reports. Node376/Python18 pass. This explains the different selected design in the user report; literal UDT clicks remain user verification.
