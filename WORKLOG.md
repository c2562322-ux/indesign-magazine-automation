# WORKLOG.md

작업 이력을 시간순으로 누적 기록한다. 새 로그는 파일 맨 아래에 추가한다.

---

## 2026-09-21 - 초기 UXP 프로젝트 구조 생성

완료:
- `indesign-magazine-automation` 프로젝트 기본 폴더 구조 생성 (manifest.json, index.html, styles.css, index.js, src/, sample/)
- UXP manifest v5 작성 (host: InDesign, panel entrypoint 1개)
- `Magazine Automation` 패널 UI 작성 (Load Article 버튼, Generate 버튼, Status 표시)
- `src/indesign.js`에 `addHelloText()` 구현: `Generate` 클릭 시 활성 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임 생성
- `src/data.js`, `src/template.js`, `src/text.js`, `src/image.js`, `src/validation.js` 스텁 파일 생성 (다음 단계용, 로직 없음)
- `sample/article.json` 샘플 기사 데이터 작성
- 루트 `README.md` 작성 (폴더 구조, UXP Developer Tool 실행 방법)

변경 파일:
- manifest.json
- index.html
- styles.css
- index.js
- src/indesign.js
- src/data.js
- src/template.js
- src/text.js
- src/image.js
- src/validation.js
- sample/article.json
- sample/images/README.md
- README.md

테스트:
- 없음. UXP Developer Tool 및 실제 InDesign에서 로드/실행해보지 않았다. 코드 작성만 완료된 상태.

남은 문제:
- `src/indesign.js`의 `app.doScript()` 호출 시그니처가 실제 InDesign UXP API와 맞는지 미검증.
- UDT에서 manifest.json 로드 자체가 되는지 미검증.

---

## 2026-09-22 - 문서화 체계 구축

완료:
- 새 개발자/새 Claude Code 세션이 이어서 작업할 수 있도록 문서화 체계 구축
- `CLAUDE.md` 작성: Claude Code가 이 프로젝트에서 지켜야 할 작업 규칙 정리
- `HANDOFF.md` 작성: 현재 프로젝트 상태(완료/테스트 여부/미구현/알려진 문제/다음 작업/디자이너 확인 사항) 정리
- `WORKLOG.md` 작성: 이전 작업(2026-09-21) 포함 작업 이력 기록 시작
- `DECISIONS.md` 작성: 지금까지 실제로 확인 가능한 기술 결정 기록
- `docs/TEMPLATE_SPEC.md` 작성: 디자이너 템플릿 규칙을 기록할 문서 구조 생성 ("템플릿 미수령" 상태 명시)
- `README.md` 내용을 실제 코드 상태와 대조 확인 (수정 불필요, 현재 구조와 일치함을 확인)

변경 파일:
- CLAUDE.md (신규)
- HANDOFF.md (신규)
- WORKLOG.md (신규)
- DECISIONS.md (신규)
- docs/TEMPLATE_SPEC.md (신규)

테스트:
- 해당 없음 (문서 작업만 진행, 기능 코드는 수정하지 않음)

남은 문제:
- 없음

---

## 2026-09-22 - 디자인 리소스 폴더(assets) 추가

완료:
- 디자이너로부터 실제 InDesign 원본 템플릿(.indd/.idml)과 폰트 파일을 전달받아 보관할 폴더 구조 생성: `assets/templates/original/`, `assets/templates/working/`, `assets/fonts/`
- 각 리소스 폴더에 `.gitkeep` 추가 (빈 폴더 구조를 clone 이후에도 유지하기 위함)
- `.gitignore` 신규 작성: `assets/templates/original/*`, `assets/templates/working/*`, `assets/fonts/*` 아래 실제 파일은 Git에 올리지 않고 `.gitkeep`만 추적하도록 설정
- `README.md`에 `assets` 폴더 구조/역할 설명 추가
- `HANDOFF.md`에 디자이너 템플릿·폰트 수령 상태 반영, "외부 대기 사항"/"다음 추천 작업" 갱신
- `DECISIONS.md`에 D005(assets 리소스 Git 추적 제외 방식) 기록
- `docs/TEMPLATE_SPEC.md` 상태를 "템플릿 미수령" → "템플릿 파일 수령, 분석 전"으로 갱신 (표 내용은 미확정 그대로 유지)

변경 파일:
- assets/templates/original/.gitkeep (신규)
- assets/templates/working/.gitkeep (신규)
- assets/fonts/.gitkeep (신규)
- .gitignore (신규)
- README.md
- HANDOFF.md
- DECISIONS.md
- docs/TEMPLATE_SPEC.md

테스트:
- 해당 없음 (폴더/문서/설정 변경만 진행, 기능 코드는 수정하지 않음)

남은 문제:
- 없음. 단, `assets/templates/original/`의 실제 원본 파일 분석 및 `docs/TEMPLATE_SPEC.md` 반영은 아직 진행되지 않았다 (다음 작업으로 HANDOFF.md에 기록).

---

## 2026-09-22 - Template Inspector(읽기 전용) 기능 추가

완료:
- `Magazine Automation` 패널에 `Inspect Template` 버튼과 `Inspection Log` 표시 영역 추가 ([index.html](index.html), [styles.css](styles.css))
- `src/inspector.js` 신규 작성: 현재 활성 문서를 읽기 전용으로 분석하는 `inspectDocument()` / `formatReport()` 구현 — 전체 페이지 수, 페이지별 Page Item 수, Text Frame 목록, Rectangle(이미지 프레임) 목록 및 포함 이미지 개수, 사용 가능한 Paragraph/Object Style 목록
- `index.js`에 `Inspect Template` 클릭 핸들러 연결: 결과를 패널 로그 영역과 콘솔에 동시 출력, 문서는 수정하지 않음
- 기존 `Load Article`/`Generate`(Hello Magazine) 기능 코드는 수정하지 않음
- `README.md`에 `Inspect Template` 기능 설명, 폴더 구조에 `src/inspector.js` 추가, 실행 방법에 테스트 단계 추가
- `HANDOFF.md`에 새 기능/테스트 필요 항목/알려진 문제(그룹·스타일 그룹 미집계, DOM 속성 미검증) 반영
- `DECISIONS.md`에 D006(읽기 전용 기능은 app.doScript로 감싸지 않음), D007(Template Inspector를 별도 모듈로 분리) 기록

변경 파일:
- index.html
- styles.css
- index.js
- src/inspector.js (신규)
- README.md
- HANDOFF.md
- DECISIONS.md

테스트:
- 없음. UXP Developer Tool/실제 InDesign에서 `Inspect Template` 버튼을 클릭해본 적이 없다. `page.textFrames`, `page.rectangles`, `rectangle.images`, `item.constructor.name`, `doc.paragraphStyles`, `doc.objectStyles` 등 사용한 InDesign DOM 속성의 실제 동작은 전부 미검증.

남은 문제:
- `Inspect Template`이 실제 InDesign에서 에러 없이 동작하는지 확인 필요
- Group으로 묶인 개체, 스타일 그룹 내부 스타일은 이번 버전에서 집계되지 않음 (알고 있는 제한사항, HANDOFF.md에 기록)

---

## 2026-09-22 - Template Inspector 실기 테스트 결과 반영 + Frame 분석 워크시트 추가

완료:
- 사용자가 실제 InDesign + UXP Developer Tool에서 `Inspect Template` 버튼을 테스트한 결과를 문서에 반영: 에러 없이 실행되었고, `assets/templates/working/`의 실제 디자이너 템플릿에서 일부 페이지의 Text Frame / Rectangle이 정상 조회됨을 확인 (테스트는 사용자가 직접 수행, Claude Code가 실행한 것은 아님)
- `docs/TEMPLATE_SPEC.md`에 "Frame 분석 워크시트" 섹션 신규 추가: Template Type / Page Number / Page Purpose / Frame Role / Current Frame Name / Proposed Automation Name / Object Type / Data Field / Required-Optional / Notes 10개 열과 작성 규칙(자동화 이름은 아직 확정하지 않고 "(후보)"로만 표기 등)
- `docs/TEMPLATE_SPEC.md`의 "Template Type" 표에 확정된 4종(목차, 시작 페이지, 본문 페이지, 인터뷰 레이아웃) 기록 (자동화용 영문 식별자는 아직 미정으로 비워둠)
- 기존 "Frame Name"/"Data Field Mapping"/"Required / Optional"/"Paragraph Style"/"Object Style" 표는 "워크시트를 일반화한 확정판"으로 위치시키고, 아직 미확정 상태 그대로 유지 (임의 채움 없음)
- `HANDOFF.md`를 "Template Inspector 실기 테스트 성공, 실제 프레임 구조 식별 단계 진행 중" 상태로 갱신: "실제 테스트 완료된 기능"에 이번 확인 사항 반영, "아직 테스트하지 못한 기능"/"다음 추천 작업" 갱신

변경 파일:
- docs/TEMPLATE_SPEC.md
- HANDOFF.md
- WORKLOG.md

테스트:
- 이번 세션에서 Claude Code가 직접 실행한 테스트는 없음 (문서화 작업만 수행). 문서에 반영한 테스트 결과는 사용자가 실제 InDesign/UXP Developer Tool에서 수행하고 보고한 내용임.

남은 문제:
- `docs/TEMPLATE_SPEC.md`의 "Frame 분석 워크시트"는 표 구조와 규칙만 준비되었고 실제 행은 아직 비어 있음 (다음 작업)
- Inspect Template의 나머지 항목(이미지 개수, 개체 타입 표시, 스타일 목록)과 템플릿 전체 페이지에 대한 동작 여부는 아직 구체적으로 확인되지 않음

---

## 2026-09-22 - Template Inspector 출력 개선 (Frame Name 비어있음 문제 대응)

완료:
- 실제 템플릿 테스트에서 대부분의 Text Frame에 Frame Name이 비어 있어 역할 식별이 어렵다는 문제를 확인하고, `src/inspector.js`를 읽기 전용을 유지하면서 개선:
  - Text Frame: name, 텍스트 미리보기(줄바꿈→공백 치환, 50자 초과 시 자름), geometricBounds 출력 추가
  - Rectangle: name, geometricBounds, 이미지 배치 여부(예/아니오 + 개수) 출력 추가
  - 각 페이지에 내부 index(`doc.pages.item(i)`의 i)와 실제 `page.name`을 함께 표시
  - 더 이상 쓰지 않는 `item.constructor.name` 기반 타입 표시 제거 (Text Frame/Rectangle 섹션이 이미 타입을 구분해 표시하므로 불필요)
- `textFrame.contents`가 Linked Text Frame에서는 프레임 하나가 아니라 연결된 스토리 전체 텍스트를 반환할 수 있다는 점을 코드 주석과 문서에 caveat로 기록
- `HANDOFF.md` 갱신: 현재 단계를 "시작 페이지 프레임 역할 확정 단계 진행 중"으로 반영, 새로 추가된 출력 항목을 "아직 테스트하지 못한 기능"에 추가, "알려진 문제"에서 더 이상 사실과 맞지 않는 `item.constructor.name` 관련 문구 제거 후 `textFrame.contents`/`geometricBounds` 미검증 항목으로 교체
- 기존 `Generate`(Hello Magazine), `Load Article` 코드는 수정하지 않음
- InDesign 문서/템플릿 파일은 수정하지 않음 (코드만 변경)

변경 파일:
- src/inspector.js
- HANDOFF.md
- WORKLOG.md

테스트:
- 없음. 이번에 추가한 텍스트 미리보기/geometricBounds/이미지 배치 여부/페이지 index 출력은 아직 실제 InDesign에서 실행해보지 않았다. 사용자가 "시작 페이지"에서 다시 `Inspect Template`을 실행해 로그를 전달하면 다음 단계(Frame 분석 워크시트 작성)로 진행한다.

남은 문제:
- 개선된 `Inspect Template` 출력이 실제 InDesign에서 에러 없이 동작하는지 확인 필요 (특히 `textFrame.contents`, `geometricBounds`)
- "시작 페이지" 템플릿의 실제 로그를 아직 전달받지 못해 `docs/TEMPLATE_SPEC.md`의 Frame 분석 워크시트는 여전히 비어 있음

---

## 2026-09-23 - "시작 페이지" 프레임 매핑 초안 작성

완료:
- 사용자가 실제 InDesign에서 "시작 페이지" 템플릿의 두 페이지 변형(사진 있음: page.name=2/index=3, 사진 없음: page.name=3/index=4)에 대해 개선된 `Inspect Template` 로그를 전달함 — 텍스트 미리보기/geometricBounds/이미지 배치 여부 출력이 실제로 정상 동작함을 확인
- `docs/TEMPLATE_SPEC.md`의 "Frame 분석 워크시트"에 두 페이지의 모든 Text Frame/Rectangle을 행으로 기록: 제목→TITLE(후보), 부제/포인트 문구→POINT_TEXT(후보), 본문→BODY(후보, 사진 없는 버전은 BODY_COLUMN_1/BODY_COLUMN_2로 2단 구성), 대표 이미지 Rectangle→HERO_IMAGE(후보). "대표이미지" 텍스트는 사용자 확인대로 템플릿 제작 안내 문구로 별도 표시(데이터 필드 아님)하고 자동화 이름을 부여하지 않음
- Current Frame Name은 전부 "(이름 없음)"으로 기록 (실제 로그에 이름이 없었음, 텍스트 미리보기/bounds로만 식별)
- Required/Optional, Data Field 매핑 등 불확실한 항목은 임의로 확정하지 않고 전부 "확인 필요"로 남김. 단 HERO_IMAGE는 사진 없는 변형에 프레임 자체가 없다는 사실을 근거로 "선택(Optional)일 가능성 높음 — 확인 필요"로 기록
- "Template Type" 표의 "시작 페이지" 행에 사진 유무에 따른 2가지 변형이 실제로 존재한다는 설명 추가
- `HANDOFF.md` 갱신: 현재 단계를 "'시작 페이지' 템플릿 1차 프레임 매핑 초안 작성 완료"로 반영, 개선된 Inspect Template 출력(텍스트 미리보기/geometricBounds/이미지 배치 여부)이 실사용에서 동작함을 "실제 테스트 완료된 기능"으로 이동, "다음 추천 작업"을 목차 등 나머지 Template Type 분석으로 갱신
- InDesign 파일 수정 없음, Frame Name 실제 변경 없음, 자동조판 코드 구현 없음, 시작 페이지 외 템플릿은 분석하지 않음 (요청받은 범위만 수행)

변경 파일:
- docs/TEMPLATE_SPEC.md
- HANDOFF.md
- WORKLOG.md

테스트:
- 이번 세션에서 Claude Code가 직접 실행한 테스트는 없음 (문서화 작업만 수행). 문서에 반영한 Inspect Template 동작 확인은 사용자가 실제 InDesign에서 수행하고 전달한 로그를 근거로 함.

남은 문제:
- "시작 페이지" 워크시트에 "확인 필요"로 남은 항목이 다수 있어(POINT_TEXT/subtitle 동일 여부, BODY_COLUMN 자동 분배 방식, HERO_IMAGE Required/Optional, 안내 문구 프레임 처리 방식) 디자이너 확인 전까지 Frame Name/Data Field Mapping 등 확정판 표는 채우지 않음
- 목차, 본문 페이지, 인터뷰 레이아웃은 아직 분석하지 않음

---

## 2026-09-23 - Template Inspector에 Script Label(label) 읽기 전용 출력 추가

완료:
- `name`이 대부분 비어 있어 프레임 역할 식별이 어렵다는 문제에 대해, `name` 대신 InDesign Script Label(`label`)을 자동화 식별자로 쓸 수 있는지 분석해 보고함 (대화 로그): `name`은 Layers 패널에 노출되는 범용 속성이라 불안정하고, `label`은 스크립팅 전용으로 설계된 메커니즘이라 더 안정적일 가능성이 높다는 결론. 다만 이 UXP 환경에서 `label` 접근이 실제로 되는지는 미검증이라는 점을 명시함
- 이를 검증하기 위해 `src/inspector.js`를 읽기 전용 그대로 개선: Text Frame과 Rectangle 각각에 `label`(Script Label) 값을 추가로 읽어 `Inspection Log`/콘솔에 출력 (`getLabelText()` 헬퍼 추가, `item.label` 접근 실패 시 에러 메시지를 그대로 표시하도록 try/catch 처리)
- Script Label에 값을 쓰는 코드, `name`을 바꾸는 코드, 자동조판 코드는 추가하지 않음
- InDesign 파일(원본/working) 수정 없음, Frame Name 실제 변경 없음
- `HANDOFF.md` 갱신: 현재 진행 중인 작업에 "자동화 식별자로 name 대신 label 사용 가능 여부 검증 중"을 추가, "완료된 기능"/"아직 테스트하지 못한 기능"/"알려진 문제"/"다음 추천 작업"에 label 관련 항목 반영 (1순위: 시작 페이지에서 Inspect Template 재실행해 label 출력 확인)

변경 파일:
- src/inspector.js
- HANDOFF.md
- WORKLOG.md

테스트:
- 없음. 이번에 추가한 `label` 출력은 아직 실제 InDesign에서 실행해보지 않았다. UDT에서 Reload 후 "시작 페이지"에서 `Inspect Template`을 다시 실행해 에러 없이 `label` 값(대부분 "(label 없음)"으로 예상)이 나오는지 확인하는 것이 다음 단계.

남은 문제:
- `item.label` 접근이 이 InDesign UXP 환경에서 에러 없이 되는지 미확인 (다음 실기 테스트로 확인 필요)
- label 접근이 확인되면, 자동화 식별자를 `name`/`label` 중 무엇으로 할지(또는 병행할지)를 DECISIONS.md에 아직 기록하지 않음 — 실기 확인 후 결정할 사항

---

## 2026-09-23 - 자동화 식별자 방식을 Script Label(label)로 결정

완료:
- 사용자가 실제 InDesign에서 "시작 페이지"의 Text Frame과 Rectangle 모두에 대해 `item.label`이 에러 없이 읽힘을 확인해 전달함
- `DECISIONS.md`에 D008 기록: 자동화 대상 프레임 식별은 `name` 대신 Script Label(`label`)을 1차 기준으로 사용한다. 근거로 (1) 실제 템플릿에서 `name`이 대부분 비어 있음을 실기로 확인한 사실, (2) `label`이 InDesign DOM에서 애초에 스크립트 전용으로 제공되는 메커니즘이라는 점, (3) 이번에 `label` 읽기가 실제 환경에서 에러 없이 동작함을 확인한 사실을 명시. 아직 결정되지 않은 것(Script Label 실제 부여 여부/방법, `insertLabel`/`extractLabel` 구조화 사용 여부, `name` 병행 여부)도 명확히 구분해 기록
- `HANDOFF.md` 갱신: 현재 단계에 "자동화 식별자 방식 결정 완료" 반영, `item.label` 읽기를 "실제 테스트 완료된 기능"으로 이동, "알려진 문제"를 "읽기는 확인됨, 쓰기는 미검증"으로 갱신
- `HANDOFF.md`에 "Script Label 부여 제안" 섹션 신규 추가: "시작 페이지" 두 변형의 프레임별 제안 Script Label 표(TITLE/POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE, 안내 문구 프레임은 부여 안 함)와 실행 방법 두 가지 후보((A) 사용자가 InDesign에서 직접 입력, (B) Claude Code가 1회성 스크립트로 부여) 제시. 어느 쪽으로 할지는 아직 결정되지 않았고, InDesign 파일을 수정하는 작업이므로 실행 전 사용자 승인이 필요함을 명시
- `WORKLOG.md`에 이번 작업 기록

이번 작업에서 하지 않은 것 (요청받은 범위 밖):
- working .indd에 실제로 Script Label 값을 쓰는 작업 (제안만 하고 실행하지 않음)
- Frame Name 실제 변경
- 자동조판 코드 구현

변경 파일:
- DECISIONS.md
- HANDOFF.md
- WORKLOG.md

테스트:
- 해당 없음 (문서화 작업만 진행, 코드/InDesign 파일은 수정하지 않음). 이번에 반영한 "label 읽기 확인" 결과는 사용자가 실제 InDesign에서 수행하고 전달한 테스트에 근거함.

남은 문제:
- Script Label 부여 실행 방식(A/B) 미결정 — 사용자 결정 대기
- 실제로 Script Label을 부여한 뒤 파일 저장/재오픈 후에도 값이 유지되는지는 아직 확인되지 않음

---

## 2026-09-23 - Script Label 기반 프레임 검증 기능 구현

완료:
- 사용자가 working .indd의 "시작 페이지" 두 변형에 Script Label을 실제로 부여함을 확인해 전달: 사진 있음(page.name=2) → TITLE/POINT_TEXT/BODY/HERO_IMAGE, 사진 없음(page.name=3) → TITLE/POINT_TEXT/BODY_COLUMN_1/BODY_COLUMN_2
- `src/validation.js` 신규 구현 (읽기 전용, InDesign API를 직접 호출하지 않고 `src/inspector.js`의 report만 입력으로 사용 — D009):
  - `OPENING_WITH_PHOTO`/`OPENING_WITHOUT_PHOTO` 두 프로필로 필수 Label과 기대 타입(TextFrame/Rectangle) 정의
  - `pickProfile()`: 페이지에 있는 Label 조합(BODY_COLUMN_1/2 유무, HERO_IMAGE/BODY 유무)으로 어느 변형인지 판별
  - `validateFrameLabels(report)`: 페이지별로 필수 Label이 정확히 1개씩 있는지(누락/중복 판정), 예상 타입과 일치하는지(타입 불일치 판정) 검사
  - `formatValidationReport()`: 페이지별로 `[OK]`/`[FAIL]` 표시, 누락/중복 시 실제로 발견된 프레임의 타입/name을 나열, 페이지별 "결과: 모두 정상" 또는 "N건 문제 발견" 요약
- `index.js`의 기존 `Inspect Template` 버튼 핸들러에서 `inspectDocument()` 결과로 `validateFrameLabels()`를 이어서 호출하고, 검증 결과를 기존 문서 분석 결과 뒤에 이어 붙여 같은 `Inspection Log`/콘솔에 출력 (새 버튼 추가하지 않음)
- `DECISIONS.md`에 D009 기록 (validation.js가 InDesign API를 직접 호출하지 않는 이유)
- `HANDOFF.md`에 Script Label이 실제로 부여됐다는 사실과 새 검증 기능을 반영: "완료된 기능"에 추가, "아직 테스트하지 못한 기능"에 이 기능 전체를 추가, "Script Label 부여 현황" 섹션으로 기존 제안 섹션을 대체, "알려진 문제"에 `pickProfile`의 휴리스틱 한계 기록
- `README.md`의 `Inspect Template` 설명과 `src/validation.js` 폴더 구조 설명, 실행 방법 8번을 갱신
- InDesign 문서/템플릿 파일 수정 없음, 기사 JSON 로딩·contents 변경·이미지 배치·Generate 자동조판 미구현 (요청받은 범위만 수행)

변경 파일:
- src/validation.js
- index.js
- README.md
- DECISIONS.md
- HANDOFF.md
- WORKLOG.md

테스트:
- 없음. 이번에 구현한 검증 기능은 아직 실제 InDesign에서 실행해보지 않았다. UDT에서 Reload 후 "시작 페이지" 두 변형에서 `Inspect Template`을 실행해 "결과: 모두 정상"이 나오는지 확인하는 것이 다음 단계.

남은 문제:
- Script Label 기반 검증 기능이 실제 InDesign에서 에러 없이 동작하는지, "정상" 판정이 실제로 나오는지 확인 필요
- `pickProfile`의 페이지 유형 판별 휴리스틱이 "시작 페이지" 외 다른 Template Type에서도 안전한지는 그 템플릿을 분석할 때 재검토 필요

---

## 2026-09-23 - Script Label 검증 실기 테스트 성공 확인 + 기사 JSON 데이터 계약 정의

완료:
- 사용자가 실제 InDesign에서 Script Label 기반 프레임 검증을 실행한 결과를 확인해 전달: page.name=2("시작 페이지 사진 있음")와 page.name=3("시작 페이지 사진 없음") 모두 필요한 Label이 전부 `[OK]`, "결과: 모두 정상"으로 나옴
- `HANDOFF.md`/`WORKLOG.md`에 이 성공 결과 반영: "실제 테스트 완료된 기능"으로 이동, "Script Label 부여 및 검증 현황" 표에 검증 결과 열 추가, "아직 테스트하지 못한 기능"에서 해당 항목 제거
- 자동조판 MVP용 기사 JSON 데이터 계약을 새 문서 `docs/ARTICLE_DATA_SPEC.md`에 정의:
  - 공통 필드: `templateType`(`"OPENING_PAGE"` 고정), `variant`(`"WITH_PHOTO"` | `"WITHOUT_PHOTO"`), `title`, `pointText` — 모두 Required(MVP 잠정)
  - `variant: "WITH_PHOTO"` 전용: `body`, `heroImage` — Required
  - `variant: "WITHOUT_PHOTO"` 전용: `bodyColumn1`, `bodyColumn2` — Required
  - 사진 있음/없음 구분은 `heroImage` 유무로 암묵 추측하지 않고 `variant` 필드로 명시하도록 결정(데이터 계약을 명확히 하기 위함)
  - 본문 2단 구성도 `body` 하나를 코드가 자동 분배하지 않고 `bodyColumn1`/`bodyColumn2` 두 필드로 명시적으로 받기로 결정(텍스트가 어디서 잘려야 자연스러운지는 InDesign이 실제 조판해봐야 알 수 있어 코드가 예측하기 어렵기 때문)
  - JSON 필드 ↔ Script Label 매핑표 작성 (title→TITLE, pointText→POINT_TEXT, body→BODY, heroImage→HERO_IMAGE, bodyColumn1→BODY_COLUMN_1, bodyColumn2→BODY_COLUMN_2)
- 샘플 파일 2개 신규 작성: `sample/opening-page-with-photo.json`, `sample/opening-page-without-photo.json`
- `docs/TEMPLATE_SPEC.md` 갱신: 상태 문구를 "Script Label 적용 및 검증 완료, JSON 데이터 계약 정의 완료"로 반영, "Template Type" 표의 "시작 페이지" 행에 자동화용 식별자 `OPENING_PAGE` 확정 기록, Frame 분석 워크시트의 "(후보)" 표시를 실제 적용/검증 완료를 반영해 "(적용됨)"으로 갱신, Data Field 열에 `docs/ARTICLE_DATA_SPEC.md`에서 확정한 필드명(pointText, bodyColumn1/2 등) 반영, 열 설명 갱신
- `HANDOFF.md`: 현재 단계/완료된 기능/진행 중인 작업/미구현 기능/알려진 문제/다음 추천 작업을 새 JSON 계약과 검증 성공 결과에 맞춰 갱신
- `README.md`: 기사 데이터 규격 섹션 신규 추가(`docs/ARTICLE_DATA_SPEC.md` 링크), 폴더 구조에 새 샘플 파일 2개 반영
- 이번 작업에서 하지 않은 것 (요청받은 범위 밖): `Load Article` 버튼의 실제 파일 선택, JSON 파일을 코드로 읽는 기능(`src/data.js`는 여전히 빈 스텁), InDesign `contents` 변경, 이미지 배치, `Generate` 자동조판. InDesign API나 동작을 추측해서 구현하지 않음 — 이번 작업은 데이터 계약/샘플 정의까지만 진행

변경 파일:
- docs/ARTICLE_DATA_SPEC.md (신규)
- sample/opening-page-with-photo.json (신규)
- sample/opening-page-without-photo.json (신규)
- docs/TEMPLATE_SPEC.md
- HANDOFF.md
- README.md
- WORKLOG.md

테스트:
- Script Label 검증 기능은 사용자가 실제 InDesign에서 실행해 "모두 정상"을 확인함 (2026-09-23, 사용자가 직접 수행). JSON 데이터 계약/샘플 파일 자체는 아직 코드로 읽거나 InDesign에 적용해본 적이 없음 — 문서와 샘플 데이터 정의만 진행했으므로 "코드 테스트"의 대상이 아직 없음.

남은 문제:
- 없음. 다음 단계(`src/data.js` JSON 로드 구현)는 이번 작업 범위 밖으로 HANDOFF.md "다음 추천 작업"에 남겨둠.

---

## 2026-09-23 - BODY_COLUMN_1/BODY_COLUMN_2 텍스트 스레드 연결 여부 읽기 전용 진단 추가

완료:
- 사용자가 InDesign UI에서 "텍스트 스레드 표시"를 켠 상태로도 BODY_COLUMN_1/BODY_COLUMN_2 사이에 연결선이 보이지 않는다고 보고 — 실제로 연결돼 있는지 코드로 읽기 전용 확인하는 기능 요청받음
- `src/inspector.js` 개선 (읽기 전용 그대로): `TextFrame.previousTextFrame`/`nextTextFrame`을 읽는 `getLinkedFrameInfo()` 추가. 연결 없음(null 또는 `isValid===false`)/읽기 에러/연결됨(연결된 프레임의 label·name) 세 가지 경우를 모두 방어적으로 처리. 모든 Text Frame의 리포트에 `previousFrame`/`nextFrame` 필드 추가, `formatReport()`에 "이전/다음 연결 프레임" 줄 출력 추가
- `src/validation.js` 개선: `collectLabeledFrames()`가 Text Frame의 `previousFrame`/`nextFrame`도 함께 옮기도록 확장, `checkFrameLink()` 신규 추가(두 label이 서로의 previous/next로 실제 연결돼 있는지 label 문자열 비교로 판정: 연결됨/연결 안 됨/일부만 연결됨/확인 불가), `OPENING_WITHOUT_PHOTO` 프로필에 `linkChecks: [{ fromLabel: "BODY_COLUMN_1", toLabel: "BODY_COLUMN_2", ... }]` 추가(`OPENING_WITH_PHOTO`는 해당 없어 빈 배열). `formatValidationReport()`가 link 검사 결과도 `[OK]`/`[FAIL]`로 출력하고, 페이지별 "결과: N건 문제 발견" 집계에도 포함
- `index.js`는 변경 없음 — 기존 `Inspect Template` 버튼 흐름에서 자동으로 새 검사가 함께 출력됨
- InDesign API를 새로 추가했지만 전부 읽기 전용(`previousTextFrame`/`nextTextFrame`은 속성 읽기만). 프레임을 실제로 연결하거나 수정하는 코드는 작성하지 않음. `docs/ARTICLE_DATA_SPEC.md`의 `bodyColumn1`/`bodyColumn2` 구조도 변경하지 않음
- `HANDOFF.md` 갱신: 현재 단계/완료된 기능/아직 테스트하지 못한 기능/알려진 문제/진행 중인 작업/다음 추천 작업에 이번 진단 기능과 실기 테스트 필요성 반영

변경 파일:
- src/inspector.js
- src/validation.js
- HANDOFF.md
- WORKLOG.md

테스트:
- 없음. `TextFrame.previousTextFrame`/`nextTextFrame`이 이 InDesign UXP 환경에서 실제로 노출되는지, BODY_COLUMN_1/BODY_COLUMN_2가 실제로 연결돼 있는지는 아직 실기로 확인되지 않았다. 사용자가 "사진 없는 시작 페이지"에서 `Inspect Template`을 다시 실행해 로그를 전달하면 확인 가능.

남은 문제:
- `previousTextFrame`/`nextTextFrame` 읽기 자체가 이 환경에서 에러 없이 되는지 확인 필요
- BODY_COLUMN_1 → BODY_COLUMN_2 연결 여부(사용자가 InDesign UI에서 연결선을 못 봤다고 보고한 것과 일치하는 결과가 나올지) 확인 필요

---

## 2026-09-23 - 텍스트 스레드 연결 확인 + JSON 데이터 계약 단순화 (bodyColumn1/2 → 단일 body)

완료:
- 사용자가 실제 InDesign에서 "BODY_COLUMN_1 → BODY_COLUMN_2 텍스트 스레드 연결" 검사를 실행한 결과를 확인해 전달: `BODY_COLUMN_1.nextTextFrame`=`BODY_COLUMN_2`, `BODY_COLUMN_2.previousTextFrame`=`BODY_COLUMN_1`, "결과: 모두 정상" — `previousTextFrame`/`nextTextFrame` 읽기 자체도 에러 없이 동작함을 확인. InDesign UI에 연결선이 안 보인다고 보고됐던 것과 달리 실제로는 연결돼 있었음
- 이 확인을 근거로 `docs/ARTICLE_DATA_SPEC.md`를 단순화: `bodyColumn1`/`bodyColumn2` 두 필드를 폐기하고, `WITH_PHOTO`/`WITHOUT_PHOTO` 두 variant 모두 공통으로 `templateType`/`variant`/`title`/`pointText`/`body`를 쓰도록 통일. `WITH_PHOTO`만 `heroImage`를 추가로 요구. `WITHOUT_PHOTO`의 `body`는 텍스트 스레드 시작 프레임인 `BODY_COLUMN_1`에만 쓰고 `BODY_COLUMN_2`는 직접 쓰지 않는다는 점을 명시(텍스트가 자동으로 흘러감)
- "왜 bodyColumn1/2 대신 body인가" 섹션을 문서에 추가해, 최초 설계 이유(코드가 텍스트를 어디서 자를지 예측 불가)와 이번에 바뀐 이유(텍스트 스레드가 이미 연결되어 있어 InDesign이 자동으로 흘려보냄)를 모두 기록
- `sample/opening-page-without-photo.json`을 `bodyColumn1`/`bodyColumn2` 구조에서 단일 `body` 구조로 갱신. `sample/opening-page-with-photo.json`은 이미 `body` 구조였으므로 변경 없음
- `docs/TEMPLATE_SPEC.md`의 Frame 분석 워크시트 갱신: BODY_COLUMN_1 행에 "Data Field: body, 이 프레임에만 쓴다"와 텍스트 스레드 연결 확인 사실 기록, BODY_COLUMN_2 행에 "직접 쓰지 않음, 텍스트 스레드로 자동 연결" 기록. "현재 상태" 도입부에도 이번 확인/단순화 내용 반영
- `DECISIONS.md`에 D010 기록: bodyColumn1/bodyColumn2 → 단일 body로 단순화한 결정과 근거, 그리고 아직 확인되지 않은 것(실제 `contents` 쓰기 시 스레드가 올바르게 작동하는지는 자동조판 구현 시점에 별도 검증 필요)을 명시
- `HANDOFF.md` 갱신: 현재 단계/완료된 기능/실제 테스트 완료된 기능/아직 테스트하지 못한 기능/알려진 문제/다음 추천 작업을 이번 확인과 단순화 결과에 맞춰 전체 갱신
- 이번 작업에서 하지 않은 것 (요청받은 범위 밖): JSON 파일을 실제로 읽는 코드, `contents` 변경, 이미지 배치, `Generate` 자동조판 — 전부 미구현 상태 유지. InDesign 파일도 수정하지 않음(데이터 계약/문서/샘플 정리만 진행)

변경 파일:
- docs/ARTICLE_DATA_SPEC.md
- docs/TEMPLATE_SPEC.md
- sample/opening-page-without-photo.json
- DECISIONS.md
- HANDOFF.md
- WORKLOG.md

테스트:
- 텍스트 스레드 연결 검사는 사용자가 실제 InDesign에서 실행해 "모두 정상"을 확인함 (2026-09-23, 사용자가 직접 수행). 데이터 계약 단순화/샘플 파일 갱신 자체는 문서·JSON 정리이므로 코드 테스트 대상이 아님.

남은 문제:
- `body`를 실제로 `BODY_COLUMN_1.contents`에 쓰는 코드는 아직 없어, 쓴 값이 실제로 `BODY_COLUMN_2`까지 올바르게 흐르는지는 자동조판 구현 단계에서 별도로 확인해야 함

---

## 2026-09-23 - Load Article: JSON 파일 선택/읽기/검증 구현

완료:
- `src/data.js` 신규 구현: `loadArticleFile()`이 `require("uxp").storage.localFileSystem.getFileForOpening()`으로 파일 선택 대화상자를 띄우고, 선택된 파일을 `Entry.read()`로 읽은 뒤 `JSON.parse` 시도. 취소/파일 읽기 실패/JSON 문법 오류/정상 로드 네 가지 상태를 구분해서 반환. `indesign` 모듈이 아니라 UXP 플랫폼 공통 `uxp` 모듈을 쓴 것은 파일 선택/읽기가 InDesign 고유 기능이 아니기 때문 (DECISIONS.md D011). `getFileForOpening()`의 파일 형식 필터(`types`)는 정확한 옵션 형태가 불확실해 생략하고, 형식 검증은 JSON.parse 실패로 대신 처리
- `src/validation.js`에 `validateArticleData(data)`/`formatArticleValidationReport(fileName, validation)` 추가: docs/ARTICLE_DATA_SPEC.md의 OPENING_PAGE 계약대로 templateType(="OPENING_PAGE" 여부)/variant(enum)/title/pointText/body 존재를 검사하고, variant가 정확히 "WITH_PHOTO"일 때만 heroImage 존재를 추가로 검사. 기존 Script Label 프레임 검증과 완전히 분리된 순수 데이터 검증(InDesign API 미사용)
- `index.js`의 `Load Article` 버튼 핸들러 구현: 파일 선택 → 읽기 → 파싱 → 검증까지 순서대로 실행하고, 각 실패 케이스(취소/읽기 실패/파싱 실패/검증 실패)를 구분해서 Status와 새로 추가한 `Article Log` 영역(`index.html`)에 표시. 검증을 통과한 데이터만 모듈 스코프 변수 `currentArticleData`에 보관(다른 기능과는 아직 연결하지 않음). 검증 실패 시 어떤 필드가 문제인지(`[FAIL] 필드명 - 사유`) 명확히 표시
- `index.html`에 `Article Log` `<pre>` 영역 추가, `articleFileName` 초기 텍스트를 "(선택된 파일 없음)"으로 변경
- `DECISIONS.md`에 D011 기록 (uxp storage 모듈 선택 이유, types 옵션 생략 이유)
- `README.md`/`HANDOFF.md` 갱신: `Load Article` 기능 설명, 폴더 구조의 `src/data.js` 상태, UDT 테스트 절차, 완료/미구현/알려진 문제/다음 추천 작업 반영
- 요청받은 범위만 구현: `TextFrame.contents` 변경, `BODY_COLUMN_1`에 body 입력, TITLE/POINT_TEXT 입력, 이미지 배치, `Generate` 자동조판, InDesign 문서 수정은 전혀 하지 않음 — 이번 코드는 로컬 파일을 읽고 메모리에서 검증하는 것까지만 수행하며 InDesign API를 전혀 호출하지 않음(indesign 모듈 require 없음)

변경 파일:
- src/data.js
- src/validation.js
- index.js
- index.html
- DECISIONS.md
- HANDOFF.md
- README.md
- WORKLOG.md

테스트:
- 없음. `require("uxp").storage.localFileSystem`을 이 프로젝트에서 처음 호출하는 코드라 실제 InDesign UXP 환경에서 파일 선택 대화상자가 뜨는지, 읽기가 되는지 전혀 검증되지 않았다. UDT에서 Reload 후 `Load Article` 버튼을 클릭해 확인하는 것이 다음 단계.

남은 문제:
- `require("uxp").storage.localFileSystem.getFileForOpening()`/`Entry.read()`가 이 환경에서 에러 없이 동작하는지 확인 필요
- 정상 케이스(`sample/opening-page-with-photo.json`, `sample/opening-page-without-photo.json`)와 실패 케이스(잘못된 JSON, 필드 누락) 모두 실기로 확인 필요

---

## 2026-09-23 - Load Article 실기 테스트 성공 확인 + 첫 자동조판 쓰기(TITLE만) 구현

완료:
- 사용자가 `sample/opening-page-with-photo.json`/`sample/opening-page-without-photo.json` 둘 다 `Load Article`로 불러와 실제 InDesign에서 "결과: 검증 통과"를 확인해 전달. `require("uxp").storage.localFileSystem`이 이 환경에서 정상 동작함을 확인. `HANDOFF.md`/`WORKLOG.md`의 "아직 테스트하지 못한 기능"에서 해당 항목을 "실제 테스트 완료된 기능"으로 이동
- `src/validation.js`에 `OPENING_PROFILES_BY_VARIANT`(variant 문자열 → 프로필) export 추가: 기존 `OPENING_WITH_PHOTO`/`OPENING_WITHOUT_PHOTO`를 그대로 재사용할 수 있게 함(읽기 전용 검증과 실제 쓰기 대상 판별이 같은 기준을 쓰도록)
- `src/text.js` 신규 구현: `applyTitleOnly(articleData)`
  - `collectLiveLabeledItems(page)`: 페이지의 Text Frame/Rectangle을 label별로 묶되 실제 InDesign 객체 참조를 보관(읽기 전용 report가 아님)
  - `findTitleFrameForVariant(doc, variant)`: `OPENING_PROFILES_BY_VARIANT`에서 variant에 필요한 Script Label 목록을 가져와, 그 Label을 모두 가진 페이지를 문서에서 찾음. 페이지가 0개/2개 이상이면 Error. 찾은 페이지에서 TITLE Label 프레임이 0개/2개 이상/TextFrame이 아니면 Error
  - `applyTitleOnly`: `currentArticleData` 존재, `templateType === "OPENING_PAGE"`, `title` 존재를 먼저 확인한 뒤, 대상 페이지 탐색과 TITLE `contents` 쓰기를 하나의 `app.doScript` 콜백 안에서 함께 수행(탐색을 doScript 밖에서 먼저 하는 방식은 검증되지 않아 피함 — DECISIONS.md D012)
- `index.js`의 `Generate` 버튼 핸들러 재작성: 기존 `addHelloText()` 호출 제거, `currentArticleData`가 없으면 문서를 건드리지 않고 즉시 중단(Status에 사유 표시), 있으면 `applyTitleOnly()` 호출 후 성공/실패를 Status와 콘솔에 표시. `src/indesign.js`의 `addHelloText` 함수 자체는 삭제하지 않고 `Generate`와의 연결만 끊음(D012)
- `DECISIONS.md`에 D012 기록: 대상 페이지 판별에 Script Label 프로필을 재사용하는 이유, 탐색+쓰기를 하나의 doScript로 묶은 이유, addHelloText를 삭제 대신 연결만 끊은 이유
- `README.md`/`HANDOFF.md` 갱신: `Generate`의 새 동작, 안전 검사 목록, 테스트 절차, 완료/미구현/알려진 문제 반영
- 요청받은 범위만 구현: POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력, HERO_IMAGE 이미지 배치, 페이지 생성/복제, PDF Export는 전혀 구현하지 않음

변경 파일:
- src/text.js (신규)
- src/validation.js
- index.js
- DECISIONS.md
- HANDOFF.md
- README.md
- WORKLOG.md

테스트:
- `Load Article` 정상 케이스는 사용자가 실제 InDesign에서 확인함(2026-09-23, 사용자가 직접 수행). `Generate`의 TITLE 자동 입력 기능은 이번에 코드만 작성했고 아직 실제 InDesign에서 실행해본 적이 없다 — InDesign 문서를 실제로 수정하는 이 프로젝트의 첫 코드이므로 실기 테스트 전까지는 성공으로 기록하지 않는다.

남은 문제:
- `applyTitleOnly()`가 실제 InDesign에서 에러 없이 동작하는지, WITH_PHOTO/WITHOUT_PHOTO 각각에서 올바른 페이지만 바뀌고 반대쪽은 그대로인지 확인 필요
- 안전 검사 실패 케이스(Article 미로드, TITLE 없음/중복 등)에서 문서가 실제로 수정되지 않는지 확인 필요
- doScript 콜백 안에서 여러 페이지를 순회하며 읽기 작업을 하는 패턴 자체가 이 프로젝트에서 처음이라 미검증

---

## 2026-09-23 - TITLE 자동 입력 실기 테스트 성공 확인

완료:
- 사용자가 실제 InDesign에서 TITLE 자동 입력 기능을 두 variant 모두 테스트한 결과를 확인해 전달:
  - `opening-page-with-photo.json` Load Article 검증 통과 → Generate 실행 → "사진 있는 시작 페이지"의 TITLE만 JSON의 `title`로 변경됨, "사진 없는 시작 페이지"의 TITLE은 변경되지 않음, POINT_TEXT/BODY/HERO_IMAGE 등 다른 요소도 변경되지 않음
  - `opening-page-without-photo.json` Load Article 검증 통과 → Generate 실행 → "사진 없는 시작 페이지"의 TITLE만 변경됨, "사진 있는 시작 페이지"의 TITLE은 변경되지 않음, 다른 요소도 변경되지 않음
  - 안전 검사 실패 케이스(Article 미로드 등)는 이번에 테스트되지 않음
- `HANDOFF.md` 갱신: 현재 단계를 "첫 자동조판 쓰기(TITLE) 실기 테스트 성공"으로 반영. "완료된 기능"의 `applyTitleOnly` 항목을 실기 검증 완료로 갱신. "실제 테스트 완료된 기능"에 이번 결과를 상세히 추가(어느 페이지가 바뀌고 어느 페이지가 안 바뀌었는지, 다른 요소는 그대로였는지 모두 기록). "아직 테스트하지 못한 기능"에서 TITLE 관련 일반 항목을 제거하고, 아직 확인 안 된 안전 검사 실패 경로만 남김. "미구현 기능"의 `src/text.js` 설명에서 "(미검증)" 제거. "알려진 문제"의 D012 관련 항목을 "패턴 자체는 실기 확인됨, 예외 경로만 미확인"으로 갱신. "다음 추천 작업"에서 완료된 테스트 항목 제거, 안전 검사 테스트를 선택 항목으로 낮추고 POINT_TEXT/BODY 구현을 다음 우선순위로 승격
- `WORKLOG.md`에 이번 확인 결과 기록

변경 파일:
- HANDOFF.md
- WORKLOG.md

테스트:
- Claude Code가 직접 실행한 테스트는 없음(문서화 작업만 수행). 문서에 반영한 TITLE 자동 입력 성공 결과는 사용자가 실제 InDesign에서 수행하고 전달한 테스트에 근거함.

남은 문제:
- 안전 검사 실패 케이스(Article 미로드, TITLE 없음/중복/타입 불일치)는 아직 실기로 확인되지 않음
- POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과 HERO_IMAGE 배치는 아직 구현 전

---

## 2026-09-28 - POINT_TEXT 자동 입력 추가 (TITLE 패턴 재사용)

완료:
- `src/text.js`에 `applyPointTextOnly(articleData)` 신규 구현: `currentArticleData.pointText`를 POINT_TEXT Script Label Text Frame의 `contents`에 채운다. `applyTitleOnly`와 완전히 같은 패턴(검사 → `app.doScript` 안에서 대상 페이지/프레임 탐색 → `contents` 대입)
- 기존 `findTitleFrameForVariant(doc, variant)`를 `findLabeledFrameForVariant(doc, variant, targetLabel, expectedType)`로 일반화하고, `findTitleFrameForVariant`/`findPointTextFrameForVariant`는 이 함수를 각각 `("TITLE", "TextFrame")`/`("POINT_TEXT", "TextFrame")`로 호출하는 얇은 래퍼로 재작성. TITLE의 실행 경로·에러 메시지는 그대로 유지됨(로직 변경 없이 파라미터화만 함)
- 안전 검사(TITLE과 동일한 5가지 기준을 POINT_TEXT에도 적용): (1) `currentArticleData` 없음, (2) `templateType`이 OPENING_PAGE가 아니거나 `pointText` 없음, (3) variant에 필요한 Script Label을 모두 가진 페이지가 0개/2개 이상, (4) 대상 페이지에 POINT_TEXT Label 프레임이 0개/2개 이상, (5) POINT_TEXT가 TextFrame이 아님. 모두 통과해야만 POINT_TEXT를 쓴다
- `index.js`의 `Generate` 핸들러 갱신: `applyTitleOnly` 성공 후 이어서 `applyPointTextOnly` 호출, Status에 TITLE/POINT_TEXT 둘 다 입력된 값을 표시
- `DECISIONS.md`에 D013 기록: 탐색 로직을 공유 함수로 일반화한 이유, TITLE 동작이 바뀌지 않았다고 판단하는 근거, `apply*Only` 함수를 필드별로 독립시킨 이유
- `HANDOFF.md`/`WORKLOG.md` 갱신: 현재 단계, 완료된 기능, 아직 테스트하지 못한 기능(POINT_TEXT 전체 미검증 명시), 진행 중인 작업, 미구현 기능, 알려진 문제(리팩터링 이후 TITLE 재확인 필요 포함), 다음 추천 작업을 반영
- 요청받은 범위만 구현: BODY, BODY_COLUMN_1, BODY_COLUMN_2, HERO_IMAGE는 이번에도 구현/수정하지 않음. 기존 TITLE 기능은 유지(호출부 시그니처 동일)

변경 파일:
- src/text.js
- index.js
- DECISIONS.md
- HANDOFF.md
- WORKLOG.md

테스트:
- 없음. `applyPointTextOnly()`와 리팩터링된 탐색 로직 모두 아직 실제 InDesign에서 실행해본 적이 없다. **이번 작업은 실기 테스트 전이므로 문서에 "성공"으로 기록하지 않았다.**

남은 문제:
- `applyPointTextOnly()`가 실제 InDesign에서 에러 없이 동작하는지, WITH_PHOTO/WITHOUT_PHOTO 각각에서 올바른 페이지의 POINT_TEXT만 바뀌고 다른 요소·반대쪽 페이지는 그대로인지 확인 필요
- 탐색 로직 일반화(`findLabeledFrameForVariant`) 이후 TITLE 기능이 여전히 기존과 동일하게 동작하는지 재확인 필요 (이 리팩터링 이후 TITLE을 실기로 다시 테스트한 적 없음)
- 안전 검사 실패 케이스(Article 미로드, POINT_TEXT 없음/중복/타입 불일치)는 아직 실기로 확인되지 않음

---

## 2026-09-28 - POINT_TEXT 실기 테스트 성공 확인 + TITLE 재확인 + Generate 원자성 분석

완료:
- 사용자가 실제 InDesign에서 POINT_TEXT 자동 입력(및 리팩터링 이후 TITLE)을 두 variant 모두 테스트한 결과를 확인해 전달:
  - WITH_PHOTO: TITLE 정상 변경, POINT_TEXT 정상 변경, BODY 변화 없음, HERO_IMAGE 변화 없음, WITHOUT_PHOTO 페이지 변화 없음
  - WITHOUT_PHOTO: TITLE 정상 변경, POINT_TEXT 정상 변경, BODY_COLUMN_1/BODY_COLUMN_2 변화 없음, WITH_PHOTO 페이지 변화 없음
  - 이 결과로 `findLabeledFrameForVariant` 일반화(D013) 이후 TITLE도 문제없이 동작함이 함께 재확인됨 — 이전 엔트리의 "TITLE 재확인 필요" 남은 문제가 해소됨
  - 안전 검사 실패 케이스(Article 미로드, Label 없음/중복, 타입 불일치)는 이번에도 테스트되지 않음
- `HANDOFF.md` 갱신: 현재 프로젝트 단계, "완료된 기능"의 POINT_TEXT 항목을 실기 검증 완료로 갱신, "실제 테스트 완료된 기능"에 이번 결과 상세 추가 및 기존 TITLE 단독 테스트 항목의 "주의" 문구 제거, "아직 테스트하지 못한 기능"에서 POINT_TEXT 전체 미검증 항목을 제거하고 "부분 반영 재현 여부 미확인" 항목으로 대체, "진행 중인 작업"을 BODY/HERO_IMAGE 착수 전 상태로 갱신, "미구현 기능"의 `src/text.js` 설명에서 "미검증" 제거, "알려진 문제"의 D013 관련 항목을 재확인 완료로 갱신하고 `Generate` 순차 쓰기의 부분 반영(원자성) 위험을 분석 결과로 새로 기록, "다음 추천 작업"에서 완료된 테스트 항목을 제거하고 BODY/BODY_COLUMN_1 구현을 1순위로 승격, 원자성 문제 대응 방향 결정을 선택 항목으로 추가
- BODY와 HERO_IMAGE는 이번에도 구현/수정하지 않음 (요청 범위 유지)
- `Generate`가 `applyTitleOnly()` 후 `applyPointTextOnly()`를 순차 실행하는 구조가 "검증 실패 시 문서를 수정하지 않는다" 원칙과 충돌 가능한지 분석(코드 변경 없음, 사용자 요청에 따른 분석만): 각 `apply*Only` 함수는 필드 단위로는 안전하지만(자신의 안전 검사를 통과해야만 씀), 서로 별개의 `app.doScript`/Undo 트랜잭션이라 TITLE 성공 후 POINT_TEXT의 검증이 실패하면 문서는 "TITLE만 반영된" 부분 상태로 남을 수 있음 — 필드별 원자성은 보장되지만 `Generate` 클릭 전체의 원자성은 보장되지 않음. BODY/HERO_IMAGE가 추가될수록 위험 범위가 커짐. 수정 여부/방향은 이번에 결정하지 않음

변경 파일:
- HANDOFF.md
- WORKLOG.md

테스트:
- Claude Code가 직접 실행한 테스트는 없음(문서화 및 분석 작업만 수행). 문서에 반영한 POINT_TEXT/TITLE 성공 결과는 사용자가 실제 InDesign에서 수행하고 전달한 테스트에 근거함.

남은 문제:
- 안전 검사 실패 케이스(Article 미로드, Label 없음/중복/타입 불일치)는 아직 실기로 확인되지 않음
- `Generate`의 부분 반영(원자성) 위험은 분석만 했을 뿐, 실기로 재현하거나 코드로 대응한 적은 없음 — BODY 구현 전에 대응 방향을 결정할지 검토 필요
- BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과 HERO_IMAGE 배치는 아직 구현 전

---

## 2026-09-28 - Generate 부분 반영 위험 감소: TITLE+POINT_TEXT를 하나의 doScript로 통합 (D014)

완료:
- 사용자가 위 엔트리의 원자성 분석을 근거로, BODY 구현에 앞서 `Generate`의 부분 반영 위험을 줄이는 구조 변경을 TITLE+POINT_TEXT 범위로 한정해 요청함(목표: (1) 실제 문서 수정 전 TITLE·POINT_TEXT 검증을 모두 끝낼 것, (2) 검증 중 하나라도 실패하면 둘 다 수정하지 않을 것, (3) 모두 통과한 뒤에만 쓸 것, (4) 기존 WITH_PHOTO/WITHOUT_PHOTO 동작 유지, (5) BODY/HERO_IMAGE는 건드리지 않을 것, (6) Script Label 식별 방식 유지, (7) 탐색/검증과 쓰기 단계 분리, (8) 하나의 Generate가 Undo 관점에서도 하나의 작업이 되도록 검토)
- `src/text.js`: `applyTitleOnly()`/`applyPointTextOnly()`(독립된 `app.doScript` 2개) 제거, `applyTitleAndPointText(articleData)` 하나로 통합. 데이터 존재 검사(articleData/templateType/title/pointText)는 doScript 밖에서 먼저 수행. 단 하나의 `app.doScript` 콜백 안에서 (1) `findTitleFrameForVariant`/`findPointTextFrameForVariant`로 두 프레임을 모두 먼저 탐색(탐색 단계, 아직 아무것도 안 씀) → (2) 탐색이 둘 다 성공했을 때만 `titleFrame.contents`/`pointTextFrame.contents`를 순서대로 대입(쓰기 단계). 탐색 함수 자체(`findLabeledFrameForVariant` 등)와 Script Label 식별 방식(D008)은 전혀 바꾸지 않음
- `index.js`: `Generate` 핸들러가 `applyTitleOnly`+`applyPointTextOnly` 두 번 호출하던 것을 `applyTitleAndPointText` 한 번 호출로 변경. Status 메시지도 "TITLE + POINT_TEXT 검증 및 입력 중..." 하나로 통합
- `DECISIONS.md`에 D014 기록: 문제 상황(D013 이후 실기 테스트에서 겉으로는 드러나지 않았지만 구조적으로 존재하던 부분 반영 위험), 해결 방식(탐색 전부 → 쓰기 전부, 하나의 doScript), 이 변경이 없애지 못하는 남은 이론적 위험(두 번째 `contents` 대입이 첫 번째 성공 이후 실패하는 경우의 자동 롤백 여부는 미검증), `applyTitleOnly`/`applyPointTextOnly`를 남기지 않고 삭제한 이유(재사용 시 같은 문제 재현 위험). D013 항목에도 "이 부분은 D014에서 변경됨" 상호 참조 추가
- `HANDOFF.md` 갱신: 현재 프로젝트 단계, 서술형 이력에 이번 리팩터링 경위 추가, "완료된 기능"의 POINT_TEXT 관련 두 항목(이전 구조 실기 검증 완료 + 새 구조 코드 작성 완료·미검증)으로 분리, "실제 테스트 완료된 기능"의 TITLE+POINT_TEXT 항목에 "이 테스트는 리팩터링 이전 구조 기준" 주의 문구 추가, "아직 테스트하지 못한 기능"에 `applyTitleAndPointText()` 정상/실패 케이스 실기 확인 필요 항목 추가, "진행 중인 작업"·"미구현 기능" 갱신, "알려진 문제"의 원자성 항목을 "D014로 구조적 해결 시도, 실기 검증 전"으로 갱신(남은 이론적 위험 명시), "다음 추천 작업" 1순위를 D014 실기 테스트(정상 케이스 + 부분 반영 재현 여부를 확인하는 실패 케이스)로 재편하고 BODY는 그 다음으로 유지
- `README.md` 갱신: 기사 데이터 규격 설명과 UDT 실행 절차(7번)에 POINT_TEXT/`applyTitleAndPointText`/D014를 반영 (기존에 `pointText` 미구현으로 남아있던 서술의 누락도 함께 바로잡음)
- 요청받은 범위만 구현: BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE는 건드리지 않음. push는 요청 전까지 하지 않음

변경 파일:
- src/text.js
- index.js
- DECISIONS.md
- HANDOFF.md
- README.md
- WORKLOG.md

테스트:
- 없음. `applyTitleAndPointText()`는 아직 실제 InDesign에서 한 번도 실행해본 적이 없다. **이번 작업은 실기 테스트 전이므로 문서에 "성공"으로 기록하지 않았다.** 이전에 실기 검증됐던 `applyTitleOnly`/`applyPointTextOnly` 기준 테스트 결과는 문서에 그대로 남기되, 이번 리팩터링 이후 코드에는 적용되지 않는다는 점을 명시했다.

남은 문제:
- `applyTitleAndPointText()`의 정상 케이스(WITH_PHOTO/WITHOUT_PHOTO 각각 TITLE+POINT_TEXT 정상 반영)와 실패 케이스(POINT_TEXT 탐색 실패 시 TITLE도 전혀 반영되지 않음, Undo 한 번으로 전체가 되돌아감)를 실제 InDesign에서 확인 필요
- doScript 콜백 안에서 `titleFrame.contents` 대입 이후 `pointTextFrame.contents` 대입이 실패하는 극단적 경우, `UndoModes.ENTIRE_SCRIPT`가 이미 실행된 대입을 자동 롤백하는지는 여전히 미검증(이론적 위험으로만 문서화)
- 안전 검사 실패 케이스(Article 미로드 등)는 여전히 실기로 확인되지 않음
- BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과 HERO_IMAGE 배치는 아직 구현 전 — D014 검증 후 이 패턴을 BODY까지 확장할지 여부도 그때 결정

---

## 2026-09-28 - applyTitleAndPointText(D014) 실기 테스트 성공 확인 (정상 + 실패 케이스)

완료:
- 사용자가 실제 InDesign에서 `applyTitleAndPointText()`를 정상 케이스와 실패 케이스 모두 테스트한 결과를 확인해 전달:
  - 정상 케이스: WITH_PHOTO는 TITLE 정상 변경, POINT_TEXT 정상 변경, BODY 변화 없음, HERO_IMAGE 변화 없음, 반대 variant 변화 없음. WITHOUT_PHOTO는 TITLE 정상 변경, POINT_TEXT 정상 변경, BODY_COLUMN_1/BODY_COLUMN_2 변화 없음, 반대 variant 변화 없음
  - 실패 케이스: WITH_PHOTO의 POINT_TEXT Script Label을 임시로 변경한 뒤 Generate 실행 → "필요한 Script Label을 가진 페이지를 찾지 못했다"는 오류로 Generate 중단 → TITLE도 변경되지 않음, POINT_TEXT/BODY/HERO_IMAGE도 변경되지 않음. 테스트 후 POINT_TEXT Script Label은 정상 값으로 복구
  - 이 결과로 D014가 목표한 "TITLE·POINT_TEXT 검증 실패 시 Generate 클릭 전체에서 아무것도 쓰이지 않는다"가 실기로 확인됨 — D013 이후 알려진 문제로 기록됐던 부분 반영 위험이 이 구조 변경으로 실제로 해소됨
  - 이 실패 케이스는 `findLabeledFrameForVariant`가 "variant에 필요한 Script Label을 모두 가진 페이지"를 찾는 탐색 단계에서 막힌 것이며, "두 번째 `contents` 대입이 첫 번째 성공 이후 실패하는" 이론적 시나리오를 재현한 것은 아님 — 그 부분은 여전히 미검증으로 남음
- `DECISIONS.md`의 D014에 실기 검증 완료 기록 추가(정상/실패 케이스 결과, 남은 미검증 시나리오 명시)
- `HANDOFF.md` 갱신: 현재 프로젝트 단계(D014 실기 검증 완료 + 다음 작업은 BODY로 명시), 서술형 이력에 이번 테스트 결과와 실패 케이스가 코드 구조와 일치하는 이유 추가, "완료된 기능"의 D014 항목을 실기 검증 완료로 갱신, "실제 테스트 완료된 기능"에 D014 통합 구조 기준 테스트 결과 항목 추가(이전 두 doScript 구조 테스트 항목은 그대로 유지하되 "이후 항목이 새 구조 결과" 안내 추가), "아직 테스트하지 못한 기능"에서 `applyTitleAndPointText()` 전체 미검증 항목을 제거하고 Undo 단위 확인/이론적 롤백 시나리오 항목으로 대체, "진행 중인 작업"을 "다음은 BODY" 상태로 갱신, "미구현 기능"의 `src/text.js` 설명에서 미검증 문구 제거, "알려진 문제"의 D014 항목을 실기 검증 완료로 갱신(남은 이론적 위험은 유지), "다음 추천 작업" 1순위를 BODY/BODY_COLUMN_1 구현으로 승격(D014 테스트 항목 제거)
- BODY와 HERO_IMAGE는 이번에도 구현/수정하지 않음(요청대로 문서화만 진행)
- 다음 작업을 BODY 자동 입력으로 확정(사용자 지정) — 아직 시작하지 않음

변경 파일:
- DECISIONS.md
- HANDOFF.md
- WORKLOG.md

테스트:
- Claude Code가 직접 실행한 테스트는 없음(문서화 작업만 수행). 문서에 반영한 D014 정상/실패 케이스 성공 결과는 사용자가 실제 InDesign에서 수행하고 전달한 테스트에 근거함.

남은 문제:
- doScript 콜백 안에서 `titleFrame.contents` 대입 이후 `pointTextFrame.contents` 대입이 실패하는 극단적 경우의 자동 롤백 여부는 여전히 미검증(이번 실패 케이스는 이 시나리오를 재현한 것이 아님)
- `applyTitleAndPointText()` 성공 후 Undo(Ctrl+Z) 한 번으로 TITLE+POINT_TEXT 전체가 함께 되돌아가는지는 아직 별도로 확인되지 않음
- 안전 검사 실패 케이스(Article 미로드 등)는 여전히 실기로 확인되지 않음
- BODY(WITH_PHOTO)/BODY_COLUMN_1(WITHOUT_PHOTO) 자동 입력이 다음 작업으로 확정됨 — 아직 구현 시작 전

---

## 2026-09-28 - BODY 자동 입력을 기존 단일 doScript 흐름에 추가 (D015)

완료:
- 사용자가 BODY 자동 입력을 요청하면서, `applyBodyOnly` 같은 별도 트랜잭션을 만들지 말고 D014의 TITLE+POINT_TEXT 단일 검증/쓰기 흐름에 BODY까지 포함시켜 달라고 명시적으로 지정함(목표: (1) 실제 수정 전 TITLE/POINT_TEXT/BODY 검증을 모두 끝낼 것, (2) 검증 중 하나라도 실패하면 셋 다 수정하지 않을 것, (3) 모두 통과한 뒤에만 같은 doScript 안에서 쓸 것). WITH_PHOTO는 BODY Script Label 존재/타입 확인 후 `contents`에 입력, WITHOUT_PHOTO는 BODY_COLUMN_1/BODY_COLUMN_2가 각각 정확히 1개·TextFrame인지 확인하고 텍스트 스레드 연결까지 쓰기 전에 확인한 뒤 `body` 전체를 BODY_COLUMN_1에만 한 번 입력(BODY_COLUMN_2는 직접 쓰지 않고 InDesign 텍스트 스레드로 자동 유입되게 함). HERO_IMAGE, Overset 처리, 페이지 추가, JSON 계약 변경(`bodyColumn1`/`bodyColumn2` 필드 추가 등)은 이번 범위에서 제외
- `src/inspector.js`: `getLinkedFrameInfo`를 `module.exports`에 추가(로직 변경 없음) — Inspect Template에서 이미 실기로 확인된 `nextTextFrame`/`previousTextFrame` 읽기 로직을 텍스트 스레드 연결 확인에 재사용하기 위함
- `src/text.js`: `findBodyFrameForVariant`/`findBodyColumn1FrameForVariant`/`findBodyColumn2FrameForVariant`(기존 `findLabeledFrameForVariant` 재사용, D013과 같은 패턴) 추가. `verifyBodyColumnsLinked(bodyColumn1Frame, bodyColumn2Frame)` 신규 구현: `getLinkedFrameInfo`로 정방향(`nextTextFrame`)·역방향(`previousTextFrame`)이 서로를 가리키는지 label 기준으로 확인, 하나라도 안 되면 Error. `applyTitleAndPointText()`를 `applyOpeningPageTextContent()`로 이름을 바꾸고, 기존 "탐색 전부 → 쓰기 전부" 단일 `app.doScript` 콜백 안에 BODY 탐색/검증과 쓰기를 그대로 포함시킴 — TITLE·POINT_TEXT 탐색 뒤 variant에 따라 분기(WITH_PHOTO는 BODY 탐색, WITHOUT_PHOTO는 BODY_COLUMN_1/2 탐색+연결 확인)하고, 이 모든 탐색/검증이 성공했을 때만 TITLE/POINT_TEXT/BODY(또는 BODY_COLUMN_1) 세 곳에 순서대로 씀. articleData의 `body` 존재 검사(doScript 밖, 순수 데이터 검사)도 추가
- `index.js`: `applyTitleAndPointText` → `applyOpeningPageTextContent` 이름 변경 반영, Status 메시지에 BODY 포함(전체 내용 대신 글자 수만 표시)
- `DECISIONS.md`에 D015 기록: BODY를 별도 트랜잭션으로 분리하지 않은 이유, 탐색 함수 재사용 근거, 텍스트 스레드 연결 확인을 쓰기 전에 넣은 이유, 함수 개명 이유, 이번 결정이 없애지 못하는 위험(두 번째 `.contents` 대입 실패 시 자동 롤백 여부는 여전히 미검증, `getLinkedFrameInfo`를 쓰기 경로에서 호출하는 것 자체가 이번이 처음), 범위에서 명시적으로 제외한 것(HERO_IMAGE/Overset/페이지 추가/JSON 계약 변경)
- `HANDOFF.md` 갱신: 현재 프로젝트 단계, 서술형 이력에 BODY 추가 경위 서술, "완료된 기능"에 BODY 항목 추가(미검증 명시) 및 기존 D014 항목에 함수 개명 각주 추가, "실제 테스트 완료된 기능"의 D014 테스트 항목에 "BODY 추가 전 코드 기준" 주의 문구 추가, "아직 테스트하지 못한 기능"에 BODY 정상/실패 케이스 및 `getLinkedFrameInfo` 쓰기 경로 최초 호출 항목 추가, "진행 중인 작업"·"미구현 기능"·"알려진 문제" 갱신(D015 신규 항목), "다음 추천 작업" 1순위를 D015 실기 테스트(정상 케이스 2개 + 실패 케이스, 텍스트 스레드 확인 포함)로 재편
- `README.md` 갱신: 기사 데이터 규격 설명과 UDT 실행 절차(7번)에 BODY/`applyOpeningPageTextContent`/D015를 반영
- HERO_IMAGE는 이번에도 구현/수정하지 않음(요청 범위 유지)

변경 파일:
- src/inspector.js
- src/text.js
- index.js
- DECISIONS.md
- HANDOFF.md
- README.md
- WORKLOG.md

테스트:
- 없음. `applyOpeningPageTextContent()`의 BODY 부분(`findBodyFrameForVariant` 등, `verifyBodyColumnsLinked`)은 아직 실제 InDesign에서 한 번도 실행해본 적이 없다. **이번 작업은 실기 테스트 전이므로 문서에 "성공"으로 기록하지 않았다.** TITLE+POINT_TEXT 범위는 이전 엔트리(D014)에서 이미 실기 검증된 상태이며 이번 변경으로 그 실행 경로 자체는 바뀌지 않았다고 판단하지만, 함수 개명과 새 분기 추가 이후 재확인된 적은 없다.

남은 문제:
- WITH_PHOTO/WITHOUT_PHOTO 각각의 BODY 정상 케이스(특히 `body`가 BODY_COLUMN_1 → BODY_COLUMN_2로 실제로 흐르는지)를 실제 InDesign에서 확인 필요
- BODY/BODY_COLUMN_1/BODY_COLUMN_2 관련 검사 실패 시 TITLE/POINT_TEXT도 전혀 반영되지 않는지(부분 반영 재현 여부) 확인 필요
- `getLinkedFrameInfo()`를 doScript 쓰기 경로(live 객체)에서 호출하는 것이 읽기 전용 경로와 동일하게 동작하는지 미확인
- 두 번째 `.contents` 대입이 첫 번째 성공 이후 실패하는 극단적 경우의 자동 롤백 여부는 여전히 미검증(D014부터 이어지는 이론적 위험)
- HERO_IMAGE 이미지 배치는 아직 구현 전

---

## 2026-09-28 - BODY(D015) 실기 테스트 성공 확인: 정상 케이스 + Text Thread + 실패 원자성

완료:
- 사용자가 실기 테스트용 샘플 [sample/opening-page-without-photo-long-test.json](sample/opening-page-without-photo-long-test.json)을 요청해 추가함: 기존 `sample/opening-page-without-photo.json`을 복사해 `templateType`/`variant`/`title`/`pointText`는 동일하게 유지하고 `body`만 같은 문단을 약 22회 반복해 약 3,995자로 늘림 — BODY_COLUMN_1이 다 담지 못하고 BODY_COLUMN_2로 넘쳐 흐르는지 확인하기 위한 실기 테스트 전용 파일(제품 코드/데이터 계약 변경 없음)
- 사용자가 실제 InDesign에서 `applyOpeningPageTextContent()`(D015)를 정상 케이스·Text Thread·실패 원자성까지 모두 테스트한 결과를 확인해 전달:
  - WITH_PHOTO 정상 케이스(`opening-page-with-photo.json`): TITLE·POINT_TEXT·BODY 모두 정상 반영, HERO_IMAGE·WITHOUT_PHOTO 페이지는 변화 없음
  - WITHOUT_PHOTO 정상 케이스 + Text Thread(`opening-page-without-photo-long-test.json`): TITLE·POINT_TEXT 정상 반영, `body` 전체가 BODY_COLUMN_1에 입력된 뒤 넘친 분량이 기존 텍스트 스레드를 통해 BODY_COLUMN_2까지 실제로 이어지는 것을 육안으로 확인(BODY_COLUMN_2에 별도 입력 없음), WITH_PHOTO 페이지는 변화 없음 — 이 결과로 `verifyBodyColumnsLinked()`(`getLinkedFrameInfo()`의 doScript 쓰기 경로 호출)도 함께 정상 동작함이 확인됨
  - 실패 케이스(원자성): WITH_PHOTO의 BODY Script Label을 `BODY` → `BODY_TEMP`로 임시 변경한 뒤 Generate 실행 → Generate 중단, TITLE/POINT_TEXT/BODY/HERO_IMAGE 전부 변화 없음을 확인 — BODY 검증 실패 시 TITLE/POINT_TEXT의 부분 반영도 없음이 확인됨. 다만 이때 Status에 표시된 정확한 오류 메시지 문자열은 기록되지 않아, 동작(Generate 중단·무변경)만 문서에 반영하고 메시지 문구는 단정하지 않음
  - 테스트 후 `BODY_TEMP` → `BODY` 복구 완료, BODY_COLUMN_1 → BODY_COLUMN_2 텍스트 스레드도 정상 상태 유지 확인, working .indd 정상 구조로 복구 완료
  - 이 테스트에서 다루지 않은 것: WITHOUT_PHOTO 쪽 실패 케이스(BODY_COLUMN_1/BODY_COLUMN_2 Script Label 변경, 또는 텍스트 스레드 연결을 직접 끊는 경우)는 테스트되지 않음 — 실패 유도는 WITH_PHOTO의 BODY Script Label 변경 한 가지로만 이루어짐
- `DECISIONS.md`의 D015에 실기 검증 완료 기록 추가(정상/Text Thread/실패 케이스 결과, 다루지 않은 시나리오 명시)
- `HANDOFF.md` 갱신: 현재 프로젝트 단계(D015 실기 검증 완료 + 다음 작업은 HERO_IMAGE로 명시), 서술형 이력에 이번 테스트 결과와 실기 테스트 전용 샘플 추가 경위 서술, "완료된 기능"의 BODY 항목을 실기 검증 완료로 갱신, "실제 테스트 완료된 기능"에 D015 통합 구조 기준 테스트 결과 항목 추가(이전 D014 테스트 항목의 "주의" 문구는 "아래 항목이 새 범위의 결과" 안내로 정리), "아직 테스트하지 못한 기능"에서 BODY 전체 미검증 항목을 제거하고 WITHOUT_PHOTO 쪽 실패 케이스 미검증 + 정확한 오류 메시지 미기록 항목으로 대체, "진행 중인 작업"·"미구현 기능" 갱신, "알려진 문제"의 D015 항목을 실기 검증 완료로 갱신(WITHOUT_PHOTO 실패 케이스 미검증 명시), "다음 추천 작업" 1순위를 HERO_IMAGE 구현으로 승격(D015 테스트 항목 제거, WITHOUT_PHOTO 실패 케이스 확인을 선택 항목으로 추가)
- `README.md`는 이번에 별도 변경 없음(이전 커밋에서 이미 BODY/D014/D015 반영 완료 — 실기 검증 완료 여부는 HANDOFF.md가 단일 기준 문서이므로 README 자체 문구는 유지)
- HERO_IMAGE는 이번에도 구현/수정하지 않음(요청 범위 유지)

변경 파일:
- sample/opening-page-without-photo-long-test.json (신규)
- DECISIONS.md
- HANDOFF.md
- WORKLOG.md

테스트:
- Claude Code가 직접 실행한 테스트는 없음(문서화 작업만 수행). 문서에 반영한 D015 정상/Text Thread/실패 케이스 성공 결과는 사용자가 실제 InDesign에서 수행하고 전달한 테스트에 근거함.

남은 문제:
- WITHOUT_PHOTO 쪽 실패 케이스(BODY_COLUMN_1/BODY_COLUMN_2 Script Label 변경, 텍스트 스레드 연결을 직접 끊는 경우)는 아직 별도로 확인되지 않음
- D015 실패 케이스 당시 Status에 표시된 정확한 오류 메시지 문자열은 기록되지 않음(동작만 확인)
- 두 번째 `.contents` 대입이 첫 번째 성공 이후 실패하는 극단적 경우의 자동 롤백 여부는 여전히 미검증(D014부터 이어지는 이론적 위험)
- 안전 검사 실패 케이스(Article 미로드 등)는 여전히 실기로 확인되지 않음
- HERO_IMAGE 이미지 배치가 다음 작업으로 확정됨 — 아직 구현 시작 전
