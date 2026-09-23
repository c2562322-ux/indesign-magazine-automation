# HANDOFF.md

이 문서 하나만 읽어도 현재 프로젝트 상태를 파악할 수 있도록 작성한다. 구조와 용어는 프로젝트 루트의 인수인계서(원본 요청 문서) 및 [README.md](README.md)를 따른다.

마지막 업데이트: 2026-09-23

## 현재 프로젝트 단계

**첫 자동조판 쓰기(TITLE 자동 입력) 실기 테스트 성공 — InDesign 문서를 실제로 수정하는 첫 기능이 WITH_PHOTO/WITHOUT_PHOTO 양쪽 모두 올바른 페이지만 수정하고 반대쪽은 건드리지 않음을 확인했다. 그 외 Template Type(목차/본문 페이지/인터뷰 레이아웃)은 아직 미착수, POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과 HERO_IMAGE 배치는 아직 구현 안 됨.**

개선된 `Inspect Template`을 사용자가 실제 "시작 페이지" 템플릿(사진 있는 버전 page.name=2/index=3, 사진 없는 버전 page.name=3/index=4)에서 실행하고 로그를 전달했다(2026-09-23, 실기 테스트는 사용자가 직접 수행, Claude Code가 실행한 것은 아니다). 그 로그를 근거로 [docs/TEMPLATE_SPEC.md](docs/TEMPLATE_SPEC.md)의 "Frame 분석 워크시트"에 두 페이지의 모든 Text Frame/Rectangle을 역할과 대응시키고 Proposed Automation Name 후보(TITLE, POINT_TEXT, BODY, BODY_COLUMN_1/2, HERO_IMAGE)를 기록했다. 이 매핑은 아직 디자이너와 확정된 것이 아니라 초안이며, 여러 항목이 "확인 필요"로 남아 있다. 프레임 이름은 InDesign에서 실제로 변경하지 않았다(코드/템플릿 파일 모두 미변경). Template Type 4종(목차, 시작 페이지, 본문 페이지, 인터뷰 레이아웃)은 확정되었지만, "시작 페이지" 외 나머지 3종의 프레임 분석과 자동 조판 로직은 아직 시작하지 않았다.

`name`이 대부분 비어 있다는 문제 때문에 자동화 식별자로 `name` 대신 Script Label(`label`)을 검토했고, `Inspect Template`에 `label`을 읽기 전용으로 출력하도록 추가한 뒤 사용자가 실제 InDesign에서 실행해 Text Frame과 Rectangle 모두 `label`에 에러 없이 접근됨을 확인했다(2026-09-23). 이를 근거로 **자동화 대상 프레임 식별은 Script Label(`label`)을 1차 기준으로 사용하기로 결정**했다([DECISIONS.md](DECISIONS.md) D008).

이후 **사용자가 실제 working .indd의 "시작 페이지" 두 변형에 Script Label을 직접 부여했다**(2026-09-23, InDesign에서 사용자가 직접 수행): 사진 있는 버전(page.name=2)에는 `TITLE`/`POINT_TEXT`/`BODY`/`HERO_IMAGE`, 사진 없는 버전(page.name=3)에는 `TITLE`/`POINT_TEXT`/`BODY_COLUMN_1`/`BODY_COLUMN_2`. 코드가 Script Label만으로 필요한 프레임을 정확히 찾아내는지 검증하는 읽기 전용 기능을 [src/validation.js](src/validation.js)에 구현했고, **사용자가 실제 InDesign에서 `Inspect Template`을 실행해 두 페이지 모두 "결과: 모두 정상"(TITLE/POINT_TEXT/BODY/HERO_IMAGE, TITLE/POINT_TEXT/BODY_COLUMN_1/BODY_COLUMN_2 전부 `[OK]`)임을 확인했다**(2026-09-23).

이 성공을 근거로 자동조판 MVP에서 쓸 기사 JSON 데이터 계약을 정의했다 — [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md). 사진 있음/없음 구분은 `heroImage` 존재 여부로 암묵적으로 추측하지 않고 `variant` 필드(`"WITH_PHOTO"`/`"WITHOUT_PHOTO"`)로 명시하도록 정했고, 본문 2단 구성도 자동 분배 대신 `bodyColumn1`/`bodyColumn2` 두 필드로 명시적으로 받기로 했다. `sample/opening-page-with-photo.json`, `sample/opening-page-without-photo.json` 샘플 파일도 만들었다. **이 JSON을 실제로 읽거나 InDesign에 채워 넣는 코드는 아직 없다** — 이번 작업은 데이터 구조 정의와 샘플 파일까지만 진행했다.

이후 사용자가 InDesign UI에서 `보기 > 기타 > 텍스트 스레드 표시`를 켠 상태로도 BODY_COLUMN_1과 BODY_COLUMN_2 사이에 연결선이 보이지 않는다고 보고했다. 두 프레임이 실제로 텍스트 스레드로 연결돼 있는지 코드로 읽기 전용 확인하기 위해 `TextFrame.previousTextFrame`/`nextTextFrame`을 `Inspect Template`에 추가로 출력하도록 [src/inspector.js](src/inspector.js)를 개선하고, `src/validation.js`에 "BODY_COLUMN_1 → BODY_COLUMN_2 텍스트 스레드 연결" 전용 검사를 추가했다(2026-09-23).

**사용자가 실제 InDesign에서 이 검사를 실행해 두 프레임이 실제로 연결되어 있음을 확인했다**(2026-09-23): `BODY_COLUMN_1.nextTextFrame` → `BODY_COLUMN_2`, `BODY_COLUMN_2.previousTextFrame` → `BODY_COLUMN_1`, "결과: 모두 정상". `previousTextFrame`/`nextTextFrame`이 이 InDesign UXP 환경에서 에러 없이 노출된다는 점도 함께 확인됐다. InDesign UI에 연결선이 보이지 않는다고 보고됐던 것과 달리, 두 프레임은 실제로는 연결돼 있는 것으로 확인됐다.

이 확인을 근거로 자동조판 MVP 데이터 계약을 단순화했다([docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md), [DECISIONS.md](DECISIONS.md) D010): 사진 없는 변형도 `bodyColumn1`/`bodyColumn2` 두 필드 대신 `WITH_PHOTO`와 동일하게 `body` 필드 하나만 쓰고, 이 값을 텍스트 스레드의 시작 프레임인 `BODY_COLUMN_1`에만 채워 넣으면 InDesign이 넘치는 텍스트를 `BODY_COLUMN_2`로 자동으로 흘려보낸다(코드가 텍스트를 잘라 나눌 필요가 없어짐). `sample/opening-page-without-photo.json`도 새 구조로 갱신했다. `docs/TEMPLATE_SPEC.md`의 Frame 분석 워크시트도 이 확인 내용을 반영했다.

이후 `Load Article` 버튼을 실제로 구현했다: [src/data.js](src/data.js)의 `loadArticleFile()`이 `require("uxp").storage.localFileSystem`(UXP 플랫폼 공통 파일 시스템 API, `indesign` 모듈이 아님)으로 파일 선택 대화상자를 띄우고 내용을 읽어 `JSON.parse`하며, [src/validation.js](src/validation.js)의 `validateArticleData()`가 [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)의 `OPENING_PAGE` 계약(templateType/variant/title/pointText/body, WITH_PHOTO일 때만 heroImage)을 검사한다. 결과는 새로 추가한 `Article Log` 영역과 콘솔에 출력되고, 검증을 통과한 데이터만 `index.js`의 메모리 변수(`currentArticleData`)에 보관한다([DECISIONS.md](DECISIONS.md) D011).

**사용자가 실제 InDesign에서 `sample/opening-page-with-photo.json`/`sample/opening-page-without-photo.json` 둘 다 `Load Article`로 불러와 "결과: 검증 통과"를 확인했다**(2026-09-23): WITH_PHOTO는 templateType/variant/title/pointText/body/heroImage 전부 OK, WITHOUT_PHOTO는 heroImage 체크 없이 나머지 전부 OK. `require("uxp").storage.localFileSystem`이 이 InDesign UXP 환경에서 실제로 동작함이 확인됐다.

이 성공을 근거로 **첫 번째 실제 자동조판 쓰기 코드**를 구현했다: [src/text.js](src/text.js)의 `applyTitleOnly(articleData)`가 `currentArticleData.title`만 TITLE Script Label Text Frame의 `contents`에 채운다. 대상 페이지는 `page.name` 하드코딩이 아니라 [src/validation.js](src/validation.js)의 `OPENING_PROFILES_BY_VARIANT`(읽기 전용 검증과 동일한 requiredFrames 정의)를 재사용해, articleData의 `variant`에 필요한 Script Label을 모두 가진 페이지를 찾는다. `Generate` 버튼을 이 흐름에 연결하고, 기존 "Hello Magazine" 테스트 코드(`src/indesign.js`의 `addHelloText`)는 `Generate`와의 연결만 끊었다(함수 자체는 남겨둠, [DECISIONS.md](DECISIONS.md) D012). 대상 페이지/TITLE 프레임 탐색과 실제 `contents` 쓰기는 하나의 `app.doScript` 안에서 함께 수행한다 — 탐색을 `doScript` 밖에서 먼저 하고 그 결과를 안에서 쓰는 방식은 검증된 적이 없어 피했다.

안전 검사(모두 통과해야 문서를 수정한다): (1) `currentArticleData`가 없으면 중단, (2) `templateType`이 `OPENING_PAGE`가 아니거나 `title`이 없으면 중단, (3) variant에 필요한 Script Label을 모두 가진 페이지가 0개거나 2개 이상이면 중단, (4) 그 페이지에 TITLE Script Label 프레임이 0개거나 2개 이상이면 중단, (5) TITLE이 TextFrame이 아니면(예: Rectangle) 중단. 실패 시 InDesign 문서를 전혀 수정하지 않고 Status/콘솔에 이유를 표시한다. POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력, HERO_IMAGE 이미지 배치, 페이지 생성/복제, PDF Export는 이번에도 구현하지 않았다.

**사용자가 실제 InDesign에서 두 variant 모두 테스트해 성공을 확인했다**(2026-09-23): `opening-page-with-photo.json`을 `Load Article`로 불러와 검증 통과 후 `Generate`하면 "사진 있는 시작 페이지"의 TITLE만 JSON의 `title`로 바뀌고 "사진 없는 시작 페이지"의 TITLE·POINT_TEXT/BODY/HERO_IMAGE 등 다른 요소는 전혀 바뀌지 않음. `opening-page-without-photo.json`으로는 반대로 "사진 없는 시작 페이지"의 TITLE만 바뀌고 "사진 있는 시작 페이지"는 그대로임. 즉 `OPENING_PROFILES_BY_VARIANT` 기반 대상 페이지 판별과 doScript 콜백 안에서의 탐색+쓰기가 실제로 올바르게 동작함이 확인됐다([DECISIONS.md](DECISIONS.md) D012). 안전 검사 실패 케이스(Article 미로드 등)는 이번 테스트에서 별도로 확인되지 않았다.

## 완료된 기능

- 프로젝트 기본 폴더 구조 ([manifest.json](manifest.json), [index.html](index.html), [styles.css](styles.css), [index.js](index.js), `src/`, `sample/`)
- `Magazine Automation` UXP 패널 UI: `Load Article`/`Generate`/`Inspect Template` 버튼, Article Log/Inspection Log/Status 표시 영역 ([index.html](index.html))
- InDesign 문서 첫 페이지에 "Hello Magazine" 텍스트 프레임을 생성하는 코드 ([src/indesign.js](src/indesign.js)의 `addHelloText`, 실기 테스트로 동작 확인됨). **더 이상 `Generate` 버튼과 연결되어 있지 않다** — `Generate`는 이제 아래 TITLE 자동 입력 기능을 수행한다.
- UI 로직([index.js](index.js))과 InDesign 제어 로직([src/indesign.js](src/indesign.js)) 분리
- 개발용 샘플 데이터 [sample/article.json](sample/article.json)
- 디자인 리소스 보관용 폴더 구조 생성 및 디자이너 원본 InDesign 템플릿(.indd/.idml)·폰트 파일 수령 완료 (`assets/templates/original/`, `assets/templates/working/`, `assets/fonts/`, 실제 파일은 Git에는 올리지 않음 — [.gitignore](.gitignore) 참고)
- `Inspect Template` 버튼 및 읽기 전용 문서 구조 분석 기능 추가/개선 ([src/inspector.js](src/inspector.js)의 `inspectDocument`/`formatReport`): 전체 페이지 수, 페이지별 Page Item 수, Text Frame 목록(name, label, 텍스트 미리보기 50자, geometricBounds), Rectangle 목록(name, label, geometricBounds, 이미지 배치 여부), 페이지의 내부 index와 page.name, 사용 가능한 Paragraph/Object Style 목록을 패널의 `Inspection Log` 영역과 콘솔에 출력. 문서를 수정하는 코드는 없음.
- Script Label 기반 프레임 검증 기능 추가 ([src/validation.js](src/validation.js)의 `validateFrameLabels`/`formatValidationReport`, `index.js`에서 `Inspect Template` 버튼 클릭 시 자동 실행): "시작 페이지" 사진 있음/없음 두 변형 각각에 필요한 Label(TITLE/POINT_TEXT/BODY/HERO_IMAGE 또는 TITLE/POINT_TEXT/BODY_COLUMN_1/BODY_COLUMN_2)이 정확히 1개씩 있는지, 예상 타입(TextFrame/Rectangle)과 일치하는지 검사해 같은 `Inspection Log`/콘솔에 출력. InDesign API를 직접 호출하지 않고 `inspector.js`의 report만 입력으로 사용 (D009). 문서를 수정하지 않음.
- 자동조판 MVP용 기사 JSON 데이터 계약 정의 및 단순화 ([docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)): "시작 페이지" 2개 variant(`WITH_PHOTO`/`WITHOUT_PHOTO`)가 `templateType`/`variant`/`title`/`pointText`/`body` 공통 필드를 쓰고, `WITH_PHOTO`만 `heroImage`를 추가로 쓰도록 정리. `WITHOUT_PHOTO`의 `body`는 텍스트 스레드 시작 프레임인 `BODY_COLUMN_1`에만 쓴다. 샘플 파일([sample/opening-page-with-photo.json](sample/opening-page-with-photo.json), [sample/opening-page-without-photo.json](sample/opening-page-without-photo.json))도 갱신. JSON을 실제로 읽거나 InDesign에 적용하는 코드는 아직 없음.
- Text Frame 연결(텍스트 스레드) 읽기 전용 확인 기능 추가 및 실기 검증 완료: [src/inspector.js](src/inspector.js)에 `TextFrame.previousTextFrame`/`nextTextFrame`을 읽어 `Inspection Log`에 출력하는 기능(`getLinkedFrameInfo`), [src/validation.js](src/validation.js)에 "BODY_COLUMN_1 → BODY_COLUMN_2" 연결 여부를 판정하는 `linkChecks`(`checkFrameLink`)를 추가해 기존 `Inspect Template` 흐름에 포함. 실제 InDesign에서 두 프레임이 연결되어 있음을 확인함(2026-09-23). 프레임을 연결/수정하는 코드는 없음.
- `Load Article` 버튼 구현 및 실기 검증 완료 ([src/data.js](src/data.js)의 `loadArticleFile()`, [src/validation.js](src/validation.js)의 `validateArticleData()`/`formatArticleValidationReport()`): 파일 선택 대화상자로 JSON 파일을 골라 읽고, `JSON.parse` 실패/OPENING_PAGE 계약 위반을 구분해서 어떤 필드가 문제인지 `Article Log`와 콘솔에 표시. 검증 통과 시에만 `index.js`의 `currentArticleData`에 메모리 보관. InDesign 문서는 전혀 건드리지 않음(순수 로컬 파일 읽기+데이터 검증). 사용자가 실제 InDesign에서 두 샘플 파일 모두 "검증 통과"를 확인함(2026-09-23).
- `Generate` 버튼으로 첫 자동조판 쓰기(TITLE만) 구현 및 실기 검증 완료 ([src/text.js](src/text.js)의 `applyTitleOnly`): `currentArticleData`의 `variant`에 맞는 "시작 페이지"를 `src/validation.js`의 Script Label 프로필로 찾아, 그 페이지의 TITLE Text Frame `contents`에 `title`만 입력. 대상 페이지/TITLE 프레임 존재·개수·타입 안전 검사를 모두 통과해야만 문서를 수정한다. POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2/HERO_IMAGE는 건드리지 않음. 사용자가 실제 InDesign에서 WITH_PHOTO/WITHOUT_PHOTO 둘 다 올바른 페이지만 수정되고 반대쪽·다른 요소는 그대로임을 확인함(2026-09-23) — 이 프로젝트에서 InDesign 문서를 실제로 수정하는 첫 코드가 성공적으로 동작함을 확인.

## 실제 테스트 완료된 기능

사용자가 실제 InDesign + UXP Developer Tool에서 직접 확인한 내용 (Claude Code가 아닌 사용자가 실행):

- UXP Developer Tool에서 [manifest.json](manifest.json) 로드 및 `Magazine Automation` 패널 표시 (2026-09-22)
- `Inspect Template` 버튼 클릭 시 에러 없이 실행됨 (2026-09-22, 2026-09-23 두 차례)
- `assets/templates/working/`의 실제 디자이너 템플릿 사본에서, "시작 페이지" 템플릿의 두 페이지 변형(page.name=2/index=3, page.name=3/index=4)에 대해 `Inspect Template`의 개선된 출력(Text Frame의 name/텍스트 미리보기/geometricBounds, Rectangle의 name/geometricBounds/이미지 배치 여부, 페이지 index와 page.name)이 실제로 정상 표시됨을 확인 (2026-09-23) — `src/inspector.js`에서 추가한 `textFrame.contents`, `item.geometricBounds`, `rectangle.images` 기반 출력이 실사용에서 동작한 것으로 확인됨
- `item.label`(Script Label) 읽기: Text Frame과 Rectangle 모두에서 에러 없이 값을 읽을 수 있음을 확인 (2026-09-23). 이 결과를 근거로 D008(자동화 식별자로 `label` 사용) 결정
- Script Label 기반 프레임 검증 기능([src/validation.js](src/validation.js)): Script Label이 부여된 실제 working .indd에서 `Inspect Template`을 실행해 page.name=2("시작 페이지(사진 있음)")와 page.name=3("시작 페이지(사진 없음)") 모두 `TITLE`/`POINT_TEXT`/`BODY`/`HERO_IMAGE` 및 `TITLE`/`POINT_TEXT`/`BODY_COLUMN_1`/`BODY_COLUMN_2`가 전부 `[OK]`, "결과: 모두 정상"으로 나옴을 확인 (2026-09-23)
- `TextFrame.previousTextFrame`/`nextTextFrame` 읽기 및 "BODY_COLUMN_1 → BODY_COLUMN_2" 텍스트 스레드 연결 검사: 실제 InDesign에서 에러 없이 읽혔고, `BODY_COLUMN_1.nextTextFrame`=`BODY_COLUMN_2`, `BODY_COLUMN_2.previousTextFrame`=`BODY_COLUMN_1`로 실제 연결되어 있음을 확인 (2026-09-23) — InDesign UI에 연결선이 안 보인다고 보고됐던 것과 달리 실제로는 연결돼 있었음
- `Load Article` 버튼: `require("uxp").storage.localFileSystem`로 `sample/opening-page-with-photo.json`/`sample/opening-page-without-photo.json`을 실제로 불러와 둘 다 "결과: 검증 통과"가 나옴을 확인 (2026-09-23) — 이 프로젝트에서 `uxp` storage API가 처음으로 실기 검증됨
- `Generate` 버튼의 TITLE 자동 입력([src/text.js](src/text.js)의 `applyTitleOnly`): `opening-page-with-photo.json` Load 후 Generate → "사진 있는 시작 페이지"의 TITLE만 JSON의 `title`로 변경, "사진 없는 시작 페이지"의 TITLE 및 POINT_TEXT/BODY/HERO_IMAGE는 변경 없음을 확인. `opening-page-without-photo.json` Load 후 Generate → "사진 없는 시작 페이지"의 TITLE만 변경, "사진 있는 시작 페이지"는 변경 없음을 확인 (모두 2026-09-23) — `OPENING_PROFILES_BY_VARIANT` 기반 대상 페이지 판별과 doScript 안에서의 탐색+쓰기가 실제로 올바르게 동작함이 확인됨. 안전 검사 실패 케이스(Article 미로드 등)는 이번에 테스트되지 않음(아래 "아직 테스트하지 못한 기능" 참고)

**아직 확인되지 않은 부분**: `doc.paragraphStyles`/`doc.objectStyles`(스타일 목록) 출력이 올바른지, "시작 페이지" 외 나머지 페이지(목차/본문 페이지/인터뷰 레이아웃)에서도 동일하게 동작하는지는 아직 보고되지 않았다. 아래 "아직 테스트하지 못한 기능"에 남겨둔다.

## 아직 테스트하지 못한 기능

- `doc.paragraphStyles`/`doc.objectStyles`(스타일 목록)가 실제로 올바른 값을 보여주는지는 아직 구체적으로 보고되지 않았다
- `Inspect Template`을 "시작 페이지" 외 나머지 Template Type(목차, 본문 페이지, 인터뷰 레이아웃)에서 실행했을 때도 동일하게 정상 동작하는지
- Group으로 묶인 개체나 스타일 그룹 내부 스타일이 실제 템플릿에 얼마나 있는지, 그로 인해 워크시트 작성 시 어떤 항목이 누락되는지 (현재 버전은 이런 항목을 집계하지 않음 — 알려진 문제 참고)
- `body`를 `BODY_COLUMN_1.contents`에 쓰면 실제로 `BODY_COLUMN_2`까지 올바르게 흐르는지는 아직 확인되지 않았다 — 지금까지 확인된 것은 "두 프레임이 텍스트 스레드로 연결돼 있다"는 사실뿐이고, 실제로 `contents`를 쓰는 코드는 TITLE에만 적용되어 있다.
- `Load Article`의 오류 케이스(파일 선택 취소, JSON 문법 오류, 필드 누락/값 오류)가 화면에 올바르게 표시되는지는 아직 실기로 확인되지 않았다 — 정상 케이스만 확인됨.
- `Generate`의 안전 검사 실패 케이스: Article을 불러오지 않은 채 `Generate`를 눌렀을 때 문서가 정말 수정되지 않고 Status에 중단 사유가 뜨는지, TITLE이 없거나 2개 이상이거나 TextFrame이 아닌 경우 등은 이번 테스트에서 확인되지 않았다(정상 성공 케이스만 확인됨).

## 진행 중인 작업

- "시작 페이지" 프레임 매핑 초안은 작성했지만, "확인 필요"로 남은 항목(pointText가 원래 handoff 문서의 subtitle 개념과 같은지, HERO_IMAGE의 템플릿 레벨 Optional 여부, "대표이미지" 안내 문구 프레임 처리 방식 등)이 많아 디자이너 확인 전까지는 확정판(Frame Name/Data Field Mapping 등)으로 옮기지 않는다.
- `Generate`의 TITLE 자동 입력은 실기 테스트로 성공이 확인됐다. POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2 입력과 HERO_IMAGE 배치는 TITLE과 같은 패턴(Script Label 프로필 재사용 + doScript 안에서 탐색+쓰기)으로 순서대로 진행할 예정이며 아직 시작하지 않았다.

## Script Label 부여 및 검증 현황

"시작 페이지" 두 변형에 아래 Script Label이 **사용자가 InDesign에서 직접 부여했고, 읽기 전용 검증까지 실제 InDesign에서 "모두 정상"으로 확인 완료**되었다(2026-09-23):

| 페이지 | 부여된 Script Label | 검증 결과 |
|---|---|---|
| page.name=2 (사진 있음) | `TITLE`, `POINT_TEXT`, `BODY`, `HERO_IMAGE` | 모두 `[OK]`, 결과: 모두 정상 |
| page.name=3 (사진 없음) | `TITLE`, `POINT_TEXT`, `BODY_COLUMN_1`, `BODY_COLUMN_2` | 모두 `[OK]`, 결과: 모두 정상 |

`src/validation.js`의 검증 규칙(`OPENING_WITH_PHOTO`/`OPENING_WITHOUT_PHOTO`)이 실제 파일과 일치함이 확인되었다. "대표이미지" 안내 문구 Text Frame은 검증 대상 Label 목록에 없으므로(검증 로직이 별도로 취급하지 않음) 이번 테스트로 Label 부여 여부가 직접 확인되지는 않았다.

## 미구현 기능

- `src/data.js`: JSON 파일 선택/읽기 구현 및 실기 검증 완료. `sample/opening-page-*.json` 외 다른 Template Type용 데이터 로드는 아직 없음
- `src/template.js`: `templateType`(`OPENING_PAGE` 등)별 템플릿 처리, `variant`에 따른 분기
- `src/text.js`: TITLE 입력만 구현 및 실기 검증 완료. POINT_TEXT/BODY/BODY_COLUMN_1/BODY_COLUMN_2를 텍스트 프레임 `contents`에 채워 넣는 코드는 아직 없음
- `src/image.js`: HERO_IMAGE 등 이미지 프레임 배치
- `src/validation.js`: "시작 페이지" Script Label 기준 프레임 존재/타입 검사, OPENING_PAGE 기사 데이터 검증은 구현됨(둘 다 실기 미검증인 부분이 남아 있음). 이미지 누락, Overset Text 검사, 다른 Template Type에 대한 검증은 아직 없음
- 여러 기사 지원, 여러 템플릿 지원
- 본문 길이에 따른 추가 페이지 처리 (Linked Text Frame)
- PDF 자동 출력

## 알려진 문제

- `src/indesign.js`의 `app.doScript()` 호출부(인자 순서, `ScriptLanguage`/`UndoModes` 접근 방식)는 Adobe에서 공개한 InDesign UXP 패턴을 참고해 작성했지만, 실제 InDesign에서 실행해 검증한 적이 없다. 버전/환경에 따라 시그니처가 다를 수 있으므로 UDT의 Inspect(콘솔)로 확인 후 필요시 수정해야 한다.
- `manifest.json`에 `icons` 항목이 없다. 아이콘 파일이 없는 상태에서 값을 채우면 로드 에러가 날 수 있어 의도적으로 생략했다. 아이콘 리소스가 준비되면 추가한다.
- `src/inspector.js`가 사용하는 `page.textFrames`, `page.rectangles`, `rectangle.images`, `item.geometricBounds`, `textFrame.contents`, `doc.paragraphStyles`, `doc.objectStyles`는 classic InDesign Scripting DOM 기준으로 작성했으며 InDesign UXP에서 실제 검증되지 않았다.
- `src/inspector.js`는 Group으로 묶인 pageItem(중첩 개체)과 Paragraph/Object Style Group 내부의 스타일을 집계하지 않는다. `page.pageItems`/`doc.paragraphStyles`/`doc.objectStyles`가 최상위 항목만 반환하기 때문이며, 디자이너 템플릿이 그룹을 많이 쓴다면 "Page Item 수"와 실제 나열된 Text Frame/Rectangle 개수 사이에 차이가 날 수 있다.
- `textFrame.contents`는 classic InDesign DOM 기준으로 그 프레임이 속한 스토리 전체 텍스트를 반환하는 것으로 알려져 있다. Linked Text Frame으로 여러 프레임이 이어져 있다면, 텍스트 미리보기가 "그 프레임에 보이는 내용"이 아니라 "연결된 스토리 전체의 앞부분"일 수 있다 (미검증, 실기 테스트로 확인 필요).
- `item.label`(Script Label) 읽기는 실기로 확인되었다(D008). 값을 쓰는 동작은 코드로 작성한 적이 없고, 사용자가 InDesign UI에서 직접 부여했다 — 코드로 쓰는 경우(`label = "..."`)의 동작은 아직 검증되지 않았다.
- `src/validation.js`의 페이지 유형 판별 로직(`pickProfile`)은 "BODY_COLUMN_1/2가 있으면 사진 없는 변형, HERO_IMAGE나 BODY가 있으면 사진 있는 변형"이라는 휴리스틱이다. "시작 페이지" 두 변형에서는 실제로 올바르게 동작함을 확인했지만(2026-09-23), 다른 페이지(목차 등)에 우연히 같은 Label이 쓰이면 오판할 수 있다. 다른 Template Type을 분석할 때 유의해야 한다.
- [docs/ARTICLE_DATA_SPEC.md](docs/ARTICLE_DATA_SPEC.md)의 Required/Optional 표시는 이번 MVP 설계를 위한 잠정 결정이며, 디자이너 공식 확인을 거친 것은 아니다. `variant` 값이 잘못되거나 누락됐을 때의 처리 방식도 아직 정의/구현하지 않았다.
- `TextFrame.previousTextFrame`/`nextTextFrame`은 실제 InDesign에서 에러 없이 읽힘을 확인했다(2026-09-23). 다만 "연결 없음"을 어떤 형태로 반환하는지(null 또는 `isValid===false`)는 이번 두 프레임이 "연결된" 경우만 확인됐고, "연결 안 된" 프레임에서 실제로 어떤 값이 나오는지는 아직 관찰된 적이 없다 — `src/inspector.js`의 `getLinkedFrameInfo()`는 두 형태를 모두 방어적으로 처리하도록 작성했지만 이 부분은 여전히 이론적 대비이다.
- 사용자가 InDesign UI에서 "텍스트 스레드 표시"를 켠 상태로도 BODY_COLUMN_1/BODY_COLUMN_2 사이에 연결선이 안 보인다고 보고했었지만, 코드로 확인한 결과 두 프레임은 실제로 연결되어 있었다(2026-09-23). UI에 연결선이 보이지 않았던 원인(예: 프레임이 화면 밖에 있었다거나 표시 설정 문제)은 확인되지 않았다 — 데이터/코드 상으로는 문제가 없다.
- `src/data.js`가 사용하는 `require("uxp").storage.localFileSystem`은 Adobe UXP 공식 문서에 있는 플랫폼 공통 API지만, 이 프로젝트에서 `uxp` 모듈(지금까지는 `indesign` 모듈만 사용)을 처음 호출하는 것이라 이 InDesign UXP 환경에서 실제로 동일하게 동작하는지 검증되지 않았다. `getFileForOpening()`의 파일 형식 필터(`types`)는 정확한 옵션 형태가 불확실해 의도적으로 생략했다([DECISIONS.md](DECISIONS.md) D011). (2026-09-23 실기 테스트로 정상 케이스 동작은 확인됨 — 위 "실제 테스트 완료된 기능" 참고. 오류 케이스는 아직 미확인.)
- `src/text.js`의 `applyTitleOnly()`는 대상 페이지/TITLE 프레임 탐색과 `contents` 쓰기를 하나의 `app.doScript` 콜백 안에서 함께 수행한다([DECISIONS.md](DECISIONS.md) D012). 이 패턴("doScript 콜백 안에서 여러 페이지를 순회하며 읽기 + 쓰기")은 실기 테스트로 정상 동작이 확인됐다(2026-09-23). 다만 대상 페이지/TITLE 프레임을 못 찾는 등 예외가 doScript 콜백 안에서 던져지는 안전 검사 실패 경로는 아직 실기로 확인되지 않았다.
- `Generate` 버튼의 동작이 "Hello Magazine 생성"에서 "TITLE 자동 입력"으로 바뀌었다. `addHelloText()` 함수 자체는 `src/indesign.js`에 남아 있지만 더 이상 UI와 연결되어 있지 않다 — 필요하면 디버깅용으로 재연결할 수 있지만 현재는 죽은 코드에 가깝다.

## 외부 대기 사항

- 디자이너와 프레임 Naming Convention, Paragraph/Object Style Naming Convention 등 확정 필요 (아래 "디자이너에게 확인해야 할 사항" 참고). 원본 템플릿 파일 자체는 수령했지만, 이 확정 작업은 아직 진행되지 않았다.

## 다음 추천 작업

1. (선택) Article을 불러오지 않은 채 `Generate`를 눌러 문서가 전혀 바뀌지 않고 Status에 중단 사유가 뜨는지 확인한다 — 안전 검사 실패 경로는 아직 테스트되지 않았다.
2. POINT_TEXT를 같은 방식으로 채우는 기능을 추가한다(TITLE과 동일한 패턴 재사용 가능). 이어서 BODY(WITH_PHOTO)와 BODY_COLUMN_1(WITHOUT_PHOTO, `BODY_COLUMN_2`는 건드리지 않음)을 추가한다 — `BODY_COLUMN_1`에 쓴 본문이 실제로 `BODY_COLUMN_2`까지 흐르는지 이 단계에서 처음 확인하게 된다.
3. 이미지 배치(`heroImage` → `HERO_IMAGE` Rectangle)는 텍스트 자동조판이 안정된 뒤 별도 단계로 진행한다.
4. "시작 페이지" 워크시트에서 "확인 필요"로 남긴 항목(pointText가 원래 subtitle 개념과 같은지, HERO_IMAGE의 템플릿 레벨 Optional 여부, "대표이미지" 안내 문구 프레임 처리 방식)을 디자이너와 확인한다.
5. 위 MVP가 "시작 페이지"에서 안정되면 "목차" 템플릿에서 `Inspect Template`을 실행하고 로그를 전달해 같은 방식으로 분석·검증·데이터 계약을 확장한다. 이어서 "본문 페이지", "인터뷰 레이아웃"도 순서대로 진행한다.

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
