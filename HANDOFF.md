# HANDOFF.md

이 문서 하나만 읽어도 현재 프로젝트 상태를 파악할 수 있도록 작성한다. 구조와 용어는 프로젝트 루트의 인수인계서(원본 요청 문서) 및 [README.md](README.md)를 따른다.

마지막 업데이트: 2026-09-22

## 현재 프로젝트 단계

**MVP 0단계 — UXP 프로젝트 기본 골격 + Template Inspector(읽기 전용) 작성 완료, 실제 InDesign 실행 검증 전.**

디자이너로부터 실제 InDesign 원본 템플릿(.indd/.idml)과 폰트 파일을 전달받아 `assets/templates/original/`, `assets/fonts/`에 보관하기 시작했다(2026-09-22). 이번에 working 사본을 준비하고 실제 템플릿 구조를 분석하기 위한 `Inspect Template` 기능(읽기 전용)을 추가했지만, `assets/templates/original/`의 원본 파일을 InDesign에서 직접 열어 이 기능으로 분석해본 적은 아직 없다. 실제 기사/템플릿 자동 배치 로직(데이터 매핑, 자동 조판)은 여전히 시작하지 않았다. 현재는 "버튼 클릭 → InDesign 문서에 텍스트 생성 / 구조 읽기"가 되는지를 확인하는 최소 동작 확인 단계다.

## 완료된 기능

- 프로젝트 기본 폴더 구조 ([manifest.json](manifest.json), [index.html](index.html), [styles.css](styles.css), [index.js](index.js), `src/`, `sample/`)
- `Magazine Automation` UXP 패널 UI: `Load Article` 버튼, `Generate` 버튼, Status 표시 영역 ([index.html](index.html))
- `Generate` 버튼 클릭 시 InDesign 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임을 생성하는 코드 ([src/indesign.js](src/indesign.js)의 `addHelloText`)
- UI 로직([index.js](index.js))과 InDesign 제어 로직([src/indesign.js](src/indesign.js)) 분리
- 개발용 샘플 데이터 [sample/article.json](sample/article.json)
- 디자인 리소스 보관용 폴더 구조 생성 및 디자이너 원본 InDesign 템플릿(.indd/.idml)·폰트 파일 수령 완료 (`assets/templates/original/`, `assets/templates/working/`, `assets/fonts/`, 실제 파일은 Git에는 올리지 않음 — [.gitignore](.gitignore) 참고)
- `Inspect Template` 버튼 및 읽기 전용 문서 구조 분석 기능 추가 ([src/inspector.js](src/inspector.js)의 `inspectDocument`/`formatReport`): 전체 페이지 수, 페이지별 Page Item 수, Text Frame 목록, Rectangle(이미지 프레임) 목록과 포함된 이미지 개수, 사용 가능한 Paragraph/Object Style 목록을 패널의 `Inspection Log` 영역과 콘솔에 출력. 문서를 수정하는 코드는 없음.

## 실제 테스트 완료된 기능

**없음.**

지금까지의 작업은 코드 작성까지만 진행되었고, UXP Developer Tool이나 실제 Adobe InDesign에서 로드/실행해본 적이 없다. 따라서 아래 항목 전부가 "코드는 작성되었지만 동작 여부는 미확인" 상태다.

## 아직 테스트하지 못한 기능

- UXP Developer Tool에서 [manifest.json](manifest.json)이 정상적으로 로드되는지
- InDesign에서 `Magazine Automation` 패널이 정상적으로 표시되는지
- `Generate` 버튼 클릭 시 `src/indesign.js`의 `app.doScript(...)` 호출이 실제 InDesign UXP API와 시그니처가 맞는지, 에러 없이 텍스트 프레임이 생성되는지
- `Load Article` 버튼 (현재 클릭해도 "아직 구현되지 않음" 상태 메시지만 표시, 실제 동작 없음)
- `Inspect Template` 버튼 전체: `doc.pages`, `page.textFrames`, `page.rectangles`, `rectangle.images`, `pageItem.constructor.name`, `doc.paragraphStyles`, `doc.objectStyles` 등 [src/inspector.js](src/inspector.js)에서 사용한 InDesign DOM 속성이 실제 InDesign UXP 환경에서 문서 그대로 동작하는지
- `Inspect Template`이 실제 디자이너 템플릿(`assets/templates/original/`을 연 working 사본)에서 의미 있는 결과를 내는지, 특히 Group으로 묶인 개체나 스타일 그룹 내부 스타일이 실제로 얼마나 있는지(현재 버전은 이런 항목을 집계하지 않음)

## 진행 중인 작업

- 없음. 이번 작업은 Template Inspector(읽기 전용) 기능 추가까지 완료했다.

## 미구현 기능

- `src/data.js`: `sample/article.json` 읽기/파싱 (Load Article 버튼과 연결 예정)
- `src/template.js`: `templateType`(FEATURE, INTERVIEW, NEWS, PHOTO 등)별 템플릿 처리
- `src/text.js`: TITLE/SUBTITLE/AUTHOR/BODY 등 텍스트 프레임에 데이터 매핑
- `src/image.js`: HERO_IMAGE/IMAGE_01 등 이미지 프레임 배치
- `src/validation.js`: 필수 데이터 누락, 이미지 누락, Overset Text, 프레임 누락 등 오류 검사
- 여러 기사 지원, 여러 템플릿 지원
- 본문 길이에 따른 추가 페이지 처리 (Linked Text Frame)
- PDF 자동 출력

## 알려진 문제

- `src/indesign.js`의 `app.doScript()` 호출부(인자 순서, `ScriptLanguage`/`UndoModes` 접근 방식)는 Adobe에서 공개한 InDesign UXP 패턴을 참고해 작성했지만, 실제 InDesign에서 실행해 검증한 적이 없다. 버전/환경에 따라 시그니처가 다를 수 있으므로 UDT의 Inspect(콘솔)로 확인 후 필요시 수정해야 한다.
- `manifest.json`에 `icons` 항목이 없다. 아이콘 파일이 없는 상태에서 값을 채우면 로드 에러가 날 수 있어 의도적으로 생략했다. 아이콘 리소스가 준비되면 추가한다.
- `src/inspector.js`가 사용하는 `page.textFrames`, `page.rectangles`, `rectangle.images`, `item.constructor.name`, `doc.paragraphStyles`, `doc.objectStyles`는 classic InDesign Scripting DOM 기준으로 작성했으며 InDesign UXP에서 실제 검증되지 않았다. 특히 `item.constructor.name`으로 개체 타입을 식별하는 방식이 UXP 호스트 객체에서도 동일하게 동작하는지는 불확실하다.
- `src/inspector.js`는 Group으로 묶인 pageItem(중첩 개체)과 Paragraph/Object Style Group 내부의 스타일을 집계하지 않는다. `page.pageItems`/`doc.paragraphStyles`/`doc.objectStyles`가 최상위 항목만 반환하기 때문이며, 디자이너 템플릿이 그룹을 많이 쓴다면 "Page Item 수"와 실제 나열된 Text Frame/Rectangle 개수 사이에 차이가 날 수 있다.

## 외부 대기 사항

- 디자이너와 프레임 Naming Convention, Paragraph/Object Style Naming Convention 등 확정 필요 (아래 "디자이너에게 확인해야 할 사항" 참고). 원본 템플릿 파일 자체는 수령했지만, 이 확정 작업은 아직 진행되지 않았다.

## 다음 추천 작업

1. UXP Developer Tool 설치 후 [manifest.json](manifest.json)을 로드해 InDesign에서 패널이 실제로 뜨는지 확인
2. `Generate`와 `Inspect Template` 버튼을 실제로 클릭해 각각 동작하는지 검증하고, 에러가 나면 `src/indesign.js` / `src/inspector.js`를 수정
3. 검증 결과를 [WORKLOG.md](WORKLOG.md)와 이 문서의 "실제 테스트 완료된 기능" 항목에 반영
4. `assets/templates/working/`에 원본 템플릿(`assets/templates/original/`) 작업용 복사본을 만들어 InDesign에서 열고, `Inspect Template`으로 실제 페이지 유형/프레임 이름/스타일을 확인해 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md) 채우기 시작
5. 템플릿 분석 완료 후 `src/data.js` (JSON 로드)부터 순서대로 구현

## 디자이너에게 확인해야 할 사항

인수인계서 5, 6, 7, 8, 19절 기준으로 정리:

- 반복 사용되는 대표 페이지 유형 (예: COVER, FEATURE_OPENING, FEATURE_BODY, INTERVIEW_OPENING, INTERVIEW_BODY, PHOTO_PAGE, NEWS, TOC, AD 등 실제로 몇 종류를 쓰는지)
- 각 페이지 영역(제목/부제/본문/작성자/대표 이미지/이미지/캡션)의 역할과 프레임 이름 규칙
- 텍스트/이미지 상태 변화에 따른 레이아웃 처리 방식 (제목이 너무 길 때, 본문이 길거나 짧을 때, 이미지가 없을 때, 부제/캡션이 없을 때)
- 구조는 같고 스타일만 다른 페이지인지, 구조 자체가 다른 별도 템플릿인지 여부
- Paragraph Style / Object Style 이름 규칙
- 실제 기사 데이터 제공 방식 (JSON/CSV/Excel/API 등)과 이미지 제공 방식
- 최종 PDF 출력 방식, 향후 CMS/API 연동 여부

확정되는 내용은 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)에 기록한다.
