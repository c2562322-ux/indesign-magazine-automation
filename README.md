# indesign-magazine-automation

Adobe InDesign용 UXP Plugin. 디자이너가 만든 InDesign 매거진 템플릿에 기사 데이터와 이미지를 자동으로 배치하는 것을 목표로 한다.

Vanilla JavaScript 기반이며 React 등 프레임워크는 사용하지 않는다.

## 현재 단계

`Load Article` 버튼을 클릭하면 로컬 파일(JSON 또는 Word `.docx`)을 선택할 수 있는 파일 선택 대화상자가 뜬다. 파일 확장자로 자동 분기한다: JSON이면 `JSON.parse`, `.docx`면 [src/docxZip.js](src/docxZip.js)/[src/docxArticle.js](src/docxArticle.js)가 `[TITLE]`/`[POINT_TEXT]`/`[BODY]`/`[HERO_IMAGE]` 마커를 파싱한다(자세한 형식은 [docs/WORD_INPUT_SPEC.md](docs/WORD_INPUT_SPEC.md)). 어느 쪽이든 같은 Article Data 구조가 되어 [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)의 `OPENING_PAGE` 계약(templateType/variant/title/pointText/body, WITH_PHOTO일 때 heroImage)으로 검사되고 `Article Log`/콘솔에 결과가 출력된다. 검증을 통과한 데이터만 메모리에 보관한다. 이 단계에서 InDesign 문서는 전혀 건드리지 않는다 — 로컬 파일을 읽고 검증만 한다.

`Generate` 버튼을 클릭하면 검증을 통과한 기사 데이터를 InDesign "시작 페이지"에 채워 넣는다([src/text.js](src/text.js)의 `applyOpeningPageContent`): TITLE/POINT_TEXT/BODY(또는 BODY_COLUMN_1, WITHOUT_PHOTO는 텍스트 스레드로 BODY_COLUMN_2까지 자동 흐름) Text Frame에 텍스트를 채우고, WITH_PHOTO는 `heroImage`를 기존 HERO_IMAGE Rectangle에 place한 뒤 "대표이미지" 템플릿 안내 문구(HERO_IMAGE_GUIDE)를 비운다. `variant`에 맞는 대상 페이지는 `page.name` 하드코딩 없이 [src/validation.js](src/validation.js)의 Script Label 프로필(`OPENING_PROFILES_BY_VARIANT`)로 찾는다. 필요한 모든 프레임 탐색(및 WITH_PHOTO의 이미지 파일 접근 확인)이 전부 성공했을 때만 실제 쓰기를 시작하며, 하나라도 실패하면 문서를 전혀 수정하지 않고 중단한다. (이전 단계의 "Hello Magazine" 텍스트 생성 테스트 코드는 [src/indesign.js](src/indesign.js)에 `addHelloText`로 남아 있지만 더 이상 `Generate` 버튼과 연결되어 있지 않다.)

`Inspect Template` 버튼을 클릭하면 현재 열린 InDesign 문서를 읽기 전용으로 분석해 페이지 수, 페이지별 Text Frame/Rectangle(이미지 프레임) 목록(name, label, 텍스트 미리보기, geometricBounds), 사용 가능한 Paragraph/Object Style 목록을 패널 로그 영역과 콘솔에 출력한다. 같은 버튼 클릭 한 번으로 "시작 페이지"에 필요한 Script Label(TITLE/POINT_TEXT/BODY/HERO_IMAGE/HERO_IMAGE_GUIDE 또는 TITLE/POINT_TEXT/BODY_COLUMN_1/BODY_COLUMN_2)이 정확히 1개씩 존재하는지, 타입이 예상과 맞는지도 함께 검증해 같은 로그에 이어서 출력한다 ([src/validation.js](src/validation.js)). 문서를 수정하지 않는다.

실기 검증 상태(어디까지 실제 InDesign에서 확인됐는지)는 [HANDOFF.md](HANDOFF.md)를 참고한다 — 이 README는 기능 설명이고, 실기 검증 여부의 기준 문서는 HANDOFF.md다.

## 폴더 구조

```text
indesign-magazine-automation/
├─ manifest.json      UXP Plugin 설정 및 InDesign 연결 정보
├─ index.html         UXP 패널 화면 (Load Article / Generate / Inspect Template 버튼)
├─ styles.css         UXP 패널 스타일
├─ index.js           버튼 이벤트 바인딩, 프로그램 시작점
│
├─ src/
│  ├─ inspector.js    Template Inspector: 문서 구조 읽기 전용 분석 (구현됨, 미검증)
│  ├─ data.js         JSON/DOCX 파일 선택/읽기(require("uxp").storage), 파일 nativePath 반환 (JSON은 실기 검증 완료, DOCX 분기는 D019·미검증)
│  ├─ docxZip.js      .docx(ZIP) 안의 항목을 꺼내는 최소 ZIP 리더 + 직접 구현한 RFC 1951(DEFLATE) 압축 해제 (D019, 미검증)
│  ├─ docxArticle.js  word/document.xml에서 문단/텍스트 추출 + 마커 파싱 → Article Data 변환 (D019, 미검증)
│  ├─ text.js         TITLE/POINT_TEXT/BODY/HERO_IMAGE/HERO_IMAGE_GUIDE 입력을 applyOpeningPageContent() 하나로 통합 구현. TITLE/POINT_TEXT/BODY/HERO_IMAGE/HERO_IMAGE_GUIDE(WITH_PHOTO 정상 케이스)는 실기 검증 완료
│  ├─ image.js         heroImage 경로 해석/파일 접근 확인(fs.lstat)/place 구현 및 실기 검증 완료. fit/리사이즈 없음
│  ├─ validation.js   Script Label 기준 프레임 검증 + OPENING_PAGE 기사 데이터 검증 (읽기 전용, 구현됨, 데이터 검증 부분은 미검증). 이미지 누락/Overset 검사는 예정
│  ├─ indesign.js     [사용되지 않음] 초기 "Hello Magazine" 테스트 코드(addHelloText)만 남아 있고 D012 이후 어디서도 require되지 않는다. 삭제 여부는 별도 판단 대상(cleanup 범위 밖) — 최종 배포 패키지에는 포함하지 않는다
│  └─ template.js     [사용되지 않음] templateType별 템플릿 처리용으로 만든 빈 스텁, 미구현. 최종 배포 패키지에는 포함하지 않는다
│
├─ sample/                                   회귀 테스트용 샘플(개발 저장소에만 유지, 최종 배포 패키지에는 포함하지 않음)
│  ├─ opening-page-with-photo.json           "시작 페이지"(사진 있음) 샘플 데이터
│  ├─ opening-page-without-photo.json        "시작 페이지"(사진 없음) 샘플 데이터
│  ├─ opening-page-without-photo-long-test.json  Text Thread 실기 테스트용(본문을 길게 늘림)
│  ├─ eye-clinic-hero.png                    실기 테스트용 이미지(article-eye-clinic-with-photo.docx의 heroImage가 참조하는 파일)
│  └─ article-eye-clinic-with-photo.docx     Word 입력 MVP 실기 테스트용 샘플(D019, 안과 병원 매거진 예시)
│
├─ assets/
│  ├─ templates/
│  │  ├─ original/    디자이너 전달 원본 .indd/.idml (수정 금지)
│  │  └─ working/     자동화 개발/테스트용 InDesign 작업 복사본
│  └─ fonts/          디자이너 전달 폰트 파일
│
└─ README.md
```

UI 로직(`index.js`, `index.html`)과 InDesign 제어 로직(`src/text.js`, `src/inspector.js`, `src/image.js` 등)을 분리해서, InDesign API 사용 방식이 바뀌어도 UI 코드를 건드리지 않도록 구성했다. `src/indesign.js`는 초기 "Hello Magazine" 테스트 코드가 남아 있는 미사용 파일이다(위 폴더 구조 참고).

## assets 폴더

디자이너에게 전달받은 디자인 리소스를 보관하는 폴더다.

- `assets/templates/original/` — 원본 `.indd`/`.idml` 파일. 이 폴더의 파일은 수정하지 않는다.
- `assets/templates/working/` — 실제 자동화 개발/테스트에 사용하는 InDesign 작업용 복사본.
- `assets/fonts/` — 디자이너에게 전달받은 폰트 파일.

용량이 큰 바이너리 리소스이므로 `assets/templates/`, `assets/fonts/` 하위 실제 파일은 [.gitignore](.gitignore)에 의해 Git에 커밋되지 않는다. 폴더 구조만 `.gitkeep`으로 유지되며, 새로 clone한 환경에서는 디자이너에게 파일을 별도로 전달받아 해당 폴더에 넣어야 한다.

## 기사 데이터 규격

자동조판 MVP에서 쓸 기사 JSON 데이터의 필드 구조(현재 "시작 페이지" 2개 variant만)는 [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)에 정의되어 있다. Script Label과의 매핑, Required/Optional 여부, 샘플 파일(`sample/opening-page-with-photo.json`, `sample/opening-page-without-photo.json`) 위치도 이 문서에 정리했다. `Load Article` 버튼으로 이 JSON을 선택/읽기/검증하는 기능은 구현됐고, `Generate` 버튼으로 `title`/`pointText`/`body`/(WITH_PHOTO는)`heroImage`를 TITLE/POINT_TEXT/BODY(또는 BODY_COLUMN_1)/HERO_IMAGE 프레임에 채워 넣는 것까지 구현됐다(`src/text.js`의 `applyOpeningPageContent`, 하나의 `app.doScript` 안에서 모든 프레임 탐색·WITHOUT_PHOTO의 텍스트 스레드 연결 확인을 마친 뒤에만 쓰기를 시작함 — [DECISIONS.md](DECISIONS.md) D014/D015/D017). `heroImage`는 `Load Article`로 불러온 JSON 파일이 있는 폴더 기준 상대 경로로 해석하며, 기존 `HERO_IMAGE` Rectangle의 위치/크기는 건드리지 않고 이미지만 place한다([src/image.js](src/image.js)). TITLE+POINT_TEXT+BODY 범위는 실기 검증 완료, HERO_IMAGE가 포함된 현재 구조는 아직 실기 테스트 전이다.

## 최종 사용자 배포 패키지

개발 저장소에는 회귀 테스트용 `sample/` 샘플과 프로젝트 관리 문서를 그대로 유지한다. 최종 사용자에게 전달하는 배포 패키지를 만들 때는 아래 기준으로 포함/제외한다.

**배포 패키지에 포함(런타임에 실제로 필요한 파일)**

```
manifest.json
index.html
styles.css
index.js
src/inspector.js
src/validation.js
src/data.js
src/docxArticle.js
src/docxZip.js
src/text.js
src/image.js
```

**배포 패키지에서 제외**

- `sample/` — 회귀 테스트용 샘플. `Load Article`은 사용자가 직접 선택한 파일만 읽으므로 최종 사용자에게는 불필요하다.
- `docs/`, `assets/` — 개발 문서 및 디자이너 원본 리소스.
- `CLAUDE.md`, `README.md`, `HANDOFF.md`, `WORKLOG.md`, `DECISIONS.md` — 프로젝트 관리/개발 이력 문서.
- `src/indesign.js`, `src/template.js` — 어디서도 `require`되지 않는 미사용 코드(위 폴더 구조 참고). 저장소에는 남아 있지만 배포 패키지에는 포함하지 않는다.

## UXP Developer Tool에서 실행하는 방법

1. Adobe InDesign(2022, v17 이상)과 UXP Developer Tool(UDT)을 설치한다.
2. UDT를 실행하고 `Add Plugin` → `Add existing plugin`을 선택한다.
3. 이 프로젝트 폴더 안의 `manifest.json` 파일을 선택한다.
4. 플러그인 목록에 `Magazine Automation`이 추가되면 InDesign을 실행한 상태에서 `Load`(또는 로드 아이콘)를 눌러 플러그인을 로드한다.
5. InDesign에서 문서를 하나 새로 만들거나 연다.
6. InDesign 메뉴 `Plugins`(또는 UDT에서 지정한 위치)에서 `Magazine Automation` 패널을 연다.
7. 먼저 `sample/opening-page-with-photo.json`과 같은 폴더에 JSON의 `heroImage` 값(예: `hero.jpg`)과 정확히 이름이 같은 이미지 파일을 준비한다. `Load Article` 버튼으로 그 JSON을 불러와 검증을 통과시킨 뒤, `Generate` 버튼을 클릭하면 "시작 페이지(사진 있음)"의 TITLE·POINT_TEXT·BODY·HERO_IMAGE가 JSON 값/이미지로 바뀌는지(HERO_IMAGE Rectangle의 위치/크기는 그대로인지) 확인한다. `sample/opening-page-without-photo.json`을 불러와 `Generate`하면 "시작 페이지(사진 없음)"의 TITLE·POINT_TEXT·BODY_COLUMN_1이 바뀌고 `body`가 텍스트 스레드를 통해 BODY_COLUMN_2까지 흐르는지, 반대쪽 variant 페이지는 바뀌지 않는지 확인한다. Article을 불러오지 않은 상태에서 `Generate`를 누르면 문서 변경 없이 Status에 중단 사유가 표시되는지도 확인한다. (Script Label을 일시적으로 지우거나 이미지 파일을 잠시 지웠을 때 아무 필드도 반영되지 않는지 등 D014/D015/D017 검증을 위한 추가 테스트는 HANDOFF.md "다음 추천 작업"에 정리되어 있다.)
8. 패널에서 `Inspect Template` 버튼을 클릭하면 현재 문서의 페이지/프레임/스타일 정보와 함께, Script Label 기준 "시작 페이지" 필수 프레임 검증 결과(`=== Script Label 기반 프레임 검증 ===`로 시작하는 부분)가 `Inspection Log` 영역과 콘솔에 이어서 출력되는지 확인한다. 문서 내용은 변경되지 않아야 한다.
9. 패널에서 `Load Article` 버튼을 클릭하면 파일 선택 대화상자가 뜨는지, `sample/opening-page-with-photo.json`이나 `sample/opening-page-without-photo.json`을 선택했을 때 `Article Log` 영역에 `=== Load Article 데이터 검증 ===`로 시작하는 결과가 출력되고 "결과: 검증 통과"로 끝나는지 확인한다. 문서 내용은 변경되지 않아야 한다.
10. 코드를 수정한 뒤에는 UDT에서 `Reload`를 눌러 변경 사항을 다시 로드한다. 콘솔 로그는 UDT의 `Inspect` 기능으로 확인할 수 있다.
