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
