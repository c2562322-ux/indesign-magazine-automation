# indesign-magazine-automation

Adobe InDesign용 UXP Plugin. 디자이너가 만든 InDesign 매거진 템플릿에 기사 데이터와 이미지를 자동으로 배치하는 것을 목표로 한다.

Vanilla JavaScript 기반이며 React 등 프레임워크는 사용하지 않는다.

## 현재 단계 (MVP 0단계)

`Generate` 버튼을 클릭하면 `Load Article`로 불러와 검증을 통과한 기사 데이터의 `title`만 InDesign "시작 페이지"의 Script Label `TITLE` Text Frame에 채워 넣는다([src/text.js](src/text.js)의 `applyTitleOnly`). `variant`(`WITH_PHOTO`/`WITHOUT_PHOTO`)에 맞는 대상 페이지는 `page.name` 하드코딩 없이, [src/validation.js](src/validation.js)의 Script Label 프로필(`OPENING_PROFILES_BY_VARIANT`)을 그대로 재사용해 찾는다. Article을 먼저 불러오지 않았거나, 대상 페이지/TITLE 프레임을 찾지 못하거나, TITLE이 2개 이상이거나 TextFrame이 아니면 문서를 전혀 수정하지 않고 중단한다. POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과 HERO_IMAGE 배치는 아직 구현되지 않았다. (이전 단계의 "Hello Magazine" 텍스트 생성 테스트 코드는 [src/indesign.js](src/indesign.js)에 `addHelloText`로 남아 있지만 더 이상 `Generate` 버튼과 연결되어 있지 않다.)

`Inspect Template` 버튼을 클릭하면 현재 열린 InDesign 문서를 읽기 전용으로 분석해 페이지 수, 페이지별 Text Frame/Rectangle(이미지 프레임) 목록(name, label, 텍스트 미리보기, geometricBounds), 사용 가능한 Paragraph/Object Style 목록을 패널 로그 영역과 콘솔에 출력한다. 같은 버튼 클릭 한 번으로 "시작 페이지"에 필요한 Script Label(TITLE/POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE)이 정확히 1개씩 존재하는지, 타입이 예상과 맞는지도 함께 검증해 같은 로그에 이어서 출력한다 ([src/validation.js](src/validation.js)). 문서를 수정하지 않는다.

`Load Article` 버튼을 클릭하면 로컬 파일(JSON)을 선택할 수 있는 파일 선택 대화상자가 뜬다. 선택한 파일을 읽어 `JSON.parse`한 뒤, [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)의 `OPENING_PAGE` 계약(templateType/variant/title/pointText/body, WITH_PHOTO일 때 heroImage)을 만족하는지 검사해서 `Article Log` 영역과 콘솔에 결과를 출력한다. 검증을 통과하면 데이터를 메모리에 보관한다(아직 다른 기능과 연결되지 않음). 이 단계에서도 InDesign 문서는 전혀 건드리지 않는다 — 로컬 파일을 읽고 검증만 한다.

## 폴더 구조

```text
indesign-magazine-automation/
├─ manifest.json      UXP Plugin 설정 및 InDesign 연결 정보
├─ index.html         UXP 패널 화면 (Load Article / Generate / Inspect Template 버튼)
├─ styles.css         UXP 패널 스타일
├─ index.js           버튼 이벤트 바인딩, 프로그램 시작점
│
├─ src/
│  ├─ indesign.js     InDesign document/page/frame 접근 및 제어 (구현됨)
│  ├─ inspector.js    Template Inspector: 문서 구조 읽기 전용 분석 (구현됨, 미검증)
│  ├─ data.js         JSON 파일 선택/읽기(require("uxp").storage) (구현됨, 미검증)
│  ├─ template.js     templateType별 템플릿 처리 (예정)
│  ├─ text.js         TITLE 입력만 구현됨(미검증). POINT_TEXT/BODY/BODY_COLUMN_1/2 입력은 예정
│  ├─ image.js         HERO_IMAGE/IMAGE_01 등 이미지 처리 (예정)
│  └─ validation.js   Script Label 기준 프레임 검증 + OPENING_PAGE 기사 데이터 검증 (읽기 전용, 구현됨, 데이터 검증 부분은 미검증). 이미지 누락/Overset 검사는 예정
│
├─ sample/
│  ├─ article.json                   개발용 테스트 기사 데이터 (FEATURE 예시, 이번 작업과 무관)
│  ├─ opening-page-with-photo.json    "시작 페이지"(사진 있음) 샘플 데이터
│  ├─ opening-page-without-photo.json "시작 페이지"(사진 없음) 샘플 데이터
│  └─ images/                        개발용 테스트 이미지
│
├─ assets/
│  ├─ templates/
│  │  ├─ original/    디자이너 전달 원본 .indd/.idml (수정 금지)
│  │  └─ working/     자동화 개발/테스트용 InDesign 작업 복사본
│  └─ fonts/          디자이너 전달 폰트 파일
│
└─ README.md
```

UI 로직(`index.js`, `index.html`)과 InDesign 제어 로직(`src/indesign.js`)을 분리해서, InDesign API 사용 방식이 바뀌어도 UI 코드를 건드리지 않도록 구성했다.

## assets 폴더

디자이너에게 전달받은 디자인 리소스를 보관하는 폴더다.

- `assets/templates/original/` — 원본 `.indd`/`.idml` 파일. 이 폴더의 파일은 수정하지 않는다.
- `assets/templates/working/` — 실제 자동화 개발/테스트에 사용하는 InDesign 작업용 복사본.
- `assets/fonts/` — 디자이너에게 전달받은 폰트 파일.

용량이 큰 바이너리 리소스이므로 `assets/templates/`, `assets/fonts/` 하위 실제 파일은 [.gitignore](.gitignore)에 의해 Git에 커밋되지 않는다. 폴더 구조만 `.gitkeep`으로 유지되며, 새로 clone한 환경에서는 디자이너에게 파일을 별도로 전달받아 해당 폴더에 넣어야 한다.

## 기사 데이터 규격

자동조판 MVP에서 쓸 기사 JSON 데이터의 필드 구조(현재 "시작 페이지" 2개 variant만)는 [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)에 정의되어 있다. Script Label과의 매핑, Required/Optional 여부, 샘플 파일(`sample/opening-page-with-photo.json`, `sample/opening-page-without-photo.json`) 위치도 이 문서에 정리했다. `Load Article` 버튼으로 이 JSON을 선택/읽기/검증하는 기능은 구현됐고, `Generate` 버튼으로 `title` 필드 하나를 TITLE 프레임에 채워 넣는 것까지 구현됐다. `pointText`/`body`/`bodyColumn1`/`bodyColumn2`를 프레임에 채우는 것과 `heroImage` 이미지 배치는 아직 구현되지 않았다.

## UXP Developer Tool에서 실행하는 방법

1. Adobe InDesign(2022, v17 이상)과 UXP Developer Tool(UDT)을 설치한다.
2. UDT를 실행하고 `Add Plugin` → `Add existing plugin`을 선택한다.
3. 이 프로젝트 폴더 안의 `manifest.json` 파일을 선택한다.
4. 플러그인 목록에 `Magazine Automation`이 추가되면 InDesign을 실행한 상태에서 `Load`(또는 로드 아이콘)를 눌러 플러그인을 로드한다.
5. InDesign에서 문서를 하나 새로 만들거나 연다.
6. InDesign 메뉴 `Plugins`(또는 UDT에서 지정한 위치)에서 `Magazine Automation` 패널을 연다.
7. 먼저 `Load Article` 버튼으로 `sample/opening-page-with-photo.json`을 불러와 검증을 통과시킨 뒤, `Generate` 버튼을 클릭하면 "시작 페이지(사진 있음)"의 TITLE 프레임 내용이 JSON의 `title` 값으로 바뀌는지 확인한다. `sample/opening-page-without-photo.json`을 불러와 `Generate`하면 "시작 페이지(사진 없음)"의 TITLE만 바뀌고, 반대쪽 variant 페이지는 바뀌지 않아야 한다. Article을 불러오지 않은 상태에서 `Generate`를 누르면 문서 변경 없이 Status에 중단 사유가 표시되는지도 확인한다.
8. 패널에서 `Inspect Template` 버튼을 클릭하면 현재 문서의 페이지/프레임/스타일 정보와 함께, Script Label 기준 "시작 페이지" 필수 프레임 검증 결과(`=== Script Label 기반 프레임 검증 ===`로 시작하는 부분)가 `Inspection Log` 영역과 콘솔에 이어서 출력되는지 확인한다. 문서 내용은 변경되지 않아야 한다.
9. 패널에서 `Load Article` 버튼을 클릭하면 파일 선택 대화상자가 뜨는지, `sample/opening-page-with-photo.json`이나 `sample/opening-page-without-photo.json`을 선택했을 때 `Article Log` 영역에 `=== Load Article 데이터 검증 ===`로 시작하는 결과가 출력되고 "결과: 검증 통과"로 끝나는지 확인한다. 문서 내용은 변경되지 않아야 한다.
10. 코드를 수정한 뒤에는 UDT에서 `Reload`를 눌러 변경 사항을 다시 로드한다. 콘솔 로그는 UDT의 `Inspect` 기능으로 확인할 수 있다.
