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
