# 기존 25페이지 공통 등록/추천/검증 연결 — 2026-09-30

- 재개 HEAD 6f71f8dc8572ba3bafa6b3989123d40e0a848cb9. 미커밋 design-matching/design-registration/registered-native 변경 보존 후 완성. 새 원본/샘플 디자인 생성 없음.
- 개인 결과 파일: assets/templates/working/registered-pages-25.private.json (약15MB, source models2 + descriptors25). 한 번 불러오면25페이지 전체 DOCX 평가. 원본 모델/INDD/IDML/기존 reference.review는 읽기만 수행. 새 산출물은 ignored, Git 미포함.
- 표: docs/REGISTERED_PAGE_STATUS.md. 총25 / 역할확인16 / 매핑9 / Fidelity 정적검증가능9(빈지면1 포함) / 매핑+검증준비8 / Unsupported16. 역할확인과Unsupported 중복. 실제 Fidelity 완료1은 사용자 보고 original/u335e; 나머지24 실기 미검증. Production Ready0 (u335e 이미지/제작 후 고정객체 오류 미확정).
- 공통 autoDraft: 제목/본문/부제/명시적 이미지 자리표시/캡션 규칙과 confidence, 나머지 원본 유지. 별도 source/page 하드코딩 없음. 기존 u335e 확정 descriptor 유지. Capability에는 공유 페이지객체, 고정graphic/effects readback 및 혼합Typography 제한 기록.
- 다중 BODY: 명시적 bodyFlow 유효성 확인, 원본 글분량 비율로 연속 분배. CRLF/Unicode 문자 보존, 누락/중복 방지. 프레임/Story/스타일 변경 없음. IMAGE1..N은 전체 숫자 인덱스로 바인딩/배치. 실제 IMAGE10까지 Mock 회귀. Group 귀속은 모든 직접 자식이 한 선택페이지에 확실히 속할 때만 유지 허용; 공유 지면은 여전히 차단.
- 검증용 proof는 역할 미완료 페이지도 원본 검사 가능하되 제작은 역할/Fidelity/육안확인 gate 유지. 개발자 전체 페이지 선택/다음 미검증 디자인 검증/전체 검증 결과 저장 추가. 다음 버튼은 미시도+정적지원 페이지1개씩 실행, 반복 import 불필요. 실패는 목록에서 재시도. 상태는 source/page ID별 세션에만 보관; 파일이 스스로 Production Ready 승인하지 못함. 실제 Host CONTENT_APPLIED+오류0+outputReady일 때만 Production Ready.
- 전체 실패는 property/path + expected/actual + object type + cause로 그룹화. 원본/recheck 중복 제거, 전체 원문 보고서 보존. 새 batch JSON은 UTF8 write→readback 일치 및 Reload guard 후 저장완료.
- u335e 고정 객체 오류: 실제 최신 JSON 미수신. 메시지 slash가 경로 redaction으로 가려지는 표시 문제만 고침, preservation differences/operation을 구조화. 실제 mismatch 무시/Auto Fix 없음. DOCX 이미지 place/링크/수/geometry/fitting 검사 유지, 실제 배치 성공 미확정.
- 검증: Node255/Python16 전체 통과. 실제25파일 unpack 오류0, 전체25 추천평가, 지원9페이지 IDML 패키지 생성/검증 성공(Adobe open 아님), 역할준비8 콘텐츠 binding 성공. Adobe 미검증을 성공으로 보고하지 않음.
- NEXT STEP: Reload → DOCX → registered-pages-25.private.json 한 번 불러오기 → 추천 또는 개발자 다음 미검증 디자인 검증. 각 성공본 육안비교 후 제작/검사. Reload 전 전체 페이지 검증 결과 저장. u335e는 제작 직후 Fidelity 진단 JSON과 이미지 슬롯 화면 전달 필요.

---

# 실제 Host JSON 기반 Fidelity readback 수정 — 2026-09-30

- 실제 magazine-fidelity.private.json 분석: 오류6 = 집계 차단1 + 객체5. u7c78 FillColor.space expected CMYK / actual undefined, 채널 [10,0,0,0] 및 bounds/crop 동일. u7c7e(TITLE), u7dba(KEEP), u7c96(BODY), u7caf(SUBTITLE)는 모두 readback supported / UNSUPPORTED direct override 비교: FontStyle. 실제 폰트 불일치 값이 아니라 readback 차단이다. 해당6건에 NOT_APPLICABLE로 바꿀 항목 없음.
- ColorSpace는 native enum의 Object.keys 열거에 의존하지 않고 명시적 CMYK/RGB/LAB/MIXEDINK 상수와 비교. 알 수 없는 공간은 차단, 채널 수로 추정하지 않음.
- plural Characters.itemByRange 대신 모든 scalar Character.item(index)를 읽는다. 중간 문자와 CR도 전부 typography/direct override/color/text 비교. 원본/생성값 비교 및 허용오차 변경 없음. 이전 Mock은 plural도 scalar 값을 반환해 Host 차이를 검출하지 못했다.
- 원인 범위: JSON은 native FontStyle의 실제 타입/값을 보존하지 못한 readback 실패 기록이다. plural 반환/enum 열거 의존을 제거했지만 이것만으로 Adobe의 전체 Fidelity 통과를 확정하지 않는다. 다음 실제 검사에서 추가로 드러나는 차이는 그대로 차단한다.
- 기존 콘텐츠 경로 유지·회귀 확인: Fidelity 재검사 → TITLE/SUBTITLE/BODY 교체 및 원본 스타일/direct override 복원 → 내부 이미지 파일 IMAGE place/원본 fitting → recompose → 콘텐츠 검사 → 기존 INDD/PDF. KEEP/geometry/색상/원본 overflow 차단 및 콘텐츠 overflow 분리 유지. Auto Fix 없음.
- 기준 시작 메인 · 사진 1장 / u335e. 개인 원본과 DOCX/진단 파일 수정·커밋 없음. Node238/Python16 통과. Adobe 콘텐츠 제작/이미지 crop/출력은 아직 미검증.
- NEXT STEP: UDT Reload → registered-smoke.docx → e2e-reference.review.json → 등록 디자인에서 추천 → 시작 메인 · 사진 1장 분석 후보로 선택 → 검증용 문서 생성. Fidelity 통과 시 원본과 육안 비교 후 원본과 비교 완료 → 선택 디자인으로 제작 → 문서 검사 → INDD 저장 → PDF 내보내기. 실패 시 진단 JSON 전달, 강제 통과 금지.

---

# Fidelity 진단 JSON 저장 PC 테스트

1. UDT Reload.
2. 원고 / 작업 불러오기 → registered-smoke.docx.
3. 템플릿 등록·검증 (개발자) → 디자인 모델 / 등록 파일 불러오기 → e2e-reference.review.json.
4. 등록 디자인에서 추천 → 시작 메인 · 사진 1장 → 분석 후보로 선택.
5. 개발자 영역의 검증용 문서 생성 → 실제 Fidelity 실패 결과 확인.
6. `05 검사 및 출력` 영역의 검사 결과 아래, `상세 진단 펼치기` 옆 **Fidelity 진단 JSON 저장** 클릭.
7. 저장 대화상자에서 바탕화면/문서 등 원하는 폴더 선택. 기본 파일명 **magazine-fidelity.private.json**으로 저장.
8. 패널의 **Fidelity 진단 JSON 저장 완료** 확인 후 파일을 이 대화에 첨부.

정상: 오류6건이 그대로 있다면 JSON fidelityErrorCount=6, errors가6개이고 rawReport 및 comparisons에 원본/생성 비교 데이터가 있다. 총 오류 개수와 차이 속성 수는 다를 수 있다. 집계 오류는 특정 elementId가 null일 수 있다. null은 미제공/집계 정보이며 추측한 값이 아니다. undefined는 __diagnosticType 객체로 명시 보존한다.
취소하면 저장 취소 표시, 쓰기/검증 실패하면 실패 표시 후 재시도 가능. 원고/선택을 바꾸기 전에 저장한다. 파일에는 원문/경로 등 개인 데이터가 포함된다.
Adobe 저장 실기는 아직 미검증이다. 실패 시 최종 오류 화면을 전달한다. Fidelity 통과나 콘텐츠 제작을 이번 단계에서 시도할 필요는 없다.

---

# overprintFill 수정 재실기

UDT Reload → registered-smoke.docx 불러오기 → e2e-reference.review.json 불러오기 → 등록 디자인에서 추천 → 시작 메인 · 사진 1장 / 분석 후보로 선택 → 검증용 문서 생성.

확인 경계: registered.pageReferences.beforeCleanup.success → registered.cleanup.success → registered.fidelity.start. 이후 원본 비교 통과 여부는 별도이며 NOT_APPLICABLE은 원본 무채움/비활성 상태에 대한 진단이다. fidelity.notApplicable에 sourceId별 속성과 이유를 확인할 수 있다.
실패 시 생성 영역에 표시된 operation/객체/sourceId/페이지/스프레드/property/Adobe error 전체를 전달. Auto Fix는 실행하지 않는다.

---

# 최종 실패 요약 확인

동일한 Reload → DOCX → 등록 파일 → 추천 → 후보 선택 → 검증용 문서 생성 순서로 진행한다.
실패하면 생성 버튼 아래의 요약(operation, DOM/소유 객체, 페이지, 스프레드, property, attempted value, Adobe error/code) 전체를 복사하거나 화면으로 전달한다. 상세 로그를 맨 아래까지 스크롤할 필요 없이 요약이 보이며, 로그 끝에도 동일 내용이 기록된다.
정상 최소 목표는 pageReferences.beforeCleanup.success → cleanup.success → registered.fidelity.start이며, 이후 equal 판정은 별도다. 현재 사용자 전사 로그에는 acquire.success까지만 확인되어 실제 오류 원인은 아직 미확정이다.

---

# open 이후 DOM 단계 재실기

Reload → 원고 / 작업 불러오기 (registered-smoke.docx) → 디자인 모델 / 등록 파일 불러오기 (e2e-reference.review.json) → 등록 디자인에서 추천 → 시작 메인 · 사진 1장 / 분석 후보로 선택 → 검증용 문서 생성.

정상 경계: package.open.success → document.acquired → pageReferences.beforeCleanup.success → cleanup.success → fidelity.start. fidelity.completed의 equal 값은 별도 Fidelity 판정이며 문서 열림과 구분한다.

실패 시 상세 진단의 REGISTERED_DOM_FAILED 전체를 전달. operation, object.type/id/name/sourceId, owner, pageId, property, attemptedValue 및 Adobe 오류가 포함된다. snapshot.read이면 읽기 실패, cleanup.shuffle.set이면 속성 대입 실패, cleanup.page.remove이면 삭제 작업 실패다. units.restore 오류가 함께 있어도 최초 오류를 우선 확인한다. 실패한 새 문서는 기존 정리 정책에 따라 닫힐 수 있다.

현재 실제 실패 속성은 이전 화면만으로 확정할 수 없다. 이번 재실기 결과를 받기 전까지 해결 완료/전체 Fidelity 성공으로 취급하지 않는다.

---

# IDML 열기 수정 재실기 — 먼저 이 단계만 확인

1. UDT에서 현재 폴더의 플러그인을 Reload.
2. 원고 / 작업 불러오기 → 기존 `assets/templates/working/registered-smoke.docx`.
3. 디자인 모델 / 등록 파일 불러오기 → 기존 `assets/templates/working/e2e-reference.review.json`. 재추출 불필요.
4. 등록 디자인에서 추천 → 시작 메인 · 사진 1장 → 분석 후보로 선택.
5. 검증용 문서 생성.

정상 최소 결과: 실제 InDesign에 새 문서가 열림. 이후 Fidelity 검사가 별도로 실행되므로 문서 열림과 Fidelity 통과는 구분한다. 원본 텍스트 유지, 콘텐츠 교체 없음, 검증본 PDF 차단 유지.

실패 시 `상세 진단 펼치기` 화면과 전체 오류를 전달:
- IDML_PACKAGE_INVALID: Host 전에 패키지/참조 오류.
- IDML_WRITE_MISMATCH: UXP 저장 후 바이트 불일치.
- IDML_HOST_OPEN_FAILED: 패키지와 디스크 검사는 통과했으나 Adobe가 거부. 메시지의 임시 .idml 경로, bytes/CRC, Adobe 오류, InDesign 버전을 전달. 해당 임시 파일은 앱 재시작 전에 보관하면 추가 진단 가능(개인 원문 포함, 공개 업로드 금지).
- 문서가 열렸지만 다음 검사 실패: 열린 문서와 Fidelity 상세 화면을 전달. Auto Fix로 처리하지 않음.

---

# 등록 디자인 PC Smoke Test

이 절차는 **실제 InDesign 플러그인**에서 실행한다. `preview.html`과 `registered-ui-smoke.html`은 Adobe 제작 시험이 아니다. 원본 파일에는 저장하지 않는다.

## 준비

1. 이 프로젝트의 `manifest.json`을 사용하는 기존 UXP 패널을 Reload한다. 앱/UDT 버전을 메모한다.
2. 원본의 **프리젠테이션 6 SemiBold / 4 Regular** 설치 여부를 확인한다. 대체 글꼴로 Fidelity 오류를 숨기지 않는다.
3. 입력 파일: `assets/templates/working/registered-smoke.docx`. 내부 이미지 1장인 합성 문서다. 개인 DOCX는 첫 시험 이후 사용해도 된다.
4. 등록 파일: `assets/templates/working/e2e-reference.review.json`. 기존 검토 파일을 그대로 사용한다. 원본과 비교할 때 원본 INDD/IDML은 저장하지 않는다.

## 버튼 순서와 정상 결과

| 순서 | 조작 | 정상이라면 보이는 결과 |
|---|---|---|
| 1 | **원고 / 작업 불러오기** → `registered-smoke.docx` | 제목 `작은 발견`, 부제 `일상에서 만나는 새로운 장면`, 본문 151자, 사진 1장 / DOCX 내부 1장 |
| 2 | 등록 영역 **디자인 모델 / 등록 파일 불러오기** → `e2e-reference.review.json` | 등록 1건, 읽기 오류 0건. 기존 다른 등록은 유지 |
| 3 | **등록 디자인에서 추천** | `시작 메인 · 사진 1장`. 해상도/비율/제목 수용량 경고가 있을 수 있음. 실기용 합성 이미지는 인쇄 품질을 보장하지 않음 |
| 4 | 해당 카드 **분석 후보로 선택** | 선택 디자인/페이지 `u335e` 표시. 일반 생성 버튼은 위의 검증/제작 버튼을 안내 |
| 5 | **검증용 문서 생성** | 원문을 유지한 새 InDesign 문서. 선택 지면 1쪽, 216×303 mm. 통과 시 `자동 비교 통과 · 원본과 시각 비교 필요`. 제작/PDF는 아직 차단 |
| 6 | 원본 표시 2쪽과 새 문서를 직접 비교 | 제목·부제·본문/유지 문구, 프레임/Parent/장식/쌓임 순서가 같아야 함. 숫자 비교는 패널 **상세 진단 펼치기**에서 original/generated 확인 가능 |
| 7 | 맞는 경우에만 **원본과 비교 완료** | `선택한 등록 디자인으로 제작` 활성화. 다른 역할로 보이면 진행하지 않고 전달 |
| 8 | **선택한 등록 디자인으로 제작** | 별도의 새 문서에서 원본 자동 검사 후 TITLE/SUBTITLE/BODY/IMAGE1 교체. 유지 문구와 장식은 그대로. Recompose 및 검사 결과 표시 |
| 9 | **문서 검사** 또는 **다시 검사** | Fidelity 오류 0, 콘텐츠 overflow 0이면 검사 통과. 새 원고만 넘치면 `CONTENT_OVERFLOW`, 원본부터 넘치면 `SOURCE_OVERFLOW`/Fidelity 실패 |
| 10 | **INDD 저장** → 새 파일명/새 위치 | 저장 성공 후 재검사. 원본/검증 문서를 덮어쓰지 않음 |
| 11 | **PDF 내보내기** → 새 위치 → InDesign PDF 옵션 완료 | 오류가 없을 때만 활성화. 완료 이벤트가 없으면 `완료 미확인`이 정상적인 보수적 보고이며 파일을 직접 확인 |

검증 문서는 원문 확인용이다. 저장해 비교할 수 있지만 제작용 PDF는 차단한다. 새 문서를 만들 때 이전 검증 문서는 자동으로 닫지 않으므로 탭을 구분한다. 출력/검사는 활성 문서가 아니라 패널에서 마지막으로 만든 문서를 대상으로 한다.

## 실패하면 전달할 것

- 마지막으로 누른 버튼 이름과 등록 영역/검사 영역의 오류 화면.
- **상세 진단 펼치기**의 stage, `phase`, `elementId`, `comparison.differences`의 expected/actual 및 오류 문구. 개발자 도구는 필요 없다.
- 원본 표시 2쪽과 생성본의 같은 부분 화면. 텍스트/폰트/프레임 차이가 보이게 한다.
- InDesign/UDT 버전, 사용한 DOCX, 마지막 커밋 SHA. 개인 원고·사진은 Git에 올리지 않는다.
- `UNSUPPORTED`는 해당 속성을 검증할 수 없다는 뜻이다. `SOURCE_UNRESOLVED`는 원본 필수 값이 해결되지 않았다는 뜻이다. 둘 다 임의 기본값이나 Auto Fix로 우회하지 않는다.
- 원본 overflow/geometry/font/graphic 오류면 원고 교체를 진행하지 않는다. 콘텐츠 overflow도 이번 등록 경로에서는 Auto Fix하지 않는다.

## 재시도 / Reload

원고를 수정하면 이전 proof/제작/출력 승인이 해제된다. 추천→선택→검증부터 다시 진행한다. Reload 후에도 같은 순서로 입력/등록 파일을 불러온다. 무료 3안이나 JSON을 확인할 때는 해당 시안을 명시적으로 다시 선택한다.
