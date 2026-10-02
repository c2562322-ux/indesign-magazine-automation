# Adobe Host recovery and latest page-set validation — 2026-10-02

## Connection evidence

HEAD at start: 85dcc9e. Existing untracked sample/magazine-design.indd preserved.
InDesign PID37376 and UDT processes were already running in Windows session1.
The InDesign window contained an unsaved designer document; it was never closed,
saved or modified by these tests. COM ProgID and LocalServer32 registration point
to installed InDesign2026. No registry repair/reinstall/process termination used.

The restricted shell could not read WMI and reported no main window. Outside the
sandbox WMI/window reads worked. Running-object attachment still returned
0x800401E3 at Marshal.GetActiveObject. New-Object -ComObject succeeded immediately,
read version21.4.1.4/document/page data, and invoked actual UXP .idjs scripts.
Previous 0x80080005 is not reproduced in this outside-sandbox route; its historic
root cause is not proven. Do not call it a Production Engine failure or claim
that the running-object registry itself has been repaired.

Reuse the prior COM -> DoScript(path,1431522407) -> .idjs -> existing UXP modules
route. tools/adobe-host.ps1 uses running-object attachment with registered-server
fallback, and waits for a fresh complete JSON result. DoScript can return before
async UXP finishes. A result wait timeout is not a completed validation or a
reason to terminate Adobe/start a competing script.

Run with Windows PowerShell5.1 outside the restricted sandbox. No developer
debug endpoint, new parser, second Production Engine or Fidelity bypass added.
UDT running processes are confirmed; physical UDT panel click/load indicator was
not inspected. Actual tests reuse current registration UI handlers in a DOM
harness, with real Adobe DOM/Host/Production calls, as prior successful tests did.

Read-only connection check: `powershell.exe -NoProfile -File tools/adobe-host.ps1`.
For jobs, pass `-ScriptPath <existing .idjs> -ResultPath <its private JSON>` and
an appropriate `-TimeoutSeconds`. Default unversioned ProgID uses the installed
registered server; `-ProgId` permits an explicitly selected registered version.
Do not rerun a job simply because its wait timeout expired.

## Evidence collection and common fixes

First actual batch: proof mode, total22, reports22, NOT_RUN0, PASS7/FAIL9/skip6.
Actual batch scripts load the latest standalone Library, use current UI full
batch and export handlers, and keep source/user documents untouched. Temporary
documents are closed after evidence collection. Private reports are not committed.

- Four units reject overprintFill for actual process-white paint: RGB255/255/255,
  HSB0/0/100 or process Black at tint0. Read paint/tint strictly, identify process
  model and actual native space, and mark only the unavailable overprint field
  NOT_APPLICABLE. Spot white/colored paint/unknown getters remain strict.
- Three units report unsupported direct StrokeAlignment. Compare TextStrokeAlign
  native enum values to IDML alignment, preserving different/unknown failures.
- One Polygon bounds comparison used anchor-only model bounds. Exact cubic
  extrema return722.4772385398564, matching Adobe rather than anchor-only
  722.7106667338944. New generic curved-path comparison uses page transforms;
  no larger tolerance or source geometry change.
- Four previously unsupported units contain only explicit numeric object opacity
  (47/70/30) in their TransparencySetting/BlendingSetting nodes. Compare extracted
  Opacity to native blendingSettings.opacity; reject unknown nodes/attributes,
  invalid ranges, differing readback and other effects. This is read-only
  Fidelity support, not a visual change or wholesale effect exemption.

Safety/role/overflow/fitting/Production gates and original Library unchanged.

## Original overset before cleanup

Opened the entire original XML package as a disposable document, before page
deletion/content replacement, and recomposed with installed fonts. All used fonts
reported INSTALLED. Thirteen Stories over six units already overflow:

| Unit | Story source IDs | Frame source IDs |
|---|---|---|
| u8b10+u8b11 | u8b80 | u8b7d |
| u8f86+u90b9 | u90e0, u90fa, u9129, ua300, ua317 | u90dd, u90f7, u9126, ua2fd, ua314 |
| u92a9 | u92c5 | u92c2 |
| u9dcd+u9dce | u9e73, u9ea7, u9ed7 | u9e70, u9ea4, u9ed4 |
| uae8a+uae8b | uaef1, uaf78 | uaeed, uaf75 |
| uafe5+uafe6 | ub0d0 | ub0cd |

These require designer review of the source sample composition; do not classify
readback/enum/curve errors as designer geometry defects. Two of these units also
have unsupported fidelity constructs, so categories overlap.

## Same real DOCX Production

Read Desktop/02_소아근시_매거진.docx with the existing media extractor, materialize
only its image in ignored working artifacts: title22/subtitle75/body878, one
440x349 raster, ratio1.2607449856733524. Original DOCX unchanged.
Actual current UI recommendation returns0 cards. Direct existing Production calls
for all five role-ready units also yield no PASS:

| Unit | Actual Production block |
|---|---|
| u3356 | PRODUCTION_UNSUPPORTED: mixed BODY size |
| u9615 | EXTRA_IMAGES and PRODUCTION_UNSUPPORTED |
| u9ba6 | EXTRA_IMAGES (zero IMAGE slots) |
| uaa27 | MISSING_IMAGE three times (four IMAGE slots) |
| u92a9 | source overflow before replacement |

No three new Production PASS, merged INDD or PDF success claimed. Do not alter
the article/photo count to manufacture candidates. Next semantic decisions are
TITLE/content roles on one-photo u8e19 and u9496+u94f4 and safe BODY policy for
u3356; a one-character larger source run without a declared drop-cap rule is not
automatically approved for new content. Fourteen mixed-typography cases, Table1
and shared-object1 remain common support work with role evidence required.

One additional strict block was exposed after snapshot fixes: u9496+u94f4 Oval
ua085 uses Gradient/u8e18. The extracted colors model stores its type/name but
not gradient-stop definitions. Name equality cannot certify this visual resource;
retain BLOCK pending a source-definition/geometry-aware gradient comparison. This
is model/engine support work, not a requested designer modification.

## Local evidence

Ignored working artifacts: host-readonly-recovery.private.json,
latest-batch-host.private.json, latest-batch-fixed-host.private.json,
latest-batch-final-host.private.json, latest-effects-followup-host.private.json,
latest-batch-verified-host.private.json, latest-source-readonly.private.json,
latest-paint-probe.private.json and latest-production-host.private.json.
Scripts in the same folder reuse current modules; originals and personal content
must not be staged. Automated tests: Node341, Python18.

Official API references: https://developer.adobe.com/indesign/dom/api/s/ScriptLanguage/
and https://developer.adobe.com/indesign/uxp/dom/api/t/text-stroke-align/.

## Final actual evidence

Full batch plus targeted opacity followup: mode=proof, host=adobe, total22, reports22, NOT_RUN0; PASS13 / FAIL7 / UNSUPPORTED2. Twenty units executed in Adobe; two have explicit preflight skip reasons. This is source Fidelity, not Production Ready.

Actual failures: source overset5 units, unsupported gradient2 units. Full source baseline independently confirms overset in6 units/13 Stories (one unit remains unsupported). Role review17 units; all latest Production Ready flags false. Same actual DOCX Production PASS0.

| Page set | Actual Fidelity | Remaining constraint class |
|---|---|---|
| u1ba | PASSED | role confirmation |
| u1ce | PASSED | engine/policy; role confirmation |
| u1cf | PASSED | engine/policy; role confirmation |
| u8f86+u90b9 | FIDELITY_FAILED | engine/policy; role confirmation; source overset |
| ub2e9+ub2ea | PASSED | role confirmation |
| u335e | PASSED | engine/policy; role confirmation |
| u3356 | PASSED | engine/policy |
| u9615 | PASSED | engine/policy |
| u9ba6 | PASSED | DOCX image-slot compatibility / actual Production required |
| ua829 | UNSUPPORTED | engine/policy; role confirmation |
| uaa27 | PASSED | DOCX image-slot compatibility / actual Production required |
| u8a26+u8a27 | PASSED | engine/policy; role confirmation |
| u8b10+u8b11 | FIDELITY_FAILED | engine/policy; role confirmation; source overset |
| u8c39+u8d68 | FIDELITY_FAILED | engine/policy; role confirmation |
| u8ccf | PASSED | engine/policy; role confirmation |
| u8e19 | PASSED | role confirmation |
| u92a9 | FIDELITY_FAILED | engine/policy; source overset |
| u936f | PASSED | role confirmation |
| u9496+u94f4 | FIDELITY_FAILED | engine/policy; role confirmation |
| u9dcd+u9dce | FIDELITY_FAILED | engine/policy; role confirmation; source overset |
| uae8a+uae8b | FIDELITY_FAILED | engine/policy; role confirmation; source overset |
| uafe5+uafe6 | UNSUPPORTED | engine/policy; role confirmation; source overset |

Categories overlap: this table does not turn engine limits into designer errors. Source hash remained7e5b49257d3e3661...; DOCX hash remainedadaf7ffde1626101... . Raw findings/source baseline/Production blocks retained privately. No UDT manual retest is required merely to restore Host access.
