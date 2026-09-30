# 실제 Host JSON 기반 Fidelity readback 수정 — 2026-09-30

- 실제 magazine-fidelity.private.json 분석: 오류6 = 집계 차단1 + 객체5. u7c78 FillColor.space expected CMYK / actual undefined, 채널 [10,0,0,0] 및 bounds/crop 동일. u7c7e(TITLE), u7dba(KEEP), u7c96(BODY), u7caf(SUBTITLE)는 모두 readback supported / UNSUPPORTED direct override 비교: FontStyle. 실제 폰트 불일치 값이 아니라 readback 차단이다. 해당6건에 NOT_APPLICABLE로 바꿀 항목 없음.
- ColorSpace는 native enum의 Object.keys 열거에 의존하지 않고 명시적 CMYK/RGB/LAB/MIXEDINK 상수와 비교. 알 수 없는 공간은 차단, 채널 수로 추정하지 않음.
- plural Characters.itemByRange 대신 모든 scalar Character.item(index)를 읽는다. 중간 문자와 CR도 전부 typography/direct override/color/text 비교. 원본/생성값 비교 및 허용오차 변경 없음. 이전 Mock은 plural도 scalar 값을 반환해 Host 차이를 검출하지 못했다.
- 원인 범위: JSON은 native FontStyle의 실제 타입/값을 보존하지 못한 readback 실패 기록이다. plural 반환/enum 열거 의존을 제거했지만 이것만으로 Adobe의 전체 Fidelity 통과를 확정하지 않는다. 다음 실제 검사에서 추가로 드러나는 차이는 그대로 차단한다.
- 기존 콘텐츠 경로 유지·회귀 확인: Fidelity 재검사 → TITLE/SUBTITLE/BODY 교체 및 원본 스타일/direct override 복원 → 내부 이미지 파일 IMAGE place/원본 fitting → recompose → 콘텐츠 검사 → 기존 INDD/PDF. KEEP/geometry/색상/원본 overflow 차단 및 콘텐츠 overflow 분리 유지. Auto Fix 없음.
- 기준 시작 메인 · 사진 1장 / u335e. 개인 원본과 DOCX/진단 파일 수정·커밋 없음. Node238/Python16 통과. Adobe 콘텐츠 제작/이미지 crop/출력은 아직 미검증.
- NEXT STEP: UDT Reload → registered-smoke.docx → e2e-reference.review.json → 등록 디자인에서 추천 → 시작 메인 · 사진 1장 분석 후보로 선택 → 검증용 문서 생성. Fidelity 통과 시 원본과 육안 비교 후 원본과 비교 완료 → 선택 디자인으로 제작 → 문서 검사 → INDD 저장 → PDF 내보내기. 실패 시 진단 JSON 전달, 강제 통과 금지.

---

# Fidelity 진단 JSON 저장 완료 — 2026-09-30

- 개발 브랜치 codex/magazine-studio-1.1, 재개 HEAD dd0c7eca1892b758e3cf8370e2c074325ea2e1a1. 기존 미커밋 UI/진단/4슬롯 회귀 작업 모두 보존하여 함께 검토.
- 사용자 PC에서 검증 문서 생성·Fidelity 진입 성공, 오류6/콘텐츠 overflow0 보고. 실제 6건 원인 수정은 하지 않음. 비교 기준/허용오차/Fidelity gate/Auto Fix 정책 그대로 유지.
- `05 검사 및 출력` → 검사 결과 아래, `상세 진단 펼치기` 옆 `Fidelity 진단 JSON 저장`. 등록 검증 결과 또는 등록 Host 실패가 있으면 활성화. 새 원고/선택 변경 시 이전 진단 비활성화.
- UXP getFileForSaving으로 사용자 위치 선택, 기본명 magazine-fidelity.private.json. UTF-8 텍스트 write 완료 후 readback 문자열 완전 일치 검증. 취소/실패 시 성공 표시하지 않고 진단 재시도 가능. 클립보드 기능은 추가하지 않음.
- schema magazine-fidelity-diagnostic/v1: fidelityErrorCount, reportedErrorCount, contentOverflowCount, errors 전부, comparisons 전부(original/generated/comparison.differences), rawReport 전체, Host 예외 및 trace. 각 오류에 sourceId/objectType/page/spread/role/operation/property/Adobe message/code 포함. 집계 오류처럼 특정 객체가 없거나 Host가 제공하지 않은 정보는 null, 원문 rawIssue도 보존. 없는 expected/actual은 __diagnosticType=undefined, 비유한 숫자도 tagged object로 보존. 화면의 redaction/truncation/dedup 결과를 저장하지 않음.
- 파일은 원문/경로를 포함하는 개인 진단 자료. 저장만 수행하며 자동 전송 없음. 실제 개인 샘플/원본 INDD/IDML 미수정, Git 미포함.
- 최종 Node236/Python16 통과. 신규 JSON 회귀5: 6건/차이/특수값 완전 보존, Host 예외 보존, UI 저장/취소/재시도/무효화, UXP await write/readback, 손상/취소/Reload 차단. UXP 실제 저장 대화상자는 PC에서 확인 필요.
- NEXT STEP: Reload → DOCX → 등록 파일 → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성 → Fidelity 실패 → JSON 저장. 사용자가 저장 JSON을 전달하면 실제6건 원인을 데이터로 분석. 이번 커밋은 오류6건 해결 또는 Adobe 콘텐츠 제작 성공을 의미하지 않음.

---

# 진행 중 — Fidelity 6건 상세 데이터 대기 (2026-09-30)

- 사용자 PC 실기에서 검증 문서 생성 및 Fidelity 진입 성공 확인. 현재 Fidelity 오류6 / 콘텐츠 overflow0. open 경로 재조사하지 않음.
- 실제 6건의 객체별 differences 본문은 아직 수신되지 않았다. 사용자 추가 답변도 “아래는 상세 진단 로그입니다.”에서 끝나 데이터 없음. async 질문 대기. 원인/expected/actual 추측 금지, 제작 gate 유지.
- 미커밋 진행 내용: baseline/live 차이를 객체·속성별 expected/actual 및 보수적 오류 분류로 검사 영역에 표시; 템플릿 등록/검증 제어를 일반 추천/제작 제어와 별도 그룹으로 분리; 실제 콘텐츠 교체/이미지 place/fit/recompose 경계 진단; 콘텐츠 overflow 다른 템플릿 권장 안내.
- 실제 로컬 Smoke DOCX→기준모델 4슬롯 매핑 확인(title u7c7e/subtitle u7caf/body u7c96/image u7c78, 내부1200x800). 신규 합성 fixture의 실제 DOCX 파싱/PNG 파일화→4슬롯 교체/배치/검사 Mock 회귀 통과. Adobe 콘텐츠 제작 성공 아님.
- Node231/Python16 통과. UI 그룹에 UXP에서 지원 여부가 불명확한 HTML details를 쓰지 않고 기존 div/h3 사용. 이 변경 후 최종 전체 재실행 필요.
- NEXT STEP: 사용자 실제 differences 수신 → 원인별 source/readback/render mismatch 판정 및 필요 수정 → 전체 테스트/문서/diff → 개발 브랜치 commit/push. 아직 완료/commit/push하지 않았으며 기존 원본/개인 자료 미변경.

---

# 무채움 TextFrame snapshot 적용성 수정 — 2026-09-30

- 실제 첨부 화면 확인: registered.snapshot.read / TextFrame 2692 u7caf / Page 2537 u335e / Spread 2530 u3357 / overprintFill getter가 상태 오류 반환. open 문제 아님.
- 개인 모델 읽기 확인: u7caf는 Normal Text Frame object style에서 FillColor=Swatch/None, StrokeColor=Swatch/None, StrokeWeight=0 상속, 해당 direct override 없음. TextWrapMode=None.
- 원인: snapshot이 paint 유무와 무관하게 overprint/tint 등 모든 속성을 읽음. overprintFill은 프레임 채움색의 overprint이며 None은 채움 없음. Adobe API 문서는 의미를 정의하지만 모든 상태의 getter 예외를 열거하지 않는다. 이번 Host의 예외 발생은 첨부 실기로 확인한 사실.
- 명시적 적용성 정책: None fill → fillTint/overprintFill N/A; None stroke 또는 weight=0 → strokeTint/strokeType/overprintStroke N/A; TextFrame/EndnoteTextFrame의 graphic fitting N/A; native TextWrapModes.NONE → offset/inverse/side N/A. 조건 불명/활성 상태는 엄격하게 읽고 오류 차단. None 판정은 Host 문서 builtin swatch ID 기준(이름 fallback은 doc 미제공 호출에 한정).
- N/A는 null/false 대체값이 아니라 NOT_APPLICABLE + 이유로 snapshot에 보존하고 fidelity.notApplicable에 경로와 이유를 보고. dormant 설정 원문은 IDML에 그대로 있고 수정하지 않음. 활성화 상태 변화는 paint/mode 및 snapshot 비교에서 검출.
- fill/stroke 색상과 weight, geometry, 페이지/Story/Parent 참조, 스타일/텍스트, paths/graphics/effects 등 검증 유지. 원본과 생성본 모두 무채움일 때만 appearance tint 비교도 N/A. TextFrame.parentStory 읽기는 필수로 강화. 적용 중인 속성의 예외는 기존 상세 실패 UI로 전달.
- 회귀4 추가: 실제 None TextFrame의 여러 getter가 예외를 내도 beforeCleanup.success → cleanup.success → fidelity.start; 활성 overprint getter 오류 차단; 활성화/overprint 변경 검출; locale-independent builtin None ID 판정. 전체 Node226/Python16 통과(최종 실행 확인).
- **Adobe 수정 후 재실기 미실행.** Mock 진행 성공을 Adobe 성공이라 하지 않음. NEXT STEP: 기존 Reload/DOCX/등록 파일/추천/선택/검증용 문서 생성, fidelity.start 진입 확인.
- 원본/개인 파일 변경 없음. Auto Fix/프레임/글자/페이지 변경 정책 확장 없음.

참고: [Adobe TextFrame overprintFill](https://developer.adobe.com/indesign/uxp/omv/t/TextFrame/), [Adobe TextWrapPreference](https://developer.adobe.com/indesign/uxp/dom/api/t/text-wrap-preference/), [Adobe InDesign reference: None swatch](https://helpx.adobe.com/pdf/cs6/indesign_reference.pdf).

---

# 최종 실패 표시 — 2026-09-30

- 사용자 전사 로그의 마지막 확정 성공: `registered.pageReferences.acquire.success`. 이번 메시지에는 새 이미지 파일이 전달되지 않아 이전 이미지를 새 증거로 사용하지 않았다. 실제 최종 오류 행은 아직 확보되지 않음.
- acquire 직후 각 Page.extractLabel(KEY), ID 집합 검증, beforeCleanup snapshot 순서. 현재 정보만으로 정확한 실제 Host failure operation/객체/속성/거부 이유는 미확정. package.open은 변경하지 않음.
- Trace 오류에 registeredFailure 구조화 정보 저장: operation/object/owner/page/spread/property/attemptedValue/Adobe message/code. 중첩 snapshot wrapper가 가장 안쪽 getter 실패를 덮지 않음.
- 페이지 ID 검증, cleanup spread 취득/페이지 label, snapshot reference/객체 name 읽기 진단 보강. 원래 읽기·삭제 대상·Fidelity 판정 기준은 유지, 실패 무시 없음.
- 생성 영역 productionStatus에 줄별 최종 실패 요약을 항상 표시. 상세 Host 로그 끝 및 Studio 진단 끝에도 동일 요약 기록. 일반 제작 상태의 내부 stage 비노출 기존 회귀도 유지.
- 전체 Node222/Python16 통과. 신규3: acquire 이후 Page.extractLabel 실패, 중첩 getter/페이지·spread 정보 보존, UI 스크롤 없이 상세 실패 표시/로그 끝/출력 차단. Adobe 재실기 및 fidelity.start 진입 성공은 아직 미확정.
- NEXT STEP: Reload → 기존 Smoke DOCX/등록 파일 → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성. 실패 시 생성 영역의 실패 operation부터 Adobe code까지 요약 전체를 전달. 이 요약 확보 후 실제 거부 속성의 수정 여부 결정.

---

# Adobe open 이후 DOM 실패 추적 — 2026-09-30

- 사용자 첨부 실제 화면: 409ms nativeImport → 424ms validate → 601ms write → 605ms readback → 796ms open → 3800ms pageReferences.beforeCleanup → 현재 상태에서 이 속성을 적용할 수 없습니다.
- 두 번째 화면은 Studio ready 및 Reload/파일 불러오기 이벤트이며 실패 속성을 추가로 식별하지 않는다.
- **open은 반환했고 Document.pages 원본 수/ID 검사도 통과했다.** beforeCleanup 로그 이전에 measurementUnit=POINTS도 통과. 기존 catch가 실패한 새 문서를 닫으므로 화면에 문서가 남지 않아도 open 실패를 뜻하지 않는다.
- 이전 beforeCleanup 표시는 capture(read-only) 시작, 이후 spread.allowPageShuffle=false, Page.remove(), recompose까지 포함한다. 따라서 기존 증거만으로 정확한 객체/속성/읽기 대 쓰기를 확정할 수 없음. Adobe 메시지 표현만으로 setter 오류라 단정하지 않음.
- 수정: open.start/success와 반환 DOM identity; snapshot start/success; 실패 getter의 property/owner/page identity; cleanup의 shuffle read/set, page remove, recompose start/success; fidelity.start/completed 로그. snapshot 읽기 실패도 fatal. property assignment 전에 attemptedValue 기록.
- 이미 false인 spread.shuffle 재대입 방지(기준 모델 선택 spread u3357도 false). true를 false로 바꾸는 기존 정책, 삭제 대상 및 Fidelity 비교 기준은 변경하지 않음. 이것이 실제 사용자 오류 원인이었다는 증거는 아직 없음.
- measurementUnit 복원 오류가 최초 오류를 덮어쓰지 않게 두 오류 보존. 원본 자료/geometry/typography/content/Auto Fix 변경 없음.
- Mock은 평범한 JS 객체로 getter/setter의 Adobe 상태 오류가 없었다. 신규5개 회귀: snapshot getter, shuffle setter, redundant setter, Page.remove 실패, 단위 복원 이중 실패. 기존 open 테스트에 성공 경계 검증 추가.
- **전체 Node219/Python16 통과. Adobe 재실기 미실행, 정확한 실제 실패 속성 및 Fidelity 진입 성공은 미확정.** 진단 보강을 실기 해결 완료로 해석하지 말 것.
- NEXT STEP: Reload → 기존 Smoke DOCX/등록 파일 → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성. 새 REGISTERED_DOM_FAILED 전체와 직전 start/success를 확보. 실제 원인 속성을 보고 다음 수정 범위를 확정한다.

---

# HANDOFF — Adobe IDML open 실패 수정 (2026-09-30)

- 사용자 실기: DOCX/추천/선택 성공, 검증 문서 `app.open()`에서 지원하지 않는 형식 오류. **이전 Mock 통과는 Adobe 성공이 아니었음.**
- 확인한 결함: ElementTree sourceXml 보존은 `<?aid ...?>` processing instruction을 버렸고, 재직렬화도 복구하지 않았다. 기존 ZIP/CRC/XML tree 검사로는 발견할 수 없었다. 로컬 이전 재생성 IDML에도 aid 없음. 이것이 실제 Host 실패의 유일한 원인인지는 재실기 필요.
- 새 `src/idml-package.js`: 기존 모델에는 표준 document aid 선언을 명시적으로 복원(원래 product 버전은 만들지 않음), 신규 추출은 원래 aid 보존. DOMVersion/디자인 값 유지. 복원 이유는 fidelity.packagingNotes에 기록.
- STORE ZIP/CRC/중앙·로컬 헤더/mimetype/container/designmap/리소스·src 참조 검사 → awaited binary write → binary readback 완전 일치 → 재검사 → 기존 nativePath로 app.open. 실패 무시/빈 문서 우회 없음.
- 독립 Python 검증: 개인 기준 160항목 inventory 일치, XML159 파싱/CRC 통과, 1,658,609 bytes. 원본/개인 파일 미변경.
- **NEXT STEP:** UXP Reload → 기존 Smoke DOCX → 기존 등록 파일 → 추천 → 시작 메인 · 사진 1장 선택 → 검증용 문서 생성. 실제 새 문서가 열리는지 먼저 확인. 실패 시 상세 진단의 IDML_PACKAGE_INVALID / IDML_WRITE_MISMATCH / IDML_HOST_OPEN_FAILED 및 경로를 전달. 콘텐츠/Auto Fix/PDF 확장 없음.
- 최종 자동 테스트 결과와 근거: docs/REGISTERED_NATIVE_AUDIT.md 최상단. 실제 Adobe 재실기 미실행.

---

# HANDOFF — 등록 디자인 1건 PC 실기 준비 (2026-09-30)

- 중단된 미커밋 작업을 그대로 재개. 기준 HEAD `e7a236b97fdbfab3598e983fcc5a8c1ce2be039f`, 개발 브랜치 `codex/magazine-studio-1.1`.
- **Adobe UXP/InDesign 실기 미실행.** 코드/UI/Mock 준비이며 전체 Fidelity 인증·제작 완료판이 아니다.
- 기준: `e2e-reference.review.json`의 **시작 메인 · 사진 1장**, `u335e`(원본 표시 2쪽), 216×303 mm. TITLE `u7c7e`, SUBTITLE `u7caf`, BODY `u7c96`, IMAGE1 `u7c78`, KEEP `u7dba`.
- 원본 검증 문서 → 자동 비교 → 사용자 시각 확인 → 새 문서의 원본 재검사 → 콘텐츠 교체/recompose → 검사/INDD/PDF 연결. proof PDF는 Host/UI 차단. 원본 오류와 콘텐츠 overflow 분리, 등록 Auto Fix는 비활성 유지.
- style/direct override, fill/stroke, 페이지 삭제 전후/Story/Parent/쌓임 순서 보존 및 이미지 fitting/링크 검사 보강. 지원 불가 항목은 명시적으로 차단하며 leading fallback 없음.
- 최종 **Node206/Python15 통과**, diff 검사 통과. 개인 기준 XML158 재직렬화 대조/CRC 정상. 실제 브라우저 Mock 버튼 흐름 완료(Adobe 응답/파일 쓰기는 모의). 기본 파일 chooser 자동화는 미완료.
- 로컬 합성 `assets/templates/working/registered-smoke.docx`: 제목/부제/본문 + 내부 PNG 1200×800 1장. 기존 샘플/원본/개인 모델 미변경. 원래 미추적 `sample/magazine-design.indd` 유지.
- **NEXT STEP:** [PC Smoke](docs/REGISTERED_PC_SMOKE.md)의 버튼 순서대로 실제 Adobe에서 검증. 오류는 화면/상세 진단을 받아 수정하며 Auto Fix로 숨기지 않는다. [최신 감사/범위](docs/REGISTERED_NATIVE_AUDIT.md).
- 아래 절은 이전 시점의 기록이다. 최신 검사 수/완료 범위는 이 최상단을 따른다. 커밋/원격 SHA는 `git log -1`과 최종 보고에서 확인한다.

---

# HANDOFF — 인수 검토 및 제한적 보강 (2026-09-30)

- 인수 HEAD `e7a236b97fdbfab3598e983fcc5a8c1ce2be039f`, 브랜치 일치 확인. 여전히 WIP이며 Adobe 실기 미검증.
- 개인 로컬 모델 2종/검토용 IDML/역할 파일 존재 확인. 원본/개인 자료 수정 없음.
- 고정 Story의 선택 페이지 밖 연결 사전 거부, 교체 후 실제 원고 대조, DOCX self-closing 빈 문단 인덱스 수정. Node187/Python15 통과(Mock/오프라인).
- 이번 인수 감사와 남은 위험: [REGISTERED_NATIVE_AUDIT](docs/REGISTERED_NATIVE_AUDIT.md).
- **NEXT STEP:** 스타일 override/빈 문단 run 보존, 페이지 삭제 전후 및 그래픽 Fidelity 범위 보강 → >2장 DOCX/UI 전환·등록 출력 통합 검증 → 사용자 역할 확인 후 Adobe 원본 재현 실기. 아래 이전 NEXT STEP도 계속 유효하다.

# HANDOFF — 중간 작업 보존 (2026-09-30)

> **WIP / 미완성. 사용자 요청으로 개발 중단. 새 계정에서는 이 절을 먼저 읽으세요.**
> 이전 아래 절은 역사적 기록입니다. 이번 작업을 Adobe 실기 성공 또는 제작 완료로 해석하지 마세요.

## A–C. 목적 / 기준 / 시작 상태
- 제품 목적: DOCX 글·이미지와 기존 디자이너 디자인을 구조적으로 비교 → 사용자 선택 → 원본 디자인 유지·콘텐츠 교체 → 검사 → INDD/PDF. AI API 불필요.
- 브랜치 `codex/magazine-studio-1.1`; 시작 HEAD `47e0822088813ca5d282abe954fe78a40d5e4b04`.
- 시작 main 및 중단 전 main: `ce20690bd6d32facfd4f5658dfd2ac696473a762`. main 변경 금지.
- 시작: v2 모델/역할 확인/등록/추천/overlay/단일 프레임 proof, Node173/Python15. 전체 등록 디자인 제작 미연결.
- 시작부터 있던 미추적 사용자 파일: `sample/magazine-design.indd`. 그대로 보존, stage 금지.
- 이번 보존 커밋은 본 문서를 포함하는 `WIP: preserve DOCX-to-design production work for handoff`; 정확한 SHA는 `git log -1`로 확인. SHA 자기참조를 위해 추가 커밋하지 않음.

## D–F. 구현 상태 (완료 = 코드/자동 검증 범위, Adobe 성공 아님)
| 항목 | 상태 | 실제 범위 |
|---|---|---|
| DOCX relationship·등장 순서·중복 제거·PNG/JPEG 크기/비율 | 완료(제한된 형식) | 신규 11개 테스트 중 관련 테스트 통과. VML/외부/장식은 경고/제외 |
| 글+이미지 Article Profile | 완료(코드) | 기존 텍스트 분석 + 이미지 순서/문단위치/픽셀 크기. 네이티브 파일 추출 실기 필요 |
| 여러 기존 디자인 비교/최대3 추천/사용자 선택 | 기존 완료 + 일부 수정 | API 없이 기존 코어 사용. 낮은 추정 ppi 경고 추가, 라이브러리 import 병합 |
| Role UX | 부분 완료 | 핵심 6개 슬롯 선택, 나머지 기본 keep, 상세 기존 화면 유지. 브라우저 직접 재검증 미완료 |
| 추천 → 실제 제작 | 부분 완료 | 새 UI→Studio→native adapter→임시 IDML open→검사 연결. Adobe 미검증 |
| 원본 Fidelity | 부분 완료 | 실제 원본 XML158개 재직렬화 대조 차이0(내부 라벨 제외), CRC 정상. Host typography/geometry readback 코드+Mock. 전체 그래픽 fidelity 보장 아님 |
| TITLE/SUBTITLE/BODY 콘텐츠 교체 | 부분 완료 | 동일 effective run 스타일만 허용. 혼합 스타일/선택 밖 story 연결은 거부 |
| IMAGE 슬롯 교체 | 부분 완료 | 확정 슬롯만 place, 원본 fitting 옵션 요청. 실제 사진/고정 장식 보존 실기와 세부 회귀 테스트 부족 |
| 검사·INDD·PDF 연결 | 부분 완료 | 기존 latest/check/save/export 경로 재사용. Fidelity 실패/overflow 차단 코드. 실제 저장/PDF 미검증 |
| Adobe 실제 E2E·시각 Fidelity | 아직 시작하지 않음 | 실제 Adobe 접근 불가. 이번 브라우저 열기 도구도 사용자가 중단 |
| 등록 디자인 Auto Fix / 혼합 run 재분배 | 아직 시작하지 않음 | 보수적으로 등록 디자인 autoFixAllowed=false; 기존 v1 Auto Fix 유지 |

## G–H. 현재 코드 구조 / DOCX
- **신규** `src/docx-media.js`: document.xml + document.xml.rels의 DrawingML embed 추적. media 전체 스캔 안 함. 실제 등장 중복은 occurrences로 보존하고 같은 파일은 하나의 사진으로 처리. 명시적 decorative/behindDoc 제외. 32장/32MB 제한. PNG/JPEG만 지원, EXIF는 dimensions unknown 가능. conventional w/a/r/wp namespace prefix 중심이라는 한계.
- `studio.js`: UXP data folder에 추출 이미지 저장; path/handle을 Article에 연결. Reload guard. 실제 파일 권한/쓰기/배치는 미검증.
- `preview.js`, `preview.html`, `src/image-dimensions.js`: 브라우저 DOCX 이미지 Blob preview와 UMD 연결. 직접 브라우저 검증은 미완료.
- `src/layout-engine.js`: 기존 무료 시안 2장 제한 유지, DOCX 이미지 metadata 보존 필드 추가.
- `src/studio-ui.js`: 등록 원고는 2장 초과 분석 가능; free prepare 제한. registeredEntry/documentKey, 공통 production wrapper 연결. 이미지 3장 이상 시 이전 preview 잔존 여부 등 실제 UI 후속 점검 필요.

## I–K. Design Library / 원본 / 역할
- 두 기존 실제 source model 유지: 기존 일반14쪽 + 센트럴 일반11쪽 = 25개 페이지 분석 대상. **25개 모두 제작승인된 디자인이라는 뜻 아님.** UI 저장 등록 수는 사용자가 불러온 라이브러리에 따라 다름. 원본을 번들에 커밋하지 않음.
- `src/design-registration.js`: 미지정은 기본 KEEP_AS_IS. 명시적 역할 외 TITLE/BODY를 임의 확정하지 않음.
- `src/design-registration-ui.js`: 핵심 슬롯 title/subtitle/body/image1/image2/caption, 상세 프레임 접기. import는 기존 entry를 유지하며 ID별 병합. 추천 선택에 entry/article 연결, 제작 버튼 추가.
- 참고 분석용 로컬 등록 파일: `assets/templates/working/e2e-reference.review.json` (이번 생성, ignored). 기존 원본 page u335e: title u7c7e / subtitle u7caf / body u7c96 / image1 u7c78. 원문의 명확한 placeholder를 보고 만든 **개발자 검토용 매핑**이며 디자이너 승인/Adobe 검증 아님.
- 같은 페이지의 대표이미지 텍스트 u7dba 등 비역할 객체는 그대로 유지. 다른 샘플/페이지 삭제 안 함.

## L–P. Fidelity / 추천 / 제작 / 출력
- **신규** `src/package-xml.js`: raw XML tree→namespace XML→stored ZIP, CRC. XML attribute tab/newline numeric escape 수정(실제 원본 대조로 발견). 데이터 좌표 재계산/복제 없음.
- **신규, 미완성** `src/registered-native.js`: sourceXml 복제→Page/PageItem에 별도 private key label→임시 IDML→InDesign native importer. 원본을 열거나 수정하지 않음. 임시 복원 문서에서 선택 밖 페이지 제거(원본 아님). source binary 누락은 거부.
- STEP A: 원본 XML import 후 geometry/run typography/frame columns/gutter/inset + 기존 검사. 실패하면 콘텐츠 교체 없이 Fidelity 오류와 Auto Fix 금지.
- STEP B: 동일 스타일 story만 교체, font/size/leading/tracking 등 native 값을 재적용, 슬롯 이미지만 place/기존 fitting 요청, recompose→content 검사.
- `src/auto-indesign.js`: registeredContexts WeakMap, createRegistered, 기존 검사에 fidelity/content issues 추가, 기존 save 반환 문서의 frame rebind. latest/state/session 보호 재사용.
- `src/design-matching.js`: pixel aliases/순서/문단 위치와 낮은 추정ppi soft 경고. 정확한 인쇄 품질 보장 아님.
- 일반 생성 경로의 leading fallback은 이번 작업에서 변경하지 않음. 등록 경로는 source XML/native style 상속을 사용하지만 Host 모든 상속/override 보존은 미검증.
- static library productionReady는 여전히 false. 런타임 통과만으로 디자인 전체 영구 승인하지 않음. PDF 기존 재검사/차단 유지.

## Q–R. 검증 결과와 미검증
- 중단 후 재실행: **Node184/184 (기존173 + 신규11), 실패0, skip0; Python15/15, 실패0**. `git diff --check` 통과(LF→CRLF 안내만 있음).
- `package.json`의 npm test 목록에 신규 `tests/registered-production.test.js` 포함. 이 PC에서 npm 대신 동일 `node --test` 명령 실행.
- 신규 테스트: DOCX 순서/중복/장식/경로 거부/치수/profile, ZIP CRC/XML, 원본 실패→콘텐츠 미교체, geometry mismatch, content overflow 구분, stale open cleanup. **모든 요구 시나리오를 완성한 테스트 세트 아님.**
- 실제 기존 IDML과 로컬 e2e-reference.idml의 XML158개 비교 차이0(추가 식별 라벨/빈 wrapper 정규화 제외; container 제외). 패키지 CRC 오류 없음. 전체 네이티브 importer 검증은 아님.
- 이번 브라우저 실행 도구는 사용자 중단으로 완료 못함. 실제 버튼 조작 확인 안 함. 테스트용 http.server 세션은 중단 시 Ctrl+C로 종료.
- 아직 Adobe에서 app.open/페이지삭제/label 보존/폰트/style 범위/그룹·Parent·z-order/고정 이미지/저장·PDF/Reload 확인 안 함.

## S. NEXT STEP — 새 계정이 가장 먼저 할 일
1. 브랜치/HEAD/status 확인 후 이 문서와 diff를 읽기. **WIP이므로 사용자에게 완료판이라고 안내하지 말기.** 개인 샘플은 새 clone에 없으므로 별도 안전하게 전달받기.
2. `src/registered-native.js` 우선 코드 감사: import 후 선택 페이지 축소가 spread/Parent/공유 객체/thread에 미치는 영향, readback에서 누락된 fill/stroke/layer/z-order/graphics, uniform 스타일 교체 시 keep/rule/기타 override 보존. 혼합 스타일 거부 정책 유지.
3. `src/package-xml.js`/packagePlan 실제 XML fixture 회귀 추가: container 중복 방지·속성 tab/newline(현재 로컬 대조만으로 확인). private 모델을 테스트에 커밋하지 말기.
4. `src/docx-media.js` namespace/빈 문단 subtitle index/EXIF/중복의미/실제 DOCX fixtures 보강. UXP 파일 쓰기/이미지 place 확인.
5. `src/studio-ui.js`/registration UI 직접 실행: >2장 입력, free↔JSON↔registered 선택·stale document·Reload·실패 재시도. 등록 create→기존 check/save/PDF Mock통합 테스트 보강.
6. 기준 페이지를 **사용자가 역할 확인**한 뒤 Adobe에서 source fidelity 먼저 확인. 원본 단계 overflow/mismatch면 콘텐츠/Auto Fix로 숨기지 말기. content replacement 이후 별도 검사.
7. 위 점검 후에만 완성 개발을 이어가기. 이번 커밋은 중간 보존이며 개발 확대 승인으로 해석하지 말기.

## T–U. 보호 / 제외 / 파일 보존
- main/reset/clean/force push 금지. 기존 시작페이지/Inspector/목차/무료·JSON·AI/폰트/Reload/Auto Fix 회귀 금지. 테스트 완화 금지.
- 원본 INDD/IDML, 개인 Word/이미지/추출 XML 모델, API키, cache는 수정/커밋하지 않음.
- 이번 신규 개인 파생물(모두 ignored·로컬 보존): `assets/templates/working/e2e-reference.review.json`, `assets/templates/working/e2e-reference.idml`. GitHub에 없으므로 다른 PC/계정은 별도 파일 전달 필요.
- 기존 개인 모델 `original-model-final.json`, `central-model-final.json` 및 working 내 분석/원본 복사본은 그대로 보존.
- staged 파일은 시작 시 없음. 보존 대상은 코드15개 + HANDOFF/WORKLOG; sample/magazine-design.indd는 미추적 그대로 남김.

---

# HANDOFF — 1.1.0

## 최신 상태 — 등록 디자인 역할 확인/추천 검증판

- 기준 90bc2a5. 역할 후보/확인 UI, 페이지별 등록·파일 저장/재개, API 없는 후보 최대3 및 근거, 분석용 선택/content overlay 연결.
- Object Style BasedOn의 frame preference 상속 누락 보완, AutoLeading 미해결 시 proof 거부. PNG/일부 JPEG 치수 조회(32MB 제한, EXIF unknown).
- 별도 원본 단일 프레임 Host proof 버튼과 readback 연결. 전체 v2 renderer/콘텐츠 교체/기존 INDD/PDF 연결은 아직 미완료. 모든 등록 디자인 productionReady=false.
- 브라우저에서 실제 신규 모델 로드→페이지 역할→유지 등록→확인 필요 추천 표시, Reload 후 무료3안 실행. Adobe Host 미검증.
- 두 실제 IDML XML 대조와 25페이지 미승인 역할 gate 확인. Node173/Python15 통과. 원본/개인 모델 미커밋.
- 다음: 디자이너 역할 확인→전체 지면 Host fidelity→콘텐츠 run 교체→기존 production 연결. 자세한 한계/PC 절차: docs/DESIGN_REGISTRATION.md.


## 최신 상태 — Design Capability / Matching 코어

- 기준 660266c에서 계속 작업. src/design-matching.js, tools/analyze-design.js, tools/match-designs.js 추가.
- 기존 v2를 유지하고 fitting/transparency/clipping의 optional details 보존을 보강했다. 기존 실제 IDML의 geometry/type/style/thread 회귀 비교 차이 0.
- 사용자가 제공한 실제 2센트럴-눈길.idml 분석 완료: 일반11/Parent2쪽, 280객체, 14배치 이미지. INDD 파싱/변경 없음. 기본 style 축약참조, GraphicBounds attributes, variable font nested list 해석 보강.
- 기존 실제 디자인+Word 실행: 제목19/부제38/본문453자·7문단, 기존14+신규11=25개 페이지 분석 항목 모두 역할/폰트 확인 필요. 임의 추천하지 않음.
- Library sidecar는 원본 hash/page 범위/확정 역할/사진 정책 필요. 객체별 수용량은 low-confidence 범위다. Fonts/image dimensions 미확인은 review 상태.
- Original+content overlay+runtime adjustment 분리. productionReady=false. 전체 v2 renderer가 없으므로 기존 생성기에 연결하지 않았고 기존 Studio 제작·Auto Fix·PDF 코드는 변경 없음.
- 전체 Node160 통과(이전143+추가17), Python15 검사도 통과. 두 실제 IDML의 XML 대조 및 profile 검증 통과. Adobe 실기 검증은 아직 안 됨.
- 다음: 두 샘플 role 확인 → 조판으로 capacity 보정 → 기존 제작 adapter v2 지원/UI.
- 문서: docs/DESIGN_MATCHING.md. 개인 모델/결과/샘플 INDD는 Git 제외.

## 최신 인수인계 — 2026-09-30 Design Model Phase 1

- 기준 `630e5e557bfae1c7e8de622012241829d05c7878`의 Studio/Auto Fix 제작 경로를 변경하지 않고 별도 v2 추출/검증 코어를 추가했다.
- `tools/extract_design.py`: IDML ZIP/XML 파싱, sourceXml 보존, geometry/style/story/font/색/참조 추출. INDD 직접 파싱 없음.
- `src/design-model.js`, `src/design-model-host.js`: v2 검증, runtime 분리, 명시적 단일 텍스트 프레임 proof와 Host readback 비교. 전체 지면 importer/생성기가 아니다. 패널 연동은 아직 없음.
- 기존 Node 132개 + 신규 11개 = 143개 통과. 신규 진입점 하나에서 Python 12개 검사도 통과. Mock은 실제 Adobe 검증이 아니다.
- 실제 IDML(일반 14쪽, Parent 2쪽, 객체 217개)을 오프라인 추출하고 text proof를 브라우저에서 표시했다. INDD→새 InDesign 시각 round-trip은 미검증.
- 사용자 `sample/magazine-design.indd`는 원래 untracked 상태 유지. 제공 INDD/IDML/폰트/추출 원문은 stage하지 않는다. 로컬 결과는 ignored `assets/templates/working/`에 있다.
- 다음: DESIGN_FIDELITY의 PC proof 실기 → style/graphics/group/Parent/thread renderer 범위 확장 → role mapping/importer UI.
- 상세: [모델](docs/DESIGN_MODEL.md), [실행](docs/DESIGN_EXTRACTION.md), [fidelity](docs/DESIGN_FIDELITY.md).

아래 기존 상태/테스트 수는 해당 개발 시점의 이력이다. 최신 결과는 위 기준을 따른다.

갱신: 2026-09-29. 사용자 요청: **안정화 유지 + 제공 JSON 디자인 3종 연결.** 개발 브랜치: `codex/magazine-studio-1.1`.

## 현재 상태

- 기존 OPENING_PAGE 모드의 생성 로직(`src/text.js`, `src/image.js`)을 유지하고 새 디자인 모드를 분리했다.
- 새 모드는 새 문서·새 프레임을 생성한다. 기존 문서에는 쓰지 않는다. 이는 사용자가 명시적으로 요청한 새 범위이며 D026에 기록했다.
- 무료 배치 3안 / 선택형 AI 첫 페이지 설계 / 이어지는 본문 페이지 / 원고 저장 / INDD 저장 / 검사 / PDF 코드 구현.
- Word의 탭/수동 줄바꿈 처리와 중복 마커 검사를 보강했다.
- Node 자동 테스트 **115개 통과**(기존 안정화 90 + JSON 회귀 25). Host/DOM/파일 선택은 모의 객체이며 실제 Adobe 실행 검증이 아니다.
- 사용자 PC 1차 실기 확인: 패널 표시, 원고 입력, 무료 3안, 미리보기 글자 크기, 패널 스크롤 정상. InDesign/UDT 정확한 버전은 아직 미기록.
- 이후 사용자 PC에서 새 문서 생성·PDF 내보내기 성공 보고. PDF 사각형 선/미리보기 차이 관찰. 이번 외관 수정 이후 실제 InDesign 재검증 필요. AI 실호출 및 별도 브라우저 렌더링은 여전히 미검증.
- 수정: UXP enum equals 비교, 재생성 실패 시 이전 대상 해제, save 반환 문서 추적, 검사 실패 후 PDF 차단, 단계별 민감정보 제거 진단. PDF 옵션 취소/완료 불명확 시 성공으로 단정하지 않는다.

기존 1.0의 실기 성공 기록은 `docs/archive/HANDOFF-before-1.1.md`에 보존했다. 해당 기록은 새 모드 실기 검증의 근거가 아니다.

- 외관 수정: strokeColor=None 명시, typography/furniture 공통화, 설정 폰트·자간·문단 간격·색상 정합성, 신규 문서의 스타일 override 제거. 실제 줄바꿈/폰트 매칭/페이지 분할은 아직 다를 수 있음. 상세 비교와 실기는 docs/RENDER_PARITY.md.

- 최신 실기 오류: create.styles에서 글꼴 스타일 사용 불가. 역할/폰트/속성은 기존 로그에 없어 정확한 PC 원인 미확정. 폰트와 style 일괄 대입을 순차 적용으로 변경하고 단계별 family/style/name 진단을 추가했다.
- 실제 설치 face 검색/본문·제목 적용, 프로젝트 누락 폰트 경고, UI 전수 감사 완료. Mock 통과와 Adobe 실기는 구분한다. 상세: docs/STUDIO_AUDIT.md. 템플릿 등록/상세 텍스트 편집 UI는 설계만 했다.

- 안정화: 동일 DOM mount 재사용, destroy/새 DOM 재초기화, 선택 UI 실패 격리, Host 실패 시 입력/시안 유지, session/latest/picker 보호. 폰트 Family→Style 선택과 cache/명시 새로고침 분리. 시간 진단 표식: Studio ready [stability-01].
- 최신 절차/전체 UI 추적은 docs/STABILITY.md. 실제 UDT Reload와 최신 폰트 적용은 아직 사용자 PC 실기 필요.

- JSON: designs/manifest.json → validator/normalizer → origin=json plan → Preview/Host. 무료3안 유지. 폰트/무사진/후속 페이지/누락값/추가 파일 방법은 docs/JSON_DESIGNS.md. 표시 [json-design-01] 추가.
- 원본 헤더 크기/페이지번호 행간은 null이므로 명시 기본값과 경고 적용. 원본 제목/부제 프레임이 작아 예시 원고 넘침 가능; 자동 축소/이동 없음. 실제 InDesign/PDF 미검증.

## 다음 3개 작업

1. JSON 디자인은 먼저 `docs/JSON_DESIGNS.md`의 Smoke 순서로 실기 비교한다. 기본 흐름은 `docs/STABILITY.md`의 5~10분 Smoke Test를 통과한 뒤 `docs/PRODUCTION_TESTS.md`의 버튼 순서로 실제 InDesign에서 실행하고 앱·UDT 버전, 코드 SHA, 단계별 결과를 남긴다. docs/RENDER_PARITY.md 순서로 동일 원고/무료 시안의 미리보기·새 문서·PDF 외관을 비교한다.
2. Host API 호환성 문제가 있으면 `src/auto-indesign.js`에 한정해 보정한다. 원고/배치 계산 로직과 기존 템플릿 생성 경로를 함께 바꾸지 않는다.
3. 실제 원고 3건으로 제목 넘침, 본문 페이지 추가, 사진 크롭, 원문 보존, PDF 출력을 확인한 뒤 실무 배포 여부를 결정한다.

## 핵심 경계

- 무료 3안은 로컬 계산이다. AI라고 표시하지 않는다.
- AI 모드는 버튼 실행 시에만 키로 요청. 실호출은 개발 중 하지 않았다. 응답 좌표 검증 실패 시 입력 중단, 자동 재시도 없음.
- 생성 전 폰트·이미지 접근 검사. 생성 중 실패하면 이번 새 문서만 닫는다. 활성 사용자 문서에는 접근하지 않는다.
- `latest` 문서 객체로 저장/출력을 고정하고, 원고·시안이 바뀌면 이전 제작본의 출력 버튼은 비활성화한다.
- 본문 원문은 처음 연결된 Story에 한 번만 입력. `Story.overflows`가 남으면 본문 페이지를 추가한다. 최대 40장.
- API 키/사진 바이너리는 프로젝트 JSON에 넣지 않는다. 사진 링크 경로는 포함되므로 다른 PC로 옮길 때 사진도 전달해야 한다.
- 목차 자동 생성, 여러 기사 일괄 제작, 이미지 생성, 모든 인쇄조건의 자동 검증은 범위 밖이다.

## 개발·전달

- `npm test`: 의존성 설치 없이 115개 테스트. 현재 PC 셸에 npm이 없으면 package.json과 동일한 `node --test tests/core.test.js tests/host.test.js tests/ui.test.js tests/json-design.test.js`를 사용한다.
- `preview.html`: 폴더에서 브라우저로 열어 체험.
- `manifest.json`: UDT로 로드.
- 최종 ZIP에는 소스/문서/테스트/기존 자료를 포함하며 `.git`과 임시파일은 제외.
- 사용자 승인에 따라 개발 브랜치만 commit/push한다. main에는 commit/push/merge하지 않는다.

### 현재 UI/UX 상태 (2026-09-30)
- Family 중심 선택기, 선택 디자인 요약, 역할별 검사 오류 및 PDF 차단 이유, 접힌 진단 적용.
- Story 323/348/401의 실제 역할은 아직 미확정. 새 버전으로 재검사 시 Label 기반 역할과 상세 번호를 확보해야 함.
- 브라우저 Mock 조작과 자동 테스트는 Adobe 실기 성공이 아님. 다음 작업: docs/UI_UX_AUDIT.md의 PC Smoke Test.

- 최종 자동 검증: 기존 115개 + 신규 5개 = 120개 통과 (Node/Mock, Adobe 실기 아님).

### 최신 상태: 안전한 자동 수정 (2026-09-30)
- 제목/부제 넘침을 역할별 제한 정책으로 자동 조정하고 전체 재검사. 한도 실패는 원복하고 PDF 차단.
- 본문은 기존 연결이 유지된 경우만 continuation 추가. 원본 샘플 JSON/레이아웃 값 변경 없음.
- 132개 자동 테스트 통과. 실제 InDesign auto-fit은 미검증: docs/AUTO_FIX.md PC 순서로 확인 필요.
- 기록은 세션 메모리이며 Preview/작업 JSON은 원본 plan을 유지한다. 디자인/원고 변경 후 새 생성 대상에 이전 수정값을 적용하지 않음.
