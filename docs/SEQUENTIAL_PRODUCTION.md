# Sequential Production search — 2026-10-02

The three-option action snapshots the complete safe ranked candidate pool, not just the three visible cards. Page-set identities are deduplicated. Each candidate uses the existing single Production engine with an independent article snapshot, native placement, Recompose, actual overflow, fitting and preservation checks. A failed candidate is recorded and its owned temporary document closed; later candidates continue. After three independent successes, production stops and the existing merge engine rechecks each OPTION. A merge failure remains blocking.

Attempt IDs identify all trials; OPTION IDs identify retained successes. Reports retain candidate/attempt counts, independent Production success counts, all attempt failures and final combined inspection results. Rejected candidates are diagnostic history when three other options pass, not defects in the final document. Exhaustion with fewer than three successes reports incomplete N/3. Existing partial-result inspection remains available, but never receives outputReady approval.

Registered text capacity estimates already contribute score/WARN rather than preventing Production. Known aspect-ratio differences also contribute score/WARN; minimum-crop slot assignment and native source fitting/readback remain unchanged. Missing roles, missing required images, unsupported typography, original overset and actual inspection errors remain blocking. No article truncation or template adjustment is performed.

The native general UI hides automatic INDD/PDF buttons and guides users to InDesign's own Save/Export after inspection. Internal outputReady, latest/session ownership, registeredContexts, optionContexts, rechecks and compatibility APIs remain intact. Developer Library/batch/diagnostic JSON functions remain available.

## Automatic evidence

Node 350/350 and Python 18/18 pass. Regression coverage includes continuation after a rejected candidate, stopping after three actual successes, exhaustion, historical failure diagnostics, page-set alias deduplication, merge failure after independent successes, passing the complete ranked pool from the UI and manual-output visibility. Existing single Production and multi-page merge tests remain in the full suite. These are automated tests, not Adobe Production approval.

## Actual Adobe evidence and current limitation

Existing COM-to-UXP runner and registration UI handlers were used with InDesign 21.4.1.4. The current article is `01_안과_정기검진_매거진.docx`: TITLE 19, SUBTITLE 77, BODY 1061, one embedded 439×349 image. Latest 22 page-set entries loaded through the actual default-library path. Fresh result: `assets/templates/working/sequential-panel-host.private.json` (ignored/private).

Safe cards 0, Production attempts 0, Production PASS 0, combined document not created. Therefore native sequential Production and three-option merge have NOT passed with this article. Existing source proof PASS 13 is not Production PASS. The actual UI handlers were exercised through a DOM harness, not a physical UDT click.

Per-design BLOCK diagnostic counts overlap: role review 15, missing subtitle destination 13, unsupported Production features/typography 14, no slot for the article image 11, insufficient article images for required slots 6. None of these is a text-capacity estimate or a known ratio mismatch.

Closest source-proof-PASS one-image designs:

| Page-set | Current blocking reason |
| --- | --- |
| u335e | TITLE replacement language pattern is ambiguous: Korean and No Language in the same character class. |
| u3356 | No confirmed SUBTITLE destination. Author byline stays KEEP. Earlier actual content insertion also demonstrated BODY overflow, so giving it a destination alone does not establish PASS. |
| u8e19 | No confirmed SUBTITLE destination for the 77-character subtitle. |

Other units retain multiple-title role questions, required extra images, absent photo slots, unsupported Table/shared-object/gradient or typography structures. Existing full-source evidence also records real original overset; that is never overridden by this search. See LATEST_PRODUCTION_INPUT.md and ADOBE_HOST_RECOVERY.md for per-unit native evidence.

Next: resolve objective role/language policies or obtain designer-approved subtitle destinations/content-capable layouts. Do not drop the subtitle, invent image slots or substitute legacy designs to fabricate three successes. UDT Reload → same DOCX → recommendation now shows the safe pool instead of freezing top three; current zero-safe result remains an honest limitation until registration/engine blockers are resolved.
