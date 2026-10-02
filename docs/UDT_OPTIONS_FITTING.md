# UDT 3-option fitting investigation — 2026-10-02

## Candidate evidence

The previous 3-PASS Host test explicitly selected old-source u335e/u3d5/u577b. It did not execute active-library recommendation. Those versions are superseded in the normal panel. It cannot establish 3/3 for the current DOCX.

Current Library: 55 preserved versions, 14 superseded, 41 active. Read-only audit with the locally available `01_안과_정기검진_매거진.docx` (19 title / 77 subtitle / 1061 BODY / one 439×349 PNG) gives 1 candidate, 30 review-required, 10 excluded. The exact DOCX from the latest user run is not yet identified; this is a reproducible local test, not an assertion that it is the user’s identical file.

Only candidate: new sample 10 / `172e0fb7adc52e31-u577b`. BLOCK counts overlap: SUBTITLE_UNSUPPORTED 23; EXTRA_IMAGES 33; PRODUCTION_UNSUPPORTED 25; DESIGN_REVIEW 30; MISSING_IMAGE 3. Recommendation and Library data were not changed. No BLOCK filling or superseded-version reactivation.

| Active design | Decision | Exact BLOCK reasons |
|---|---|---|
| original · u576c · 마커 보존 v2 | BLOCK | SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u7fad<br>PRODUCTION_UNSUPPORTED: body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 문단/문자 스타일·특수 콘텐츠 구조 확인 필요 |
| central · u1ba · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 제목 후보가 없거나 여러 개: 핵심 역할 확인<br>DESIGN_REVIEW: 본문 영역 확인 필요<br>DESIGN_REVIEW: 배치 이미지 1개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>DESIGN_REVIEW: 본문 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| central · u1ce · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 본문 영역 확인 필요<br>DESIGN_REVIEW: 본문 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원<br>PRODUCTION_UNSUPPORTED: title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.AppliedLanguage, $.FontStyle |
| central · u1cf · 마커 보존 v2 | BLOCK | EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| central · u335e · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED custom image color management<br>PRODUCTION_UNSUPPORTED: title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FillColor, $.Tracking |
| central · u3356 · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 배치 이미지 1개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED custom image color management<br>PRODUCTION_UNSUPPORTED: title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.Tracking, $.FillColor |
| central · u3d5 · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED custom image color management<br>PRODUCTION_UNSUPPORTED: title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FillColor |
| central · u3d6 · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED custom image color management<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원 |
| central · u735 · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u83ad<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원 |
| central · uad7 · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u83ad<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED custom image color management<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원 |
| central · u576c · 마커 보존 v2 | BLOCK | DESIGN_REVIEW: 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지)<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u83b9<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED custom image color management |
| central · u5764 · 마커 보존 v2 | BLOCK | EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u83b9<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원 |
| 새 샘플 · 1쪽 · u1ba | BLOCK | DESIGN_REVIEW: 제목 역할 확인 필요<br>DESIGN_REVIEW: 본문 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 2쪽 · u1ce | BLOCK | DESIGN_REVIEW: 본문 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원<br>PRODUCTION_UNSUPPORTED: title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle |
| 새 샘플 · 1쪽 · u1cf | BLOCK | DESIGN_REVIEW: 본문 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원<br>PRODUCTION_UNSUPPORTED: title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle, $.AppliedLanguage |
| 새 샘플 · 2쪽 · u335e | BLOCK | PRODUCTION_UNSUPPORTED: body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize |
| 새 샘플 · 3쪽 · u3356 | BLOCK | EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 4쪽 · u3d5 | BLOCK | PRODUCTION_UNSUPPORTED: body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 5쪽 · u3d6 | BLOCK | MISSING_IMAGE: image3 필수 사진이 없습니다.<br>MISSING_IMAGE: image2 필수 사진이 없습니다. |
| 새 샘플 · 6쪽 · u735 | BLOCK | DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u7eac<br>PRODUCTION_UNSUPPORTED: body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 7쪽 · uad7 | BLOCK | MISSING_IMAGE: image2 필수 사진이 없습니다.<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u7eac<br>PRODUCTION_UNSUPPORTED: body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 8쪽 · u576c | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| 새 샘플 · 9쪽 · u5764 | BLOCK | MISSING_IMAGE: image2 필수 사진이 없습니다.<br>MISSING_IMAGE: image3 필수 사진이 없습니다.<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| 새 샘플 · 10쪽 · u577b | WARN |  |
| 새 샘플 · 11쪽 · u577c | BLOCK | SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 12쪽 · u853e | BLOCK | EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 13쪽 · u8668 | BLOCK | SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 14쪽 · u8726 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요 |
| 새 샘플 · 15쪽 · u889b | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 16쪽 · u87d0 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 17쪽 · u8846 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 18쪽 · u8942 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 19쪽 · u89c2 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>DESIGN_REVIEW: 본문 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다. |
| 새 샘플 · 20쪽 · u8a26 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| 새 샘플 · 21쪽 · u8a27 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>DESIGN_REVIEW: 본문 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| 새 샘플 · 22쪽 · u8b10 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u8b5d<br>PRODUCTION_UNSUPPORTED: body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle |
| 새 샘플 · 23쪽 · u8b11 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u8b5d |
| 새 샘플 · 24쪽 · u8c39 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u8d69 |
| 새 샘플 · 25쪽 · u8d68 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED 페이지 귀속/공유 객체: u8d69<br>PRODUCTION_UNSUPPORTED: graphic effect readback 미지원 |
| 새 샘플 · 26쪽 · u8ccf | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>DESIGN_REVIEW: 제목 역할 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다.<br>EXTRA_IMAGES: 사진 수보다 확인된 이미지 슬롯이 적습니다.<br>PRODUCTION_UNSUPPORTED: UNSUPPORTED custom image color management |
| 새 샘플 · 27쪽 · u8e19 | BLOCK | DESIGN_REVIEW: 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요<br>SUBTITLE_UNSUPPORTED: 부제를 넣을 확정 영역이 없습니다. |

## Actual image failure

In a disposable copy of new u577b, source IMAGE frame is 276.4252 × 566.6457 pt; policy FillProportionally / center / autoFit=false. Stored top and bottom crop are each 427.7731 pt.

Old APPLY_FRAME_FITTING_OPTIONS reuses those historic distances. With 439×349 PNG (aspect 1.25788, actual PPI72), graphic height became390.4072pt and left ~88.1192pt empty at top/bottom. Scale was equal111.8645%; the BLOCK correctly detected underfill. 440×349 and441×347 also reproduce it. This is not a reason to reject differing aspect ratios.

Smoke1200×800 (aspect1.5, PPI72) became 1020.1322% scale / 8161.0578pt tall / effective7ppi. It covered the frame, so previous coverage check passed despite extreme crop. The old PASS did not establish acceptable Fill results.

Explicit Adobe FILL_PROPORTIONALLY gives 439×349 image bounds [0.141732, -218.031699, 566.787402, 494.740361], uniform162.3627% scale /44ppi, with original frame unchanged. Smoke becomes uniform70.8307% /102ppi. Reapplying the historic crop *after* this command reproduces the fault, proving why it must not be restored for new Fill content.

## Minimal fix and checks

For source Fill only: invoke the explicit Fill command, retain source alignment/mode/autoFit, record Adobe’s new crop result and enforce post-placement readback against it. All other fitting policies retain existing behavior. Frame geometry, source/proof documents, KEEP and content binding unchanged. Link, uniform-scale, full-coverage, source Fidelity and overflow gates remain. Added source/before/after bounds, scales, PPI and crop diagnostic trace.

Adobe reference: [FitOptions](https://developer.adobe.com/indesign/uxp/dom/api/f/fit-options/) explicitly distinguishes applying existing frame settings (including placement-dependent crop) from filling proportionally.

Batch status now derives from PASS count plus output readiness in both registration and production status areas. 0/3 = 실패; 1–2/3 = 미완료; 3/3 with no output errors = 완료. Partial INDD/PDF blocking unchanged.

## Verification

Node331 / Python18 (full suite). Regression includes explicit Fill vs legacy apply, crop readback preservation, rejection of changed alignment, scale distortion, underfill and later crop drift; UI0/1/2/3 summaries and output blocking.

Actual InDesign UXP test invokes the unchanged real registration UI click handlers using a lightweight DOM harness, loads all55 versions, queries actual Host fonts, freezes the normal panel recommendations and calls the same Host.createRegisteredOptions adapter. It is not a manual UDT visual click. With the local01 DOCX it selects only new u577b, applies all six content targets including the image, passes image fitting, then correctly BLOCKs five content oversets (TITLE/SUBTITLE/three BODY). UI now reports 실패0/3; no sample-only result is claimed successful.

Same UI-module/actual Host route with the original Smoke DOCX also selects only new u577b: OPTION_1 PASS, one result page, no Fidelity/content errors, outputReady=false and UI 미완료 (1/3). This proves even the former Smoke input does not yield three current recommendations.

Separate regression with the explicitly selected three old-source designs again yields3 PASS / one INDD with3 pages / errors0; save/recheck passed and PDF3 pages exported (afterExport API event remains unconfirmed). This is a merge regression only, NOT current-panel3/3 success.

The current user goal of three compatible active designs is not attained: no safety relaxation, Library edits, duplicate designs or old-version reactivation were made. Exact latest-user-DOCX identity remains pending. Reload → sameDOCX → reviewN/3 → batch: expect accurate failure/incomplete outcome if fewer than3 succeed; existing single-production remains available.
